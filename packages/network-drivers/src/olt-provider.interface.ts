/**
 * OltProvider — contrato común para cualquier fabricante de OLT.
 * Cada fabricante implementa esta interfaz en su propio archivo:
 *   olt-huawei.provider.ts, olt-zte.provider.ts, olt-fiberhome.provider.ts, etc.
 *
 * REGLA DEL PROYECTO (punto 31): ningún driver de fabricante se implementa
 * con comandos/OIDs SNMP inventados. Hasta confirmar la documentación oficial
 * de un fabricante+modelo+firmware específico, se usa `MockOltProvider`
 * (en este mismo paquete) para poder construir y probar el resto del sistema.
 */

import { ConnectionStatus } from './router-provider.interface';

export interface OltCredentials {
  host: string;
  sshPort?: number;
  snmpCommunity?: string;
  apiPort?: number;
  username?: string;
  encryptedPassword?: string;
}

export interface OltPonPortStatus {
  ponId: string; // ej. "0/1/1"
  status: ConnectionStatus;
  onuCount: number;
  onlineOnuCount: number;
}

export interface OnuStatusInfo {
  onuId: string;
  serial: string;
  status: ConnectionStatus;
  rxPowerDbm: number | null;
  txPowerDbm: number | null;
  temperatureCelsius: number | null;
  distanceMeters: number | null;
  lastSeenAt: Date | null;
}

export interface OltProvider {
  readonly vendor: string; // "HUAWEI" | "ZTE" | "FIBERHOME" | "GENERIC_SNMP" | "MOCK"

  checkConnection(credentials: OltCredentials): Promise<ConnectionStatus>;

  listPonPorts(credentials: OltCredentials, vendorOidMap?: unknown): Promise<OltPonPortStatus[]>;

  listOnusByPon(credentials: OltCredentials, ponId: string): Promise<OnuStatusInfo[]>;

  getOnuDetail(credentials: OltCredentials, onuId: string): Promise<OnuStatusInfo>;

  /** Lanza NotSupportedError si el fabricante/modelo no soporta reinicio remoto verificado. */
  rebootOnu(credentials: OltCredentials, onuId: string): Promise<void>;

  authorizeOnu(credentials: OltCredentials, serial: string, ponId: string): Promise<void>;
  deauthorizeOnu(credentials: OltCredentials, onuId: string): Promise<void>;
}

export class NotSupportedByDriverError extends Error {
  constructor(vendor: string, operation: string) {
    super(`El driver de ${vendor} no tiene esta operación verificada aún: ${operation}`);
  }
}
