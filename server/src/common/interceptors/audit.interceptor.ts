import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from 'src/audit/audit.service';
import { RequestWithUser } from 'src/auth/types/auth.types';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private auditService: AuditService) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    const user = request.user;
    const queryName = request.query['queryName'] as string;

    if (!user || !queryName) return next.handle();

    return next.handle().pipe(
      tap({
        next: (body: any) => {
          const queryId = body.queryId;
          const riskLevel = body.riskLevel;
          const matchedCount = body.count || (body.data ? body.data.length : 0);

          this.auditService
            .log({
              userId: user.id,
              orgId: user.orgId,
              action: 'SCREENING_SEARCH',
              queryId: queryId,
              metadata: {
                queryName,
                riskLevel,
                matchedCount,
                source: 'WEB_API',
              },
            })
            .catch((error) => {
              this.logger.error(
                'CRITICAL: AuditInterceptor failed to log',
                error,
              );
            });
        },
      }),
    );
  }
}
