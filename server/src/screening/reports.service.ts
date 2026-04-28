import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../common/prisma/prisma.service';
import { RiskLevel } from '@prisma/client';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private prisma: PrismaService) {}

  private getRiskColor(riskLevel: RiskLevel): string {
    const colors = {
      CRITICAL: '#DC2626',
      HIGH: '#EA580C',
      MEDIUM: '#CA8A04',
      LOW: '#2563EB',
      CLEAR: '#16A34A',
    };
    return colors[riskLevel] || '#4B5563';
  }

  async generateScreeningReport(queryId: string): Promise<Buffer> {
    const query = await this.prisma.screeningQuery.findUnique({
      where: { id: queryId },
      include: {
        matches: true,
        user: { select: { name: true, email: true } },
        org: { select: { name: true } },
      },
    });

    if (!query)
      throw new NotFoundException(`Report with ID ${queryId} not found`);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      
      doc
        .fontSize(22)
        .fillColor('#111827')
        .text('Sanctions Screening Report', { align: 'center' });
      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .fillColor('#6B7280')
        .text(`Generated on: ${new Date().toLocaleString()}`, {
          align: 'right',
        });
      doc.text(`Report ID: ${query.id}`, { align: 'right' });
      doc.moveDown(2);

      
      doc
        .fontSize(14)
        .fillColor('#111827')
        .text('1. Executive Summary', { underline: true });
      doc.moveDown(0.5);

      const requesterInfo = query.user
        ? query.user.name || query.user.email
        : 'API Integration';

      doc.fontSize(12).fillColor('#374151');
      doc
        .text(`Query Name: `, { continued: true })
        .fillColor('#000000')
        .text(query.queryName);
      doc
        .fillColor('#374151')
        .text(`Risk Level: `, { continued: true })
        .fillColor(this.getRiskColor(query.riskLevel ?? RiskLevel.CLEAR))
        .text(query.riskLevel ?? RiskLevel.CLEAR);
      doc
        .fillColor('#374151')
        .text(`Organization: `, { continued: true })
        .fillColor('#000000')
        .text(query.org.name);
      doc
        .fillColor('#374151')
        .text(`Requested By: `, { continued: true })
        .fillColor('#000000')
        .text(requesterInfo);
      doc.moveDown(1.5);

      
      if (query.aiExplanation) {
        doc
          .fontSize(14)
          .fillColor('#111827')
          .text('2. AI Risk Analysis', { underline: true });
        doc.moveDown(0.5);
        doc
          .fontSize(10)
          .fillColor('#374151')
          .text(query.aiExplanation, { align: 'justify', lineGap: 3 });
        doc.moveDown(1.5);
      }

      
      if (query.matches.length > 0) {
        doc
          .fontSize(14)
          .fillColor('#111827')
          .text('3. Sanctions Matches', { underline: true });
        doc.moveDown(0.5);

        query.matches.forEach((m, i) => {
          
          const percentage = (m.similarityScore * 100).toFixed(1);

          doc
            .fontSize(11)
            .fillColor('#111827')
            .text(`${i + 1}. ${m.matchedName} (${percentage}% match)`);
          doc
            .fontSize(9)
            .fillColor('#6B7280')
            .text(`Source: ${m.listSource} | Matched Field: ${m.matchedField}`);
          doc.moveDown(0.5);
        });
        doc.moveDown(1);
      }

      
      const osint = query.osintResults as any;
      if (osint && (osint.news?.length > 0 || osint.social?.length > 0)) {
        doc
          .fontSize(14)
          .fillColor('#111827')
          .text('4. OSINT Findings', { underline: true });
        doc.moveDown(0.5);

        if (osint.news?.length > 0) {
          doc.fontSize(11).fillColor('#374151').text('Recent News Mentions:');
          osint.news.slice(0, 3).forEach((n: any) => {
            doc
              .fontSize(9)
              .fillColor('#2563EB')
              .text(`• ${n.title}`, { link: n.link, underline: true });
            doc.moveDown(0.3);
          });
        }
        doc.moveDown(1.5);
      }

      
      doc.moveDown(2);
      doc
        .fontSize(8)
        .fillColor('#9CA3AF')
        .text(
          'DISCLAIMER: This report is for informational purposes only. Results must be verified against official lists. ' +
            `Generated securely by Sanctions-Guard for ${query.org.name}.`,
          { align: 'center' },
        );

      doc.end();
    });
  }
}
