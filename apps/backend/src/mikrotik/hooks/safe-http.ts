import { createHmac } from 'crypto';
import * as dns from 'dns';
import * as https from 'https';
import { isIP } from 'net';

/**
 * Salida HTTP segura hacia URLs escritas por cada ISP ("Eventos API
 * personalizados"). El riesgo es SSRF: que alguien registre una URL que haga
 * llamar a ESTE servidor hacia su red interna, hacia Postgres/Redis o hacia
 * los metadatos de la nube (169.254.169.254). Defensas:
 *   1. Solo https, sin usuario/clave en la URL, solo puertos 443 y 8443.
 *   2. Toda IP a la que resuelva el nombre debe ser pública. La comprobación
 *      se hace DENTRO de la conexión (opción `lookup`), así que el socket usa
 *      exactamente las IPs validadas: un DNS que cambie de respuesta después
 *      (DNS rebinding) no sirve.
 *   3. Las IP escritas directamente en la URL se validan aparte (Node no
 *      resuelve DNS para ellas).
 *   4. No se siguen redirecciones, hay tiempo límite y la respuesta se descarta.
 */

const ALLOWED_PORTS = new Set([443, 8443]);

export class UnsafeUrlError extends Error {}

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, o) => acc * 256 + Number(o), 0);
}

const V4_BLOCKED: [string, number][] = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
  ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
];

/** Expande una IPv6 a sus 8 grupos de 16 bits (soporta :: y la forma con IPv4 al final). */
function expandIPv6(ip: string): number[] | null {
  let addr = ip.split('%')[0];
  const v4tail = addr.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (v4tail) {
    const n = ipv4ToInt(v4tail[1]);
    addr = addr.replace(v4tail[1], `${((n >>> 16) & 0xffff).toString(16)}:${(n & 0xffff).toString(16)}`);
  }
  const halves = addr.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - head.length - tail.length;
  if ((halves.length === 1 && missing !== 0) || missing < 0) return null;
  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill('0'), ...tail].map((g) => parseInt(g, 16));
  return groups.length === 8 && groups.every((g) => Number.isFinite(g)) ? groups : null;
}

/** true solo si es una IP pública enrutable. Ante la duda (formato raro) devuelve false. */
export function isPublicIp(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) {
    const n = ipv4ToInt(ip);
    return !V4_BLOCKED.some(([base, bits]) => {
      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
      return ((n & mask) >>> 0) === ((ipv4ToInt(base) & mask) >>> 0);
    });
  }
  if (kind === 6) {
    const g = expandIPv6(ip);
    if (!g) return false;
    // IPv4 mapeada (::ffff:a.b.c.d): manda la IPv4.
    if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) {
      return isPublicIp(`${g[6] >> 8}.${g[6] & 255}.${g[7] >> 8}.${g[7] & 255}`);
    }
    if (g.every((x) => x === 0)) return false; // ::
    if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return false; // ::1
    if ((g[0] & 0xfe00) === 0xfc00) return false; // fc00::/7 (privadas)
    if ((g[0] & 0xffc0) === 0xfe80) return false; // fe80::/10 (enlace local)
    if ((g[0] & 0xff00) === 0xff00) return false; // ff00::/8 (multicast)
    if (g[0] === 0x2001 && g[1] === 0x0db8) return false; // documentación
    if (g[0] === 0x0064 && g[1] === 0xff9b) return false; // NAT64
    return true;
  }
  return false;
}

/** Validación síncrona de la URL (forma y destino literal). Lanza UnsafeUrlError. */
export function assertSafeHookUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError('La URL no es válida.');
  }
  if (url.protocol !== 'https:') throw new UnsafeUrlError('Solo se permiten URLs https://.');
  if (url.username || url.password) throw new UnsafeUrlError('La URL no puede incluir usuario ni contraseña.');
  const port = url.port ? Number(url.port) : 443;
  if (!ALLOWED_PORTS.has(port)) throw new UnsafeUrlError('Solo se permiten los puertos 443 y 8443.');

  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new UnsafeUrlError('Esa dirección no está permitida.');
  }
  if (isIP(host) && !isPublicIp(host)) throw new UnsafeUrlError('Esa dirección IP no es pública.');
  return url;
}

type LookupCb = (err: Error | null, address?: any, family?: number) => void;

/**
 * `lookup` para https.request: resuelve y rechaza si CUALQUIERA de las IPs no
 * es pública. Soporta la forma con `all: true` que usa Node ≥ 20 al conectar.
 */
export function safeLookup(
  resolver: (host: string, opts: dns.LookupAllOptions, cb: (err: Error | null, a: dns.LookupAddress[]) => void) => void = (h, o, cb) =>
    dns.lookup(h, o, cb as any),
) {
  return (hostname: string, options: any, callback: LookupCb) => {
    const cb: LookupCb = typeof options === 'function' ? options : callback;
    const opts = typeof options === 'function' ? {} : options ?? {};
    resolver(hostname, { ...opts, all: true }, (err, addresses) => {
      if (err) return cb(err);
      if (!addresses?.length || addresses.some((a) => !isPublicIp(a.address))) {
        return cb(new UnsafeUrlError('El nombre resuelve a una dirección no pública.'));
      }
      return opts.all ? cb(null, addresses) : cb(null, addresses[0].address, addresses[0].family);
    });
  };
}

export interface SendResult {
  status: number;
}

export interface SendOptions {
  secret?: string | null;
  event: string;
  deliveryId: string;
  timeoutMs?: number;
  /** Solo para pruebas. */
  lookup?: ReturnType<typeof safeLookup>;
  requestImpl?: typeof https.request;
}

export function signBody(body: string, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

/** POST JSON a una URL ya validada. Resuelve con el código HTTP; rechaza ante error de red/tiempo. */
export function postJson(rawUrl: string, payload: unknown, opts: SendOptions): Promise<SendResult> {
  const url = assertSafeHookUrl(rawUrl);
  const body = JSON.stringify(payload);
  const headers: Record<string, string | number> = {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'User-Agent': 'ISP-Control-Webhook/1.0',
    'X-ISP-Event': opts.event,
    'X-ISP-Delivery': opts.deliveryId,
  };
  if (opts.secret) headers['X-ISP-Signature'] = signBody(body, opts.secret);

  return new Promise((resolve, reject) => {
    const request = (opts.requestImpl ?? https.request)(
      {
        method: 'POST',
        hostname: url.hostname.replace(/^\[|\]$/g, ''),
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        headers,
        lookup: (opts.lookup ?? safeLookup()) as any,
        timeout: opts.timeoutMs ?? 5000,
      },
      (res) => {
        res.resume(); // se descarta el cuerpo: solo importa el código
        res.on('end', () => resolve({ status: res.statusCode ?? 0 }));
        res.on('error', reject);
      },
    );
    request.on('timeout', () => request.destroy(new Error('Tiempo de espera agotado (5 s).')));
    request.on('error', reject);
    request.end(body);
  });
}
