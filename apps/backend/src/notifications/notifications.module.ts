import { Module, OnModuleInit } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { EmailNotificationChannel } from './email.channel';
import { PrismaService } from '../common/prisma/prisma.service';

@Module({
  providers: [NotificationsService, EmailNotificationChannel, PrismaService],
  exports: [NotificationsService],
})
export class NotificationsModule implements OnModuleInit {
  constructor(private notifications: NotificationsService, private emailChannel: EmailNotificationChannel) {}

  onModuleInit() {
    // WhatsApp/SMS (punto 19) se registran aquí mismo cuando exista un proveedor
    // oficial configurado en Settings — por ahora solo Email está implementado.
    this.notifications.registerChannel(this.emailChannel);
  }
}
