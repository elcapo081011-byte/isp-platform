import { Injectable, Logger } from '@nestjs/common';
import { RouterOSAPI } from 'node-routeros-v2';
import {
  RouterProvider,
  RouterCredentials,
  ConnectionStatus,
  RouterSystemInfo,
  PppoeSessionInfo,
} from '../../../../packages/network-drivers/src/router-provider.interface';
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

  private async withConnection<T>(credentials: RouterCredentials, fn: (conn: RouterOSAPI) => Promise<T>): Promise<T> {
    const conn = new RouterOSAPI({
      host: credentials.host,
      port: credentials.port,
      user: credentials.username,
      password: this.crypto.decrypt(credentials.encryptedPassword),
      tls: credentials.useTls ? {} : undefined,
      timeout: 8,
    });
    try {
      await conn.connect();
      return await fn(conn);
    } finally {
      conn.close();
    }
  }

  async checkConnection(credentials: RouterCredentials): Promise<ConnectionStatus> {
    try {
      await this.withConnection(credentials, (conn) => conn.write('/system/resource/print'));
      return 'ONLINE';
    } catch (err) {
      this.logger.warn(`No se pudo conectar a ${credentials.host}: ${(err as Error).message}`);
      return 'OFFLINE';
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
