import { RouterProvider, RouterCredentials, ConnectionStatus, RouterSystemInfo, PppoeSessionInfo } from '../router-provider.interface';
import { OltProvider, OltCredentials, OltPonPortStatus, OnuStatusInfo } from '../olt-provider.interface';

/**
 * MockRouterProvider: simula un MikroTik para desarrollo/demo.
 * Reemplazar por `RouterOsProvider` real en Fase 4, verificando cada
 * llamada contra la documentación oficial de RouterOS API antes de activarla.
 */
export class MockRouterProvider implements RouterProvider {
  async checkConnection(_c: RouterCredentials): Promise<ConnectionStatus> {
    return 'ONLINE';
  }

  async getSystemInfo(_c: RouterCredentials): Promise<RouterSystemInfo> {
    return {
      identity: 'MOCK-ROUTER-01',
      routerOsVersion: '7.x (simulado)',
      boardModel: 'MOCK-BOARD',
      cpuLoadPercent: 12,
      freeMemoryBytes: 512 * 1024 * 1024,
      totalMemoryBytes: 1024 * 1024 * 1024,
      uptimeSeconds: 86400,
      temperatureCelsius: null,
    };
  }

  async listPppoeActiveSessions(_c: RouterCredentials): Promise<PppoeSessionInfo[]> {
    return [];
  }

  async createPppoeSecret(): Promise<void> {
    // simulado — no ejecuta nada real
  }

  async removePppoeSecret(): Promise<void> {}
  async disablePppoeSecret(): Promise<void> {}
  async enablePppoeSecret(): Promise<void> {}
}

/**
 * MockOltProvider: simula una OLT para desarrollo/demo.
 * Los drivers reales (Huawei/ZTE/FiberHome) se implementan por fabricante
 * en la Fase 5, solo con operaciones confirmadas en documentación oficial.
 */
export class MockOltProvider implements OltProvider {
  readonly vendor = 'MOCK';

  async checkConnection(_c: OltCredentials): Promise<ConnectionStatus> {
    return 'ONLINE';
  }

  async listPonPorts(_c: OltCredentials, _oidMap?: unknown): Promise<OltPonPortStatus[]> {
    return [
      { ponId: '0/1/1', status: 'ONLINE', onuCount: 32, onlineOnuCount: 30 },
      { ponId: '0/1/2', status: 'ONLINE', onuCount: 28, onlineOnuCount: 28 },
      { ponId: '0/1/3', status: 'OFFLINE', onuCount: 0, onlineOnuCount: 0 },
    ];
  }

  async listOnusByPon(_c: OltCredentials, ponId: string): Promise<OnuStatusInfo[]> {
    return [
      {
        onuId: `${ponId}:1`,
        serial: 'MOCKSERIAL0001',
        status: 'ONLINE',
        rxPowerDbm: -19.2,
        txPowerDbm: 2.1,
        temperatureCelsius: 45,
        distanceMeters: 1200,
        lastSeenAt: new Date(),
      },
    ];
  }

  async getOnuDetail(_c: OltCredentials, onuId: string): Promise<OnuStatusInfo> {
    return {
      onuId,
      serial: 'MOCKSERIAL0001',
      status: 'ONLINE',
      rxPowerDbm: -19.2,
      txPowerDbm: 2.1,
      temperatureCelsius: 45,
      distanceMeters: 1200,
      lastSeenAt: new Date(),
    };
  }

  async rebootOnu(): Promise<void> {}
  async authorizeOnu(): Promise<void> {}
  async deauthorizeOnu(): Promise<void> {}
}
