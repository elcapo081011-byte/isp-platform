import { WebSocketGateway, WebSocketServer, OnGatewayConnection } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

/**
 * Punto 37 — tiempo real. Cada conexión se autentica con el mismo JWT del
 * panel y se une a una "room" == organizationId, así una organización NUNCA
 * recibe eventos de otra por este canal en vivo.
 */
@WebSocketGateway({ cors: true, namespace: '/noc' })
export class NocGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(private jwt: JwtService) {}

  handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) return client.disconnect();
      const payload = this.jwt.verify(token);
      client.join(`org:${payload.organizationId}`);
    } catch {
      client.disconnect();
    }
  }

  emitDeviceStatusChange(organizationId: string, payload: { type: 'ROUTER' | 'OLT' | 'ONU'; id: string; status: string }) {
    this.server?.to(`org:${organizationId}`).emit('device.status_changed', payload);
  }

  emitAlert(organizationId: string, alert: unknown) {
    this.server?.to(`org:${organizationId}`).emit('alert.created', alert);
  }
}
