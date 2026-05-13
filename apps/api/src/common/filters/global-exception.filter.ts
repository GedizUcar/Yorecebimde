import { Catch, type ArgumentsHost, type ExceptionFilter, HttpException } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { BaseAppError, logger } from '@yorecebimde/shared';
import { ZodError } from 'zod';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<FastifyReply>();
    const req = ctx.getRequest<FastifyRequest & { requestId?: string }>();
    const requestId = req.requestId ?? 'unknown';

    if (exception instanceof BaseAppError) {
      logger.warn(
        { requestId, code: exception.code, path: req.url, method: req.method },
        exception.message,
      );
      return res.status(exception.httpStatus).send({
        error: { ...exception.toJSON(), requestId },
      });
    }

    if (exception instanceof ZodError) {
      logger.warn({ requestId, issues: exception.issues }, 'Zod validation failed');
      return res.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Geçersiz veri',
          details: exception.issues.map((i) => ({
            field: i.path.join('.'),
            message: i.message,
          })),
          requestId,
        },
      });
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      logger.warn({ requestId, status, response }, 'HTTP exception');
      return res.status(status).send({
        error: {
          code: 'HTTP_EXCEPTION',
          message: typeof response === 'string' ? response : (response as { message?: string }).message ?? exception.message,
          requestId,
        },
      });
    }

    // Unknown error — internal
    const err = exception as Error;
    logger.error({ requestId, err, path: req.url, method: req.method }, 'Unhandled error');
    return res.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Beklenmedik bir hata oluştu',
        requestId,
      },
    });
  }
}
