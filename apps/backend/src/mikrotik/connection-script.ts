import { randomBytes } from 'crypto';

/**
 * Script de conexión (equivalente a la pestaña "Script de Conexión" de
 * WispHub). Se pega en el terminal del MikroTik y deja listo lo que la
 * plataforma necesita para administrarlo por la API de RouterOS:
 *   1. Un usuario de API propio (con contraseña generada por el sistema) en un
 *      grupo aparte, con permisos limitados.
 *   2. El servicio API habilitado en el puerto indicado.
 *   3. Si el dueño de la plataforma definió PLATFORM_PUBLIC_IP: solo esa IP puede
 *      usar el usuario y el servicio API, y se agrega una regla de firewall que
 *      la deja entrar. Sin esa IP no se agregan restricciones (y la UI lo avisa).
 *
 * NO crea ninguna VPN (WispHub sí, con sus propios servidores). Para un router
 * sin IP pública se necesita una VPN hacia la plataforma, fuera de este script.
 */

export interface ConnectionScriptInput {
  routerName: string;
  apiUser: string;
  apiPassword: string;
  apiPort: number;
  /** IP o CIDR desde la que la plataforma se conectará (PLATFORM_PUBLIC_IP). */
  platformIp?: string | null;
  /** Con ADDRESS_LIST el script agrega la regla de firewall que bloquea la lista "moroso". */
  cutMode?: string | null;
}

const GROUP = 'ispcontrol';
const RULE_COMMENT = 'ISP Control API';

/** Lista y comentario que usa el corte por address list (ver MikrotikService). */
export const MOROSO_LIST = 'moroso';
export const MOROSO_RULE_COMMENT = 'ISP Control moroso';

/** Solo IPv4, IPv4/CIDR o nombre de host simple: nada que pueda romper el script. */
export function sanitizeAddress(value?: string | null): string | null {
  const v = (value ?? '').trim();
  if (!v) return null;
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
  if (ipv4.test(v)) {
    const [ip, mask] = v.split('/');
    if (ip.split('.').every((o) => Number(o) <= 255) && (mask === undefined || Number(mask) <= 32)) return v;
    return null;
  }
  return null;
}

/** Texto seguro para comentarios: letras, números, espacio y . _ - */
export function sanitizeLabel(value: string): string {
  return value.replace(/[^A-Za-z0-9 ._-]/g, '').slice(0, 60).trim() || 'router';
}

export function generateApiCredentials(): { username: string; password: string } {
  // Hex: solo [0-9a-f], nunca trae comillas ni caracteres especiales de RouterOS.
  return { username: `ispc_${randomBytes(4).toString('hex')}`, password: randomBytes(18).toString('hex') };
}

const SAFE_SECRET = /^[A-Za-z0-9_.-]+$/;

export function buildConnectionScript(input: ConnectionScriptInput): string {
  if (!SAFE_SECRET.test(input.apiUser) || !SAFE_SECRET.test(input.apiPassword)) {
    // Credenciales escritas a mano con caracteres especiales no se pueden
    // incrustar con seguridad en un script de RouterOS.
    throw new Error('Las credenciales contienen caracteres no permitidos para generar el script.');
  }
  const port = Math.trunc(Number(input.apiPort));
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Puerto de API inválido.');

  const ip = sanitizeAddress(input.platformIp);
  const addr = ip ? ` address=${ip}` : '';
  const name = sanitizeLabel(input.routerName);

  const lines = [
    `# ISP Control - script de conexion para "${name}"`,
    '# Pegalo completo en Winbox > New Terminal (o por SSH). Es seguro volver a ejecutarlo.',
    `# Crea el usuario de API "${input.apiUser}" (grupo ${GROUP}: read, write, api, test, policy)`,
    `# y habilita el servicio API en el puerto ${port}.`,
    ip
      ? `# Solo la IP ${ip} podra usar ese usuario y el servicio API.`
      : '# AVISO: sin IP de plataforma configurada, el acceso NO queda restringido por origen.',
    '',
    `:do { /user remove [find where name="${input.apiUser}"] } on-error={}`,
    `:do { /user group remove [find where name="${GROUP}"] } on-error={}`,
    `/user group add name=${GROUP} policy=read,write,api,test,policy comment="ISP Control"`,
    `/user add name="${input.apiUser}" password="${input.apiPassword}" group=${GROUP}${addr} comment="ISP Control"`,
    `/ip service set api disabled=no port=${port}${addr}`,
  ];

  if (ip) {
    lines.push(
      `:do { /ip firewall filter remove [find where comment="${RULE_COMMENT}"] } on-error={}`,
      `:do { /ip firewall filter add chain=input protocol=tcp dst-port=${port} src-address=${ip} action=accept place-before=0 comment="${RULE_COMMENT}" } on-error={ /ip firewall filter add chain=input protocol=tcp dst-port=${port} src-address=${ip} action=accept comment="${RULE_COMMENT}" }`,
    );
  }

  if (input.cutMode === 'ADDRESS_LIST') {
    lines.push(
      '',
      `# Corte por address list: bloquea el trafico de las IP que la plataforma agrega a la lista "${MOROSO_LIST}".`,
      `:do { /ip firewall filter remove [find where comment="${MOROSO_RULE_COMMENT}"] } on-error={}`,
      `:do { /ip firewall filter add chain=forward src-address-list=${MOROSO_LIST} action=drop place-before=0 comment="${MOROSO_RULE_COMMENT}" } on-error={ /ip firewall filter add chain=forward src-address-list=${MOROSO_LIST} action=drop comment="${MOROSO_RULE_COMMENT}" }`,
    );
  }

  lines.push(':log info "ISP Control: script de conexion aplicado. Verifica la conexion desde la plataforma."');
  return lines.join('\n');
}
