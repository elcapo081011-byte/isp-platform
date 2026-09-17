import { Module, Injectable, Controller, Get, Post, UseGuards, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { exec } from 'child_process';
import { promisify } from 'util';
import { mkdir, readdir, stat, unlink } from 'fs/promises';
import { join } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../rbac/permissions.guard';
import { PrismaService } from '../common/prisma/prisma.service';

const execAsync = promisify(exec);
const BACKUP_DIR = process.env.BACKUP_DIR ?? '/app/backups';
// El backup es de TODA la base de datos compartida (todas las organizaciones
// a la vez, vía pg_dump) — por eso la retención es una config de plataforma
// (variable de entorno), no un ajuste por-tenant en la tabla Setting.
const RETENTION_DAYS = Number(process.env.BACKUP_RETENTION_DAYS ?? 14);

@Injectable()
class BackupsService {
  private readonly logger = new Logger('Backups');

  /**
   * Ejecuta `pg_dump` real contra DATABASE_URL. Requiere que el cliente
   * `pg_dump` esté disponible en el contenedor (se incluye en la imagen
   * `postgres:16-alpine` usada como base de utilidades, o se instala en el
   * Dockerfile del backend — ver docs/PRODUCCION.md).
   */
  async runBackup(): Promise<{ file: string }> {
    await mkdir(BACKUP_DIR, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = join(BACKUP_DIR, `backup-${timestamp}.sql`);

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error('DATABASE_URL no está configurada');

    await execAsync(`pg_dump "${databaseUrl}" -F p -f "${filePath}"`);
    this.logger.log(`Backup creado: ${filePath}`);
    await this.cleanupOldBackups();
    return { file: filePath };
  }

  private async cleanupOldBackups() {
    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const files = await readdir(BACKUP_DIR).catch(() => []);
    for (const file of files) {
      const filePath = join(BACKUP_DIR, file);
      const stats = await stat(filePath).catch(() => null);
      if (stats && stats.mtimeMs < cutoff) {
        await unlink(filePath).catch(() => undefined);
        this.logger.log(`Backup expirado eliminado: ${file}`);
      }
    }
  }

  async list() {
    const files = await readdir(BACKUP_DIR).catch(() => []);
    return files.filter((f) => f.endsWith('.sql')).sort().reverse();
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async scheduledBackup() {
    try {
      await this.runBackup();
    } catch (err) {
      this.logger.error(`Backup automático falló: ${(err as Error).message}`);
    }
  }
}

@ApiTags('backups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('backups')
class BackupsController {
  constructor(private backups: BackupsService) {}

  @Get()
  @RequirePermissions('settings.manage')
  list() {
    return this.backups.list();
  }

  @Post('run')
  @RequirePermissions('settings.manage')
  run() {
    return this.backups.runBackup();
  }
}

@Module({
  controllers: [BackupsController],
  providers: [BackupsService, PrismaService],
})
export class BackupsModule {}
