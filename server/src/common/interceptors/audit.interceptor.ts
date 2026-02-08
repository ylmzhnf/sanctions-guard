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

interface SearchResultItem {
  fullName: string;
  score: number;
  id: number;
}

interface ResponseShape {
  success: boolean;
  count: number;
  data?: SearchResultItem[];
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
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
      tap((body: unknown) => {
        const response = body as ResponseShape;
        const result = response.data || [];
        let bestMatch: SearchResultItem | null = null;

        if (result.length > 0) {
          bestMatch = result[0];
        }

        this.auditService
          .createAuditLog({
            userId: user.id,
            queriedName: queryName,
            matchedName: bestMatch?.fullName,
            similarityScore: bestMatch?.score,
            sanctionId: bestMatch?.id,
          })
          .catch((error) => {
            this.logger.error('Audit log error: ', error);
          });
      }),
    );
  }
}
