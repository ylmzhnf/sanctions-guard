import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ScreeningService } from './screening.service';

@Processor('bulk-screening-queue', { concurrency: 5 })
export class ScreeningProcessor extends WorkerHost {
  private readonly logger = new Logger(ScreeningProcessor.name);

  constructor(private readonly screeningService: ScreeningService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { name, entityType, userId, orgId, batchId } = job.data;

    this.logger.debug(`[Batch: ${batchId}] Kuyruktan işleniyor: ${name}`);

    try {
      const result = await this.screeningService.screen(
        { queryName: name, entityType },
        userId,
        orgId,
      );

      return result;
    } catch (error) {
      this.logger.error(`Tarama hatası (${name}): ${error.message}`);
      throw error;
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job?.id} başarısız oldu: ${error.message}`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Job ${job?.id} başarıyla tamamlandı.`);
  }
}
