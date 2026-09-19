/**
 * RouterProvider — contrato que debe cumplir cualquier driver de router
 * (MikroTik u otro fabricante futuro). Este archivo NO implementa llamadas
 * reales a RouterOS API; eso vive en `mikrotik-routeros.provider.ts`, que
 * se construye en la Fase 4 verificando cada endpoint contra la
 * documentación oficial de RouterOS API antes de usarlo.
 *
 * Mientras tanto, `MockRouterProvider` permite desarrollar y probar todo
 * el resto del sistema (UI, permisos, websockets) sin hardware real.
 */

export type ConnectionStatus = 'ONLINE' | 'OFFLINE' | 'WARNING' | 'UNKNOWN';

export interface RouterCredentials {
  host: string;
  /** Host alterno: se intenta si `host` no acepta la conexión. */
  failoverHost?: string | null;
  port: number;
  username: string;
  /** Nunca se almacena en texto plano — ver EncryptionService en el módulo mikrotik. */
  encryptedPassword: string;
  useTls: boolean;
}

export interface RouterSystemInfo {
  identity: string;
  routerOsVersion: string;
  boardModel: string;
  cpuLoadPercent: number;
  freeMemoryBytes: number;
  totalMemoryBytes: number;
  uptimeSeconds: number;
  temperatureCelsius: number | null; // null si el modelo no lo reporta
}

export interface PppoeSessionInfo {
  username: string;
  callerId: string; // MAC del CPE
  address: string; // IP asignada
  uptimeSeconds: number;
  rxBytes: number;
  txBytes: number;
  profile: string;
}

export interface RouterProvider {
  /** Verifica conectividad real contra el equipo. No debe lanzar excepción; retorna estado. */
  checkConnection(credentials: RouterCredentials): Promise<ConnectionStatus>;

  getSystemInfo(credentials: RouterCredentials): Promise<RouterSystemInfo>;

  listPppoeActiveSessions(credentials: RouterCredentials): Promise<PppoeSessionInfo[]>;

  createPppoeSecret(
    credentials: RouterCredentials,
    params: { username: string; password: string; profile: string },
  ): Promise<void>;

  removePppoeSecret(credentials: RouterCredentials, username: string): Promise<void>;

  /**
   * Deshabilita el secret PPPoE (usado por el motor de suspensión, Fase 3/4).
   * Implementación real debe confirmarse contra RouterOS API antes de activarse.
   */
  disablePppoeSecret(credentials: RouterCredentials, username: string): Promise<void>;

  enablePppoeSecret(credentials: RouterCredentials, username: string): Promise<void>;
}
