const connectMock = jest.fn();
const writeMock = jest.fn();
const hostsTried: string[] = [];

jest.mock('node-routeros-v2', () => ({
  RouterOSAPI: class {
    host: string;
    constructor(opts: any) {
      this.host = opts.host;
      hostsTried.push(opts.host);
    }
    connect() { return connectMock(this.host); }
    write(...args: any[]) { return writeMock(...args); }
    close() {}
  },
}));

import { RouterOsProvider, friendlyConnectionError } from './routeros.provider';

const creds = { host: '10.0.0.1', failoverHost: 'router.dyn.com', port: 8728, username: 'u', encryptedPassword: 'enc', useTls: false };

describe('RouterOsProvider', () => {
  let provider: RouterOsProvider;
  beforeEach(() => {
    hostsTried.length = 0;
    connectMock.mockReset();
    writeMock.mockReset();
    provider = new RouterOsProvider({ decrypt: () => 'clave' } as any);
  });

  it('usa el failover cuando el host principal no acepta la conexión', async () => {
    connectMock.mockImplementation(async (host: string) => { if (host === '10.0.0.1') throw new Error('ETIMEDOUT'); });
    writeMock.mockResolvedValue([{}]);
    expect(await provider.testConnection(creds)).toEqual({ status: 'ONLINE' });
    expect(hostsTried).toEqual(['10.0.0.1', 'router.dyn.com']);
  });

  it('si el principal conecta, no toca el failover', async () => {
    connectMock.mockResolvedValue(undefined);
    writeMock.mockResolvedValue([{}]);
    await provider.testConnection(creds);
    expect(hostsTried).toEqual(['10.0.0.1']);
  });

  it('un error de COMANDO (ya conectado) no se reintenta en el otro host', async () => {
    connectMock.mockResolvedValue(undefined);
    writeMock.mockRejectedValue(new Error('no such command'));
    const res = await provider.testConnection(creds);
    expect(res.status).toBe('OFFLINE');
    expect(hostsTried).toEqual(['10.0.0.1']);
  });

  it('si fallan los dos hosts devuelve OFFLINE con el motivo legible', async () => {
    connectMock.mockRejectedValue(new Error('Timed out after 8 seconds'));
    const res = await provider.testConnection(creds);
    expect(res.status).toBe('OFFLINE');
    expect(res.error).toMatch(/no respondió/);
  });

  it('upsertPppoeSecret crea si no existe y actualiza si ya existe', async () => {
    connectMock.mockResolvedValue(undefined);
    writeMock.mockImplementation(async (cmd: string) => (cmd === '/ppp/secret/print' ? [] : [{}]));
    expect(await provider.upsertPppoeSecret(creds, { username: 'c1', password: 'p', profile: 'plan-50m' })).toBe('created');
    expect(writeMock).toHaveBeenCalledWith('/ppp/secret/add', expect.arrayContaining(['=name=c1', '=profile=plan-50m', '=service=pppoe']));

    writeMock.mockReset();
    writeMock.mockImplementation(async (cmd: string) => (cmd === '/ppp/secret/print' ? [{ '.id': '*5' }] : [{}]));
    expect(await provider.upsertPppoeSecret(creds, { username: 'c1', password: 'nueva', profile: 'plan-100m' })).toBe('updated');
    expect(writeMock).toHaveBeenCalledWith('/ppp/secret/set', ['=.id=*5', '=password=nueva', '=profile=plan-100m', '=disabled=no']);
  });
});

describe('RouterOsProvider — address list y usuario deshabilitado', () => {
  let provider: RouterOsProvider;
  beforeEach(() => {
    hostsTried.length = 0;
    connectMock.mockReset().mockResolvedValue(undefined);
    writeMock.mockReset();
    provider = new RouterOsProvider({ decrypt: () => 'clave' } as any);
  });

  it('upsertPppoeSecret respeta disabled (cliente suspendido se crea/actualiza deshabilitado)', async () => {
    writeMock.mockImplementation(async (cmd: string) => (cmd === '/ppp/secret/print' ? [] : [{}]));
    await provider.upsertPppoeSecret(creds, { username: 'c1', password: 'p', profile: 'x', disabled: true });
    expect(writeMock).toHaveBeenCalledWith('/ppp/secret/add', expect.arrayContaining(['=disabled=yes']));
    writeMock.mockClear();
    await provider.upsertPppoeSecret(creds, { username: 'c1', password: 'p', profile: 'x' });
    expect(writeMock).toHaveBeenCalledWith('/ppp/secret/add', expect.arrayContaining(['=disabled=no']));
  });

  it('findActiveAddress devuelve la IP de la sesión o null', async () => {
    writeMock.mockResolvedValueOnce([{ name: 'ana01', address: '172.20.0.9' }]);
    expect(await provider.findActiveAddress(creds, 'ana01')).toBe('172.20.0.9');
    expect(writeMock).toHaveBeenCalledWith('/ppp/active/print', ['?name=ana01']);
    writeMock.mockResolvedValueOnce([]);
    expect(await provider.findActiveAddress(creds, 'ana01')).toBeNull();
  });

  it('addToAddressList no duplica si la IP ya está en la lista', async () => {
    writeMock.mockResolvedValueOnce([{ '.id': '*1' }]);
    await provider.addToAddressList(creds, 'moroso', '10.0.0.9', 'ISP Control:ana01');
    expect(writeMock).toHaveBeenCalledTimes(1);

    writeMock.mockReset().mockResolvedValueOnce([]).mockResolvedValueOnce([{}]);
    await provider.addToAddressList(creds, 'moroso', '10.0.0.9', 'ISP Control:ana01');
    expect(writeMock).toHaveBeenLastCalledWith('/ip/firewall/address-list/add', ['=list=moroso', '=address=10.0.0.9', '=comment=ISP Control:ana01']);
  });

  it('removeFromAddressList quita todas las entradas del cliente por comentario (aunque cambie la IP)', async () => {
    writeMock.mockResolvedValueOnce([{ '.id': '*1' }, { '.id': '*7' }]).mockResolvedValue([{}]);
    await provider.removeFromAddressList(creds, 'moroso', 'ISP Control:ana01');
    expect(writeMock).toHaveBeenNthCalledWith(1, '/ip/firewall/address-list/print', ['?list=moroso', '?comment=ISP Control:ana01']);
    expect(writeMock).toHaveBeenCalledWith('/ip/firewall/address-list/remove', ['=.id=*1']);
    expect(writeMock).toHaveBeenCalledWith('/ip/firewall/address-list/remove', ['=.id=*7']);
  });
});

describe('friendlyConnectionError', () => {
  it.each([
    ['RosException: cannot log in', /Usuario o contraseña/],
    ['connect ECONNREFUSED 10.0.0.1:8728', /rechazada/],
    ['getaddrinfo ENOTFOUND mi.dyn.com', /No se encontró/],
    ['Timed out after 8 seconds', /no respondió/],
    ['connect EHOSTUNREACH', /No hay ruta/],
    ['algo raro', /No se pudo conectar: algo raro/],
  ])('%s', (raw, expected) => {
    expect(friendlyConnectionError(new Error(raw))).toMatch(expected);
  });
});
