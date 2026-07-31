import {
  Catch,
  ArgumentsHost,
  HttpException,
  ExceptionFilter,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();

      const errorResponse =
        typeof res === 'string' ? { message: res } : (res as object);

      response.status(status).json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        ...errorResponse,
      });
    } else {
      if (exception instanceof Error) {
        this.logger.error(
          `Unhandled exception: ${exception.message}`,
          exception.stack
        );
      } else {
        this.logger.error(`Unhandled exception: ${JSON.stringify(exception)}`);
      }

      response.status(500).json({
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path: request.url,
        message: 'Internal server error',
      });
    }
  }
}
