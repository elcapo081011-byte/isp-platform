import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

/**
 * Captura toda excepción no manejada. El cliente nunca ve stack traces
 * ni mensajes internos — solo un código y un mensaje amigable.
 * El detalle completo se registra en el logger interno (punto 36).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const friendlyMessage = isHttpException
      ? (exception.getResponse() as any)?.message ?? exception.message
      : 'Ocurrió un error inesperado. Nuestro equipo ya fue notificado.';

    this.logger.error(
      isHttpException ? exception.message : String(exception),
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      statusCode: status,
      errorCode: isHttpException ? exception.constructor.name : 'INTERNAL_ERROR',
      message: friendlyMessage,
      timestamp: new Date().toISOString(),
    });
  }
}
