import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const body =
      exception instanceof HttpException ? exception.getResponse() : null;

    const error =
      body && typeof body === 'object' && 'code' in body
        ? (body as { code: string; message: string })
        : { code: 'INTERNAL_SERVER_ERROR', message: '서버 오류가 발생했습니다' };

    if (status >= 500) {
      this.logger.error(exception);
    }

    response.status(status).json({ success: false, error });
  }
}
