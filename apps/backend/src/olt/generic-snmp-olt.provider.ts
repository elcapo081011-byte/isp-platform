import { Injectable, Logger } from '@nestjs/common';
import * as snmp from 'net-snmp';
import {
  OltProvider, OltCredentials, OltPonPortStatus, OnuStatusInfo, NotSupportedByDriverError,
} from '../../../../packages/network-drivers/src/olt-provider.interface';
import { ConnectionStatus } from '../../../../packages/network-drivers/src/router-provider.interface';

// OIDs estándar de MIB-II (RFC 1213) — universales, no dependen del fabricante.
const OID_SYS_DESCR = '1.3.6.1.2.1.1.1.0';
const OID_SYS_UPTIME = '1.3.6.1.2.1.1.3.0';

interface VendorOidMap {
  // Debe ser completado por el administrador con los OIDs propietarios del
  // fabricante/modelo, tomados de su documentación oficial de MIB.
  ponStatusTable?: string;
  onuRxPowerOid?: string;
  onuTxPowerOid?: string;
  onuTemperatureOid?: string;
}

@Injectable()
export class GenericSnmpOltProvider implements OltProvider {
  readonly vendor = 'GENERIC_SNMP';
  private readonly logger = new Logger('GenericSnmpOltProvider');

  private session(credentials: OltCredentials) {
    return snmp.createSession(credentials.host, credentials.snmpCommunity ?? 'public', {
      timeout: 5000,
      retries: 1,
      version: snmp.Version2c,
    });
  }

  async checkConnection(credentials: OltCredentials): Promise<ConnectionStatus> {
    return new Promise((resolve) => {
      const session = this.session(credentials);
      session.get([OID_SYS_DESCR], (error: any) => {
        session.close();
        if (error) {
          this.logger.warn(`SNMP sin respuesta de ${credentials.host}: ${error.message ?? error}`);
          resolve('OFFLINE');
        } else {
          resolve('ONLINE');
        }
      });
    });
  }

  async getSystemUptimeSeconds(credentials: OltCredentials): Promise<number> {
    return new Promise((resolve, reject) => {
      const session = this.session(credentials);
      session.get([OID_SYS_UPTIME], (error: any, varbinds: any[]) => {
        session.close();
        if (error) return reject(error);
        // sysUpTime viene en TimeTicks (centésimas de segundo).
        resolve(Math.floor(Number(varbinds[0].value) / 100));
      });
    });
  }

  /**
   * Requiere que `vendorOidMap.ponStatusTable` esté configurado con el OID
   * propietario correcto (documentación del fabricante). Sin esa configuración,
   * el sistema NO inventa un valor — declara la operación no soportada aún.
   */
  async listPonPorts(credentials: OltCredentials, oidMap?: VendorOidMap): Promise<OltPonPortStatus[]> {
    if (!oidMap?.ponStatusTable) {
      throw new NotSupportedByDriverError(
        this.vendor,
        'listPonPorts — falta configurar el OID de la tabla de PON para este modelo en Settings > OLT',
      );
    }
    // La implementación real de la caminata SNMP (snmp-walk) sobre `ponStatusTable`
    // se completa aquí una vez que el administrador confirme el modelo/OID exacto.
    throw new NotSupportedByDriverError(this.vendor, 'listPonPorts (OID configurado, walk pendiente de verificación de mapeo de valores)');
  }

  async listOnusByPon(_credentials: OltCredentials, _ponId: string): Promise<OnuStatusInfo[]> {
    throw new NotSupportedByDriverError(this.vendor, 'listOnusByPon — requiere OIDs propietarios del fabricante');
  }

  async getOnuDetail(_credentials: OltCredentials, _onuId: string): Promise<OnuStatusInfo> {
    throw new NotSupportedByDriverError(this.vendor, 'getOnuDetail — requiere OIDs propietarios del fabricante');
  }

  async rebootOnu(): Promise<void> {
    throw new NotSupportedByDriverError(this.vendor, 'rebootOnu');
  }
  async authorizeOnu(): Promise<void> {
    throw new NotSupportedByDriverError(this.vendor, 'authorizeOnu');
  }
  async deauthorizeOnu(): Promise<void> {
    throw new NotSupportedByDriverError(this.vendor, 'deauthorizeOnu');
  }
}
