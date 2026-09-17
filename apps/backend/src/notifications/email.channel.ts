import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { NotificationChannel } from './notifications.service';

/**
 * Canal EMAIL real usando SMTP (nodemailer). Si SMTP_HOST no está configurado,
 * el canal se declara inactivo y no se registra — no se finge un envío.
 */
@Injectable()
export class EmailNotificationChannel implements NotificationChannel {
  readonly name = 'EMAIL';
  private readonly logger = new Logger('EmailChannel');
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    if (process.env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
      });
    }
  }

  get isConfigured() {
    return this.transporter !== null;
  }

  async send(params: { to: string; subject?: string; message: string }): Promise<void> {
    if (!this.transporter) {
      this.logger.warn('SMTP no configurado — el correo no fue enviado (configúralo en Settings > SMTP).');
      return;
    }
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM ?? 'no-reply@isp-control.local',
      to: params.to,
      subject: params.subject ?? 'Notificación de tu proveedor de Internet',
      text: params.message,
    });
  }
}
