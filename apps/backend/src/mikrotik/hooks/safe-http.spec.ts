import { EventEmitter } from 'events';
import { assertSafeHookUrl, isPublicIp, postJson, safeLookup, signBody, UnsafeUrlError } from './safe-http';

describe('isPublicIp', () => {
  it.each([
    '8.8.8.8', '1.1.1.1', '93.184.216.34', '2606:4700:4700::1111', '2a00:1450:4001:81b::200e',
  ])('%s es pública', (ip) => expect(isPublicIp(ip)).toBe(true));

  it.each([
    '127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '0.0.0.0',
    '100.64.0.1', '224.0.0.1', '255.255.255.255', '198.18.0.1',
    '::1', '::', 'fe80::1', 'fc00::1', 'fd12:3456::1', 'ff02::1', '2001:db8::1',
    '::ffff:127.0.0.1', '::ffff:10.0.0.1', '::ffff:169.254.169.254', '64:ff9b::7f00:1',
  ])('%s NO es pública', (ip) => expect(isPublicIp(ip)).toBe(false));

  it('lo que no es una IP no cuenta como pública', () => {
    expect(isPublicIp('no-es-ip')).toBe(false);
    expect(isPublicIp('999.1.1.1')).toBe(false);
  });

  it('los límites de rangos privados son exactos (172.15 y 172.32 sí son públicas)', () => {
    expect(isPublicIp('172.15.255.255')).toBe(true);
    expect(isPublicIp('172.32.0.1')).toBe(true);
  });
});

describe('assertSafeHookUrl', () => {
  it('acepta una URL https pública normal', () => {
    expect(assertSafeHookUrl('https://crm.miempresa.com/hooks/isp?token=1').hostname).toBe('crm.miempresa.com');
    expect(assertSafeHookUrl('https://crm.miempresa.com:8443/x')).toBeDefined();
  });

  it.each([
    ['http://crm.miempresa.com/x', /https/],
    ['ftp://crm.miempresa.com/x', /https/],
    ['https://user:pass@crm.miempresa.com/x', /usuario/],
    ['https://crm.miempresa.com:22/x', /puertos/],
    ['https://crm.miempresa.com:6379/x', /puertos/],
    ['https://localhost/x', /no está permitida/],
    ['https://algo.localhost/x', /no está permitida/],
    ['https://db.internal/x', /no está permitida/],
    ['https://impresora.local/x', /no está permitida/],
    ['https://127.0.0.1/x', /no es pública/],
    ['https://169.254.169.254/latest/meta-data', /no es pública/],
    ['https://10.0.0.5/x', /no es pública/],
    ['https://[::1]/x', /no es pública/],
    ['https://[::ffff:127.0.0.1]/x', /no es pública/],
    ['no es una url', /no es válida/],
  ])('rechaza %s', (url, msg) => {
    expect(() => assertSafeHookUrl(url)).toThrow(UnsafeUrlError);
    expect(() => assertSafeHookUrl(url)).toThrow(msg);
  });
});

describe('safeLookup (protección contra DNS rebinding)', () => {
  const run = (addresses: { address: string; family: number }[], opts: any = {}) =>
    new Promise<any>((resolve) => {
      const lookup = safeLookup((_h, _o, cb) => cb(null, addresses as any));
      lookup('x.com', opts, (err: any, address: any, family: any) => resolve({ err, address, family }));
    });

  it('deja pasar un nombre que resuelve solo a IPs públicas', async () => {
    const r = await run([{ address: '8.8.8.8', family: 4 }]);
    expect(r.err).toBeNull();
    expect(r.address).toBe('8.8.8.8');
  });

  it('con all:true devuelve la lista completa (forma que usa Node 20+)', async () => {
    const r = await run([{ address: '8.8.8.8', family: 4 }, { address: '1.1.1.1', family: 4 }], { all: true });
    expect(r.address).toHaveLength(2);
  });

  it('rechaza si el nombre resuelve a una IP privada', async () => {
    expect((await run([{ address: '10.0.0.5', family: 4 }])).err).toBeInstanceOf(UnsafeUrlError);
  });

  it('rechaza si SOLO UNA de las IPs es interna (mezcla pública + privada)', async () => {
    expect((await run([{ address: '8.8.8.8', family: 4 }, { address: '127.0.0.1', family: 4 }], { all: true })).err).toBeInstanceOf(UnsafeUrlError);
  });

  it('rechaza si no resuelve a nada', async () => {
    expect((await run([])).err).toBeInstanceOf(UnsafeUrlError);
  });
});

describe('postJson', () => {
  function fakeRequest(status: number) {
    const calls: any[] = [];
    const impl: any = (options: any, onResponse: any) => {
      const req: any = new EventEmitter();
      req.end = (body: string) => {
        calls.push({ options, body });
        const res: any = new EventEmitter();
        res.statusCode = status;
        res.resume = () => setImmediate(() => res.emit('end'));
        onResponse(res);
      };
      req.destroy = (e: Error) => req.emit('error', e);
      return req;
    };
    return { impl, calls };
  }

  it('firma el cuerpo con HMAC-SHA256 y manda el evento y un id de entrega', async () => {
    const { impl, calls } = fakeRequest(200);
    const res = await postJson('https://crm.miempresa.com/hook', { a: 1 }, { secret: 's3cret', event: 'customer.created', deliveryId: 'd1', requestImpl: impl });
    expect(res.status).toBe(200);
    const { options, body } = calls[0];
    expect(options.headers['X-ISP-Signature']).toBe(signBody(body, 's3cret'));
    expect(options.headers['X-ISP-Event']).toBe('customer.created');
    expect(options.headers['X-ISP-Delivery']).toBe('d1');
    expect(options.method).toBe('POST');
  });

  it('sin secreto no manda firma', async () => {
    const { impl, calls } = fakeRequest(204);
    await postJson('https://crm.miempresa.com/hook', {}, { event: 'x', deliveryId: 'd', requestImpl: impl });
    expect(calls[0].options.headers['X-ISP-Signature']).toBeUndefined();
  });

  it('valida la URL ANTES de conectar: una interna ni siquiera intenta la conexión', () => {
    const { impl, calls } = fakeRequest(200);
    expect(() => postJson('https://169.254.169.254/x', {}, { event: 'x', deliveryId: 'd', requestImpl: impl })).toThrow(UnsafeUrlError);
    expect(calls).toHaveLength(0);
  });

  it('usa la resolución segura (lookup) en la conexión', async () => {
    const { impl, calls } = fakeRequest(200);
    await postJson('https://crm.miempresa.com/hook', {}, { event: 'x', deliveryId: 'd', requestImpl: impl });
    expect(typeof calls[0].options.lookup).toBe('function');
  });
});
