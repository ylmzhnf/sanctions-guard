import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../../audit/audit.service';
import { RequestWithUser } from '../../auth/types/auth.types';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    const user = request.user;
    const queryName = request.query['queryName'] as string;

    if (!user || !queryName) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: (body: any) => {
          const queryId = body?.queryId || null;
          const riskLevel = body?.riskLevel || 'UNKNOWN';
          const matchedCount = body?.count ?? (body?.data?.length || 0);

          this.auditService
            .log({
              actorId: user.id,
              orgId: user.orgId,
              action: 'SCREENING_SEARCH',
              metadata: {
                queryId,
                queryName,
                riskLevel,
                matchedCount,
                source: 'WEB_API',
              },
            })
            .catch((error) => {
              this.logger.error(
                `CRITICAL: AuditInterceptor failed to log for user ${user.id}`,
                error,
              );
            });
        },
        error: (err) => {
          this.logger.error(
            `CRITICAL: AuditInterceptor failed to log for user ${user.id}`,
            err,
          );
        },
      }),
    );
  }
}
