import { buildConnectionScript, generateApiCredentials, sanitizeAddress, sanitizeLabel } from './connection-script';

describe('connection-script', () => {
  const base = { routerName: 'Torre Norte', apiUser: 'ispc_ab12cd34', apiPassword: 'a1b2c3d4e5', apiPort: 8728 };

  it('genera credenciales que se pueden incrustar sin escapar', () => {
    const c = generateApiCredentials();
    expect(c.username).toMatch(/^ispc_[0-9a-f]{8}$/);
    expect(c.password).toMatch(/^[0-9a-f]{36}$/);
    expect(generateApiCredentials().password).not.toBe(c.password);
  });

  it('con IP de plataforma restringe usuario y servicio API y abre el firewall', () => {
    const s = buildConnectionScript({ ...base, platformIp: '203.0.113.10' });
    expect(s).toContain('/user add name="ispc_ab12cd34" password="a1b2c3d4e5" group=ispcontrol address=203.0.113.10');
    expect(s).toContain('/ip service set api disabled=no port=8728 address=203.0.113.10');
    expect(s).toContain('src-address=203.0.113.10 action=accept');
    expect(s).not.toContain('AVISO');
  });

  it('sin IP de plataforma no restringe nada y lo avisa en el propio script', () => {
    const s = buildConnectionScript({ ...base, platformIp: null });
    expect(s).not.toContain('address=');
    expect(s).not.toContain('firewall filter add');
    expect(s).toContain('AVISO');
  });

  it('ignora una IP inválida en vez de romper el script', () => {
    expect(sanitizeAddress('999.1.1.1')).toBeNull();
    expect(sanitizeAddress('1.2.3.4/33')).toBeNull();
    expect(sanitizeAddress('1.2.3.4; /system reset-configuration')).toBeNull();
    expect(sanitizeAddress('10.0.0.0/8')).toBe('10.0.0.0/8');
    const s = buildConnectionScript({ ...base, platformIp: '1.2.3.4"; /system reset' });
    expect(s).not.toContain('reset');
  });

  it('el nombre del router no puede inyectar comandos', () => {
    expect(sanitizeLabel('Torre"\n/system reset-configuration')).toBe('Torresystem reset-configuration');
    const s = buildConnectionScript({ ...base, routerName: 'X"\n/system reset-configuration' });
    expect(s.split('\n').filter((l) => l.startsWith('/system'))).toHaveLength(0);
  });

  it('rechaza credenciales con caracteres que romperían el script', () => {
    expect(() => buildConnectionScript({ ...base, apiPassword: 'a"b' })).toThrow();
    expect(() => buildConnectionScript({ ...base, apiUser: 'a b' })).toThrow();
    expect(() => buildConnectionScript({ ...base, apiPort: 70000 })).toThrow();
  });

  it('es idempotente: limpia lo que pudo crear en una ejecución anterior', () => {
    const s = buildConnectionScript({ ...base, platformIp: '203.0.113.10' });
    expect(s).toContain(':do { /user remove [find where name="ispc_ab12cd34"] } on-error={}');
    expect(s).toContain(':do { /ip firewall filter remove [find where comment="ISP Control API"] } on-error={}');
  });
});
