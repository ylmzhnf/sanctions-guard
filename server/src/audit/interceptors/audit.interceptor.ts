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
    const queryName = (request.query['queryName'] || request.body['name']) as string;

    if (!user || !queryName) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: (body: any) => {
          
          this.handleLog(user, queryName, body);
        },
        error: (err) => {
          
          this.handleLog(user, queryName, null, err);
        },
      }),
    );
  }

  
  private async handleLog(user: any, queryName: string, body: any, error?: any) {
    try {
      const queryId = body?.queryId || null;
      const riskLevel = body?.riskLevel || (error ? 'ERROR' : 'UNKNOWN');
      const matchedCount = body?.count ?? (body?.data?.length || 0);

      await this.auditService.log({
        actorId: user.id,
        orgId: user.orgId,
        action: error ? 'SCREENING_FAILED' : 'SCREENING_SEARCH',
        queryId, 
        metadata: {
          queryName,
          riskLevel,
          matchedCount,
          status: error ? 'FAILED' : 'SUCCESS',
          errorMessage: error?.message || null,
          ipAddress: user.ip || 'N/A', 
        },
      });
    } catch (logError) {
      
      
      this.logger.error(
        `Audit logging failed for user ${user.id} during search: ${queryName}`,
        logError.stack,
      );
    }
  }
}