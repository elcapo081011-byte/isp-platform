import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface NotificationChannel {
  readonly name: string; // "EMAIL" | "WHATSAPP" | "SMS" | "INTERNAL"
  send(params: { to: string; subject?: string; message: string }): Promise<void>;
}

interface NotifyParams {
  organizationId: string;
  event: string; // ej. "invoice.due_soon", "customer.suspended", "ticket.created"
  customer?: { email?: string | null; phone?: string | null; firstName: string; lastName: string } | null;
  payload: Record<string, unknown>;
}

/**
 * Punto 19/30 — Notification Provider Adapter.
 * En Fase 1-8 solo se registra el evento en BD (canal INTERNAL, siempre disponible).
 * Los canales EMAIL/WHATSAPP/SMS se activan en Fase 9 cuando SMTP y el proveedor
 * de WhatsApp estén configurados en Settings — hasta entonces, quedan documentados
 * como no conectados en vez de fingir el envío.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger('Notifications');
  private channels: NotificationChannel[] = [];

  constructor(private prisma: PrismaService) {}

  registerChannel(channel: NotificationChannel) {
    this.channels.push(channel);
  }

  async notify(params: NotifyParams) {
    const message = this.renderMessage(params);

    await this.prisma.notification.create({
      data: {
        organizationId: params.organizationId,
        event: params.event,
        recipientEmail: params.customer?.email ?? null,
        recipientPhone: params.customer?.phone ?? null,
        message,
        channel: 'INTERNAL',
        status: 'SENT',
      },
    });

    for (const channel of this.channels) {
      const to = channel.name === 'EMAIL' ? params.customer?.email : params.customer?.phone;
      if (!to) continue;
      try {
        await channel.send({ to, message });
      } catch (err) {
        this.logger.error(`Fallo enviando notificación por ${channel.name}: ${(err as Error).message}`);
      }
    }
  }

  private renderMessage(params: NotifyParams): string {
    const name = params.customer ? `${params.customer.firstName} ${params.customer.lastName}` : 'Cliente';
    switch (params.event) {
      case 'invoice.due_soon':
        return `Hola ${name}, tu factura ${params.payload.invoiceNumber} vence el ${params.payload.dueDate}.`;
      case 'invoice.created':
        return `Hola ${name}, se generó tu factura ${params.payload.invoiceNumber} por ${params.payload.total}. Vence el ${params.payload.dueDate}.`;
      case 'invoice.reminder':
        return `Hola ${name}, te recordamos que tu factura ${params.payload.invoiceNumber} vence el ${params.payload.dueDate}.`;
      case 'customer.suspended':
        return `Hola ${name}, tu servicio fue suspendido por falta de pago de la factura ${params.payload.invoiceNumber}.`;
      case 'customer.reactivated':
        return `Hola ${name}, tu servicio ha sido reactivado. ¡Gracias por tu pago!`;
      case 'platform_invoice.issued':
      case 'platform_invoice.overdue':
      case 'platform.suspended_nonpayment':
      case 'platform.reactivated':
        return `Hola ${name}, ${params.payload.message}`;
      default:
        return `Evento: ${params.event}`;
    }
  }
}
