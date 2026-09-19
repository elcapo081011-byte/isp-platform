import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateRouterDto, UpdateRouterDto } from './router.dto';

const opts = { whitelist: true, forbidNonWhitelisted: true };
const check = async (cls: any, plain: any) => (await validate(plainToInstance(cls, plain), opts)).map((e) => e.property);

describe('Router DTOs', () => {
  it('crear con lo mínimo: solo nombre y host (usa credenciales generadas)', async () => {
    expect(await check(CreateRouterDto, { name: 'Torre', host: '203.0.113.10' })).toEqual([]);
  });

  it('con credenciales propias exige usuario y contraseña', async () => {
    const bad = await check(CreateRouterDto, { name: 'Torre', host: '10.0.0.1', useConnectionScript: false });
    expect(bad).toEqual(expect.arrayContaining(['username', 'password']));
    expect(await check(CreateRouterDto, { name: 'Torre', host: '10.0.0.1', useConnectionScript: false, username: 'a', password: 'b' })).toEqual([]);
  });

  it('rechaza hosts con espacios o símbolos', async () => {
    expect(await check(CreateRouterDto, { name: 'Torre', host: '10.0.0.1; rm -rf' })).toContain('host');
    expect(await check(CreateRouterDto, { name: 'Torre', host: 'mi router' })).toContain('host');
    expect(await check(CreateRouterDto, { name: 'Torre', host: 'miempresa.dyn.com' })).toEqual([]);
    expect(await check(CreateRouterDto, { name: 'Torre', host: 'fe80::1' })).toEqual([]);
  });

  it('el failover vacío es válido (sirve para borrarlo); uno con símbolos no', async () => {
    expect(await check(UpdateRouterDto, { failoverHost: '' })).toEqual([]);
    expect(await check(UpdateRouterDto, { failoverHost: 'a b;c' })).toContain('failoverHost');
  });

  it('valida rangos: puerto, versión, coordenadas y zona', async () => {
    expect(await check(CreateRouterDto, { name: 'T1', host: 'h', port: 70000 })).toContain('port');
    expect(await check(CreateRouterDto, { name: 'T1', host: 'h', routerOsVersion: '5' })).toContain('routerOsVersion');
    expect(await check(CreateRouterDto, { name: 'T1', host: 'h', latitude: 95 })).toContain('latitude');
    expect(await check(CreateRouterDto, { name: 'T1', host: 'h', zone: { cutDay: 40 } })).toContain('zone');
    expect(await check(CreateRouterDto, { name: 'T1', host: 'h', zone: { cutDay: 5, taxPercent: 18 } })).toEqual([]);
  });

  it('al editar, la contraseña puede venir vacía y el tipo de credencial no se puede cambiar', async () => {
    expect(await check(UpdateRouterDto, { name: 'Nuevo nombre', password: '' })).toEqual([]);
    expect(await check(UpdateRouterDto, { useConnectionScript: false })).toContain('useConnectionScript');
    expect(await check(UpdateRouterDto, { username: { $ne: 1 } })).toContain('username');
  });

  it('rechaza campos que no existen (no se puede colar organizationId ni estado)', async () => {
    expect(await check(CreateRouterDto, { name: 'Torre', host: 'h', organizationId: 'otra', status: 'ONLINE' })).toEqual(
      expect.arrayContaining(['organizationId', 'status']),
    );
  });
});
