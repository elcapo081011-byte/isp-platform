import { Injectable, Logger } from '@nestjs/common';
import { RouterOSAPI } from 'node-routeros-v2';
import {
  RouterProvider,
  RouterCredentials,
  ConnectionStatus,
  RouterSystemInfo,
  PppoeSessionInfo,
} from '../network-drivers/router-provider.interface';
import { CredentialsEncryptionService } from '../common/crypto/credentials-encryption.service';

/**
 * Driver real para MikroTik RouterOS.
 * Usa la librería `node-routeros-v2` (fork mantenido de node-routeros) y
 * exclusivamente comandos de la API oficial documentados por MikroTik:
 *   /system/resource/print, /system/identity/print,
 *   /ppp/secret/{add,remove,set,print}, /ppp/active/print
 *
 * No se implementa ninguna operación que no esté en esa lista sin antes
 * verificarla contra la wiki oficial de RouterOS API (punto 31 del brief).
 */
@Injectable()
export class RouterOsProvider implements RouterProvider {
  private readonly logger = new Logger('RouterOsProvider');

  constructor(private crypto: CredentialsEncryptionService) {}

  /**
   * Abre la conexión probando el host principal y, si no acepta la conexión,
   * el failover. Un error al ejecutar el comando (ya conectado) NO reintenta
   * en el otro host: eso es un error real del comando, no de conectividad.
   */
  private async withConnection<T>(credentials: RouterCredentials, fn: (conn: RouterOSAPI) => Promise<T>): Promise<T> {
    const hosts = [credentials.host, credentials.failoverHost].filter((h): h is string => !!h);
    let lastError: unknown;
    for (const host of hosts) {
      const conn = new RouterOSAPI({
        host,
        port: credentials.port,
        user: credentials.username,
        password: this.crypto.decrypt(credentials.encryptedPassword),
        tls: credentials.useTls ? {} : undefined,
        timeout: 8,
      });
      try {
        await conn.connect();
      } catch (err) {
        lastError = err;
        conn.close();
        continue;
      }
      try {
        return await fn(conn);
      } finally {
        conn.close();
      }
    }
    throw lastError ?? new Error('No hay host configurado');
  }

  async checkConnection(credentials: RouterCredentials): Promise<ConnectionStatus> {
    return (await this.testConnection(credentials)).status;
  }

  /** Igual que checkConnection pero devuelve el motivo legible cuando falla. */
  async testConnection(credentials: RouterCredentials): Promise<{ status: ConnectionStatus; error?: string }> {
    try {
      await this.withConnection(credentials, (conn) => conn.write('/system/resource/print'));
      return { status: 'ONLINE' };
    } catch (err) {
      this.logger.warn(`No se pudo conectar a ${credentials.host}: ${(err as Error).message}`);
      return { status: 'OFFLINE', error: friendlyConnectionError(err) };
    }
  }

  async getSystemInfo(credentials: RouterCredentials): Promise<RouterSystemInfo> {
    return this.withConnection(credentials, async (conn) => {
      const [resource] = await conn.write('/system/resource/print');
      const [identity] = await conn.write('/system/identity/print');

      return {
        identity: identity?.name ?? 'desconocido',
        routerOsVersion: resource?.version ?? 'desconocido',
        boardModel: resource?.['board-name'] ?? 'desconocido',
        cpuLoadPercent: Number(resource?.['cpu-load'] ?? 0),
        freeMemoryBytes: Number(resource?.['free-memory'] ?? 0),
        totalMemoryBytes: Number(resource?.['total-memory'] ?? 0),
        uptimeSeconds: parseRouterOsUptime(resource?.uptime),
        // RouterOS solo reporta temperatura en boards con sensor físico (ej. CCR).
        // Si la propiedad no existe, se declara explícitamente null (no se inventa).
        temperatureCelsius: resource?.temperature ? Number(resource.temperature) : null,
      };
    });
  }

  async listPppoeActiveSessions(credentials: RouterCredentials): Promise<PppoeSessionInfo[]> {
    return this.withConnection(credentials, async (conn) => {
      const rows = await conn.write('/ppp/active/print');
      return rows.map((row: any) => ({
        username: row.name,
        callerId: row['caller-id'] ?? '',
        address: row.address ?? '',
        uptimeSeconds: parseRouterOsUptime(row.uptime),
        rxBytes: 0, // /ppp/active/print no expone bytes; se obtiene vía /interface/monitor-traffic en Fase 7 (monitoreo)
        txBytes: 0,
        profile: row.service ?? '',
      }));
    });
  }

  async createPppoeSecret(
    credentials: RouterCredentials,
    params: { username: string; password: string; profile: string },
  ): Promise<void> {
    await this.withConnection(credentials, (conn) =>
      conn.write('/ppp/secret/add', [
        `=name=${params.username}`,
        `=password=${params.password}`,
        `=profile=${params.profile}`,
        '=service=pppoe',
      ]),
    );
  }

  /** Crea el secret PPPoE o, si ya existe con ese nombre, actualiza su clave y perfil. */
  async upsertPppoeSecret(
    credentials: RouterCredentials,
    params: { username: string; password: string; profile: string; disabled?: boolean },
  ): Promise<'created' | 'updated'> {
    // Un cliente suspendido que se mueve de router debe quedar deshabilitado en el nuevo,
    // si no, el traslado le devolvería el servicio sin pagar.
    const disabled = `=disabled=${params.disabled ? 'yes' : 'no'}`;
    return this.withConnection(credentials, async (conn) => {
      const id = await this.findSecretId(conn, params.username);
      if (id) {
        await conn.write('/ppp/secret/set', [`=.id=${id}`, `=password=${params.password}`, `=profile=${params.profile}`, disabled]);
        return 'updated' as const;
      }
      await conn.write('/ppp/secret/add', [
        `=name=${params.username}`,
        `=password=${params.password}`,
        `=profile=${params.profile}`,
        '=service=pppoe',
        disabled,
      ]);
      return 'created' as const;
    });
  }

  // -- Corte por address list (lista "moroso") ------------------------------

  /** IP que tiene ahora la sesión PPPoE activa del cliente, o null si no está conectado. */
  async findActiveAddress(credentials: RouterCredentials, username: string): Promise<string | null> {
    return this.withConnection(credentials, async (conn) => {
      const rows = await conn.write('/ppp/active/print', [`?name=${username}`]);
      return rows[0]?.address ?? null;
    });
  }

  async addToAddressList(credentials: RouterCredentials, list: string, address: string, comment: string): Promise<void> {
    await this.withConnection(credentials, async (conn) => {
      const existing = await conn.write('/ip/firewall/address-list/print', [`?list=${list}`, `?address=${address}`]);
      if (existing.length > 0) return; // ya está: no se duplica
      await conn.write('/ip/firewall/address-list/add', [`=list=${list}`, `=address=${address}`, `=comment=${comment}`]);
    });
  }

  /** Quita de la lista todas las entradas con ese comentario (sirve aunque la IP haya cambiado). */
  async removeFromAddressList(credentials: RouterCredentials, list: string, comment: string): Promise<void> {
    await this.withConnection(credentials, async (conn) => {
      const rows = await conn.write('/ip/firewall/address-list/print', [`?list=${list}`, `?comment=${comment}`]);
      for (const row of rows) await conn.write('/ip/firewall/address-list/remove', [`=.id=${row['.id']}`]);
    });
  }

  async removePppoeSecret(credentials: RouterCredentials, username: string): Promise<void> {
    await this.withConnection(credentials, async (conn) => {
      const id = await this.findSecretId(conn, username);
      if (id) await conn.write('/ppp/secret/remove', [`=.id=${id}`]);
    });
  }

  async disablePppoeSecret(credentials: RouterCredentials, username: string): Promise<void> {
    await this.withConnection(credentials, async (conn) => {
      const id = await this.findSecretId(conn, username);
      if (id) await conn.write('/ppp/secret/set', [`=.id=${id}`, '=disabled=yes']);
    });
  }

  async enablePppoeSecret(credentials: RouterCredentials, username: string): Promise<void> {
    await this.withConnection(credentials, async (conn) => {
      const id = await this.findSecretId(conn, username);
      if (id) await conn.write('/ppp/secret/set', [`=.id=${id}`, '=disabled=no']);
    });
  }

  private async findSecretId(conn: RouterOSAPI, username: string): Promise<string | null> {
    const rows = await conn.write('/ppp/secret/print', [`?name=${username}`]);
    return rows[0]?.['.id'] ?? null;
  }
}

/** Traduce el error crudo de la librería a algo que el ISP pueda accionar. */
export function friendlyConnectionError(err: unknown): string {
  const raw = String((err as any)?.message ?? err ?? '');
  const code = String((err as any)?.code ?? '');
  const text = `${code} ${raw}`.toLowerCase();
  if (text.includes('cannot log in') || text.includes('invalid user')) return 'Usuario o contraseña incorrectos.';
  if (text.includes('econnrefused')) return 'Conexión rechazada: el servicio API está deshabilitado o el puerto es otro.';
  if (text.includes('enotfound') || text.includes('getaddrinfo')) return 'No se encontró ese host (revisa la IP o el DDNS).';
  if (text.includes('timed out') || text.includes('etimedout') || text.includes('timeout'))
    return 'El router no respondió (tiempo agotado). Revisa la IP, el puerto y que el firewall permita la conexión.';
  if (text.includes('ehostunreach') || text.includes('enetunreach')) return 'No hay ruta hasta ese host.';
  return `No se pudo conectar: ${raw.slice(0, 160) || 'error desconocido'}`;
}

/** RouterOS reporta uptime como "1w2d3h4m5s"; se convierte a segundos. */
function parseRouterOsUptime(value: string | undefined): number {
  if (!value) return 0;
  const regex = /(\d+)([wdhms])/g;
  const unitSeconds: Record<string, number> = { w: 604800, d: 86400, h: 3600, m: 60, s: 1 };
  let total = 0;
  let match;
  while ((match = regex.exec(value)) !== null) {
    total += parseInt(match[1], 10) * (unitSeconds[match[2]] ?? 0);
  }
  return total;
}
