import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../common/prisma/prisma.service';
import { RiskLevel } from '@prisma/client';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  private readonly colors = {
    ink: '#0F172A',
    text: '#334155',
    muted: '#64748B',
    subtle: '#94A3B8',
    border: '#E2E8F0',
    surface: '#F8FAFC',
    white: '#FFFFFF',
    primary: '#2563EB',
    primarySoft: '#EFF6FF',
    purple: '#7C3AED',
    purpleSoft: '#F5F3FF',
    cyan: '#0891B2',
    cyanSoft: '#ECFEFF',
    danger: '#DC2626',
    dangerSoft: '#FEF2F2',
    success: '#16A34A',
    successSoft: '#F0FDF4',
    warning: '#D97706',
    warningSoft: '#FFFBEB',
    orange: '#EA580C',
    orangeSoft: '#FFF7ED',
  };

  constructor(private prisma: PrismaService) {}

  private getRiskColor(riskLevel: RiskLevel): string {
    const colors: Record<string, string> = {
      CRITICAL: this.colors.danger,
      HIGH: this.colors.orange,
      MEDIUM: this.colors.warning,
      LOW: this.colors.primary,
      CLEAR: this.colors.success,
    };

    return colors[riskLevel] || this.colors.muted;
  }

  private getRiskSoftColor(riskLevel: RiskLevel): string {
    const colors: Record<string, string> = {
      CRITICAL: this.colors.dangerSoft,
      HIGH: this.colors.orangeSoft,
      MEDIUM: this.colors.warningSoft,
      LOW: this.colors.primarySoft,
      CLEAR: this.colors.successSoft,
    };

    return colors[riskLevel] || this.colors.surface;
  }

  private formatDate(date = new Date()): string {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  private safeText(value: unknown, fallback = 'N/A'): string {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }

    return String(value);
  }

  private drawRoundedBox(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    height: number,
    fill: string,
    stroke = this.colors.border,
    radius = 8,
  ): void {
    doc.save();

    doc.roundedRect(x, y, width, height, radius).fill(fill);

    if (stroke) {
      doc
        .roundedRect(x, y, width, height, radius)
        .lineWidth(0.7)
        .stroke(stroke);
    }

    doc.restore();
  }

  private drawSectionTitle(
    doc: PDFKit.PDFDocument,
    number: string,
    title: string,
    subtitle?: string,
  ): void {
    const y = doc.y;

    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .fillColor(this.colors.ink)
      .text(`${number}  ${title}`, 50, y);

    if (subtitle) {
      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor(this.colors.muted)
        .text(subtitle, 50, y + 20);

      doc.y = y + 36;
    } else {
      doc.y = y + 26;
    }
  }

  private drawLabelValue(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    label: string,
    value: string,
    valueColor = this.colors.ink,
  ): void {
    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor(this.colors.muted)
      .text(label.toUpperCase(), x, y, {
        width,
        characterSpacing: 0.35,
      });

    doc
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .fillColor(valueColor)
      .text(value, x, y + 12, {
        width,
        ellipsis: true,
      });
  }

  private drawRiskBadge(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    riskLevel: RiskLevel,
  ): void {
    const label = `${riskLevel} RISK`;
    const color = this.getRiskColor(riskLevel);
    const softColor = this.getRiskSoftColor(riskLevel);
    const width = Math.max(84, doc.widthOfString(label) + 26);
    const height = 24;

    doc.save();

    doc.roundedRect(x, y, width, height, 12).fill(softColor).stroke(color);

    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(color)
      .text(label, x, y + 8, {
        width,
        align: 'center',
      });

    doc.restore();
  }

  private drawMetricCard(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    value: string,
    accentColor: string,
  ): void {
    this.drawRoundedBox(doc, x, y, width, height, this.colors.white);

    doc.roundedRect(x, y, 4, height, 2).fill(accentColor);

    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor(this.colors.muted)
      .text(label.toUpperCase(), x + 14, y + 11, {
        width: width - 28,
        characterSpacing: 0.35,
      });

    doc
      .font('Helvetica-Bold')
      .fontSize(15)
      .fillColor(this.colors.ink)
      .text(value, x + 14, y + 27, {
        width: width - 28,
        ellipsis: true,
      });
  }

  private ensureSpace(doc: PDFKit.PDFDocument, requiredHeight: number): void {
    const bottomMargin = 58;

    if (doc.y + requiredHeight > doc.page.height - bottomMargin) {
      doc.addPage();
      doc.y = 62;
    }
  }

  private drawPageChrome(
    doc: PDFKit.PDFDocument,
    organizationName: string,
    pageNumber: number,
  ): void {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    doc.save().rect(0, 0, pageWidth, 4).fill(this.colors.primary).restore();

    doc
      .moveTo(50, pageHeight - 43)
      .lineTo(pageWidth - 50, pageHeight - 43)
      .lineWidth(0.5)
      .stroke(this.colors.border);

    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor(this.colors.subtle)
      .text('SANCTIONS-GUARD  •  CONFIDENTIAL', 50, pageHeight - 31);

    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor(this.colors.subtle)
      .text(
        `${organizationName}  •  Page ${pageNumber}`,
        pageWidth - 210,
        pageHeight - 31,
        {
          width: 160,
          align: 'right',
        },
      );
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

    if (!query) {
      throw new NotFoundException(`Report with ID ${queryId} not found`);
    }

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        margin: 50,
        size: 'A4',
        bufferPages: true,
        info: {
          Title: 'Sanctions Screening Report',
          Author: 'Sanctions-Guard',
          Subject: `Screening report ${query.id}`,
        },
      });

      const buffers: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (error) => reject(error));

      const contentWidth = doc.page.width - 100;

      const requesterInfo = query.user
        ? query.user.name || query.user.email || 'Unknown User'
        : 'API Integration';

      const riskLevel = query.riskLevel ?? RiskLevel.CLEAR;
      const riskColor = this.getRiskColor(riskLevel);
      const matchCount = query.matches?.length ?? 0;

      doc
        .font('Helvetica-Bold')
        .fontSize(24)
        .fillColor(this.colors.ink)
        .text('Sanctions Screening', 50, 54);

      doc
        .font('Helvetica')
        .fontSize(12)
        .fillColor(this.colors.muted)
        .text('Compliance Intelligence Report', 50, 84);

      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(this.colors.muted)
        .text('REPORT ID', 50, 116);

      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(this.colors.ink)
        .text(query.id, 50, 128, {
          width: 250,
          ellipsis: true,
        });

      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(this.colors.muted)
        .text('GENERATED', 350, 116);

      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(this.colors.ink)
        .text(this.formatDate(), 350, 128);

      doc
        .moveTo(50, 151)
        .lineTo(50 + contentWidth, 151)
        .lineWidth(0.8)
        .stroke(this.colors.border);

      doc.y = 174;

      this.drawSectionTitle(
        doc,
        '01',
        'Executive Summary',
        'Screening identity, ownership and overall risk classification',
      );

      const summaryY = doc.y;
      const summaryHeight = 126;

      this.drawRoundedBox(
        doc,
        50,
        summaryY,
        contentWidth,
        summaryHeight,
        this.colors.surface,
      );

      doc
        .roundedRect(50, summaryY, 4, summaryHeight, 2)
        .fill(this.colors.primary);

      this.drawLabelValue(
        doc,
        70,
        summaryY + 16,
        205,
        'Query Name',
        this.safeText(query.queryName),
      );

      this.drawLabelValue(
        doc,
        295,
        summaryY + 16,
        205,
        'Organization',
        this.safeText(query.org?.name),
      );

      this.drawLabelValue(
        doc,
        70,
        summaryY + 58,
        205,
        'Requested By',
        requesterInfo,
      );

      this.drawLabelValue(
        doc,
        295,
        summaryY + 58,
        205,
        'Risk Level',
        riskLevel,
        riskColor,
      );

      this.drawRiskBadge(doc, 70, summaryY + 91, riskLevel);

      doc.y = summaryY + summaryHeight + 24;

      this.drawSectionTitle(
        doc,
        '02',
        'Screening Overview',
        'Key indicators from the screening result',
      );

      const metricGap = 10;
      const metricWidth = (contentWidth - metricGap * 2) / 3;
      const metricY = doc.y;
      const metricHeight = 62;

      this.drawMetricCard(
        doc,
        50,
        metricY,
        metricWidth,
        metricHeight,
        'Potential Matches',
        String(matchCount),
        this.colors.purple,
      );

      this.drawMetricCard(
        doc,
        50 + metricWidth + metricGap,
        metricY,
        metricWidth,
        metricHeight,
        'Risk Classification',
        riskLevel,
        riskColor,
      );

      this.drawMetricCard(
        doc,
        50 + (metricWidth + metricGap) * 2,
        metricY,
        metricWidth,
        metricHeight,
        'Report Status',
        'Completed',
        this.colors.success,
      );

      doc.y = metricY + metricHeight + 26;

      if (query.aiExplanation) {
        this.ensureSpace(doc, 90);

        this.drawSectionTitle(
          doc,
          '03',
          'AI Contextual Analysis',
          'Machine-assisted interpretation of the screening result',
        );

        try {
          let aiData: any;

          if (typeof query.aiExplanation === 'string') {
            const cleanText = query.aiExplanation
              .replace(/```json/gi, '')
              .replace(/```/g, '')
              .trim();

            aiData = JSON.parse(cleanText);
          } else {
            aiData = query.aiExplanation;
          }

          const drawAnalysisCard = (
            title: string,
            text: unknown,
            accentColor: string,
            softColor: string,
          ): void => {
            const safeTextContent = this.safeText(
              text,
              'No information available.',
            );
            const textWidth = contentWidth - 40;

            doc.font('Helvetica').fontSize(9).lineGap(3);

            const textHeight = doc.heightOfString(safeTextContent, {
              width: textWidth,
            });

            const cardHeight = Math.max(64, textHeight + 44);

            this.ensureSpace(doc, cardHeight + 12);

            const startY = doc.y;

            this.drawRoundedBox(
              doc,
              50,
              startY,
              contentWidth,
              cardHeight,
              softColor,
            );

            doc.roundedRect(50, startY, 4, cardHeight, 2).fill(accentColor);

            doc
              .font('Helvetica-Bold')
              .fontSize(9.5)
              .fillColor(this.colors.ink)
              .text(title, 70, startY + 12);

            doc
              .font('Helvetica')
              .fontSize(9)
              .fillColor(this.colors.text)
              .text(safeTextContent, 70, startY + 30, {
                width: textWidth,
                lineGap: 3,
                align: 'left',
              });

            doc.y = startY + cardHeight + 11;
          };

          drawAnalysisCard(
            'Risk Summary',
            aiData?.summary,
            this.colors.primary,
            this.colors.primarySoft,
          );

          drawAnalysisCard(
            'Match Analysis',
            aiData?.analysis,
            this.colors.purple,
            this.colors.purpleSoft,
          );

          drawAnalysisCard(
            'Recommended Action',
            aiData?.action,
            this.colors.danger,
            this.colors.dangerSoft,
          );
        } catch (error: any) {
          this.logger.error(`PDF AI Parse Error: ${error.message}`);

          const fallbackText = this.safeText(
            query.aiExplanation,
            'No AI analysis available.',
          );

          doc.font('Helvetica').fontSize(9).lineGap(3);

          const textHeight = doc.heightOfString(fallbackText, {
            width: contentWidth - 40,
          });

          const cardHeight = Math.max(64, textHeight + 44);

          this.ensureSpace(doc, cardHeight + 12);

          const startY = doc.y;

          this.drawRoundedBox(
            doc,
            50,
            startY,
            contentWidth,
            cardHeight,
            this.colors.surface,
          );

          doc
            .font('Helvetica-Bold')
            .fontSize(9.5)
            .fillColor(this.colors.ink)
            .text('AI Analysis', 70, startY + 12);

          doc
            .font('Helvetica')
            .fontSize(9)
            .fillColor(this.colors.text)
            .text(fallbackText, 70, startY + 30, {
              width: contentWidth - 40,
              lineGap: 3,
            });

          doc.y = startY + cardHeight + 12;
        }
      }

      if (query.matches && query.matches.length > 0) {
        this.ensureSpace(doc, 100);

        this.drawSectionTitle(
          doc,
          '04',
          'Sanctions Match Details',
          `${query.matches.length} potential match${
            query.matches.length === 1 ? '' : 'es'
          } identified`,
        );

        query.matches.forEach((match, index) => {
          const percentage = (Number(match.similarityScore || 0) * 100).toFixed(
            1,
          );
          const cardHeight = 69;

          this.ensureSpace(doc, cardHeight + 10);

          const startY = doc.y;

          this.drawRoundedBox(
            doc,
            50,
            startY,
            contentWidth,
            cardHeight,
            this.colors.white,
          );

          doc
            .roundedRect(50, startY, 4, cardHeight, 2)
            .fill(this.colors.purple);

          doc
            .font('Helvetica-Bold')
            .fontSize(8)
            .fillColor(this.colors.muted)
            .text(`#${String(index + 1).padStart(2, '0')}`, 68, startY + 12);

          doc
            .font('Helvetica-Bold')
            .fontSize(10)
            .fillColor(this.colors.ink)
            .text(this.safeText(match.matchedName), 104, startY + 10, {
              width: contentWidth - 205,
              ellipsis: true,
            });

          const badgeWidth = 76;
          const badgeX = 50 + contentWidth - badgeWidth - 14;

          doc
            .roundedRect(badgeX, startY + 9, badgeWidth, 22, 11)
            .fill(this.colors.purpleSoft)
            .stroke(this.colors.purple);

          doc
            .font('Helvetica-Bold')
            .fontSize(7.5)
            .fillColor(this.colors.purple)
            .text(`${percentage}% MATCH`, badgeX, startY + 16, {
              width: badgeWidth,
              align: 'center',
            });

          doc
            .font('Helvetica')
            .fontSize(8)
            .fillColor(this.colors.muted)
            .text(
              `SOURCE  ${this.safeText(match.listSource)}`,
              68,
              startY + 40,
              {
                width: contentWidth / 2 - 18,
                ellipsis: true,
              },
            );

          doc
            .font('Helvetica')
            .fontSize(8)
            .fillColor(this.colors.muted)
            .text(
              `FIELD  ${this.safeText(match.matchedField)}`,
              68 + contentWidth / 2,
              startY + 40,
              {
                width: contentWidth / 2 - 22,
                ellipsis: true,
              },
            );

          doc.y = startY + cardHeight + 9;
        });
      }

      const osint = query.osintResults as any;

      if (osint?.news && Array.isArray(osint.news) && osint.news.length > 0) {
        this.ensureSpace(doc, 100);

        this.drawSectionTitle(
          doc,
          '05',
          'OSINT News Mentions',
          `Showing up to ${Math.min(
            osint.news.length,
            3,
          )} relevant public mentions`,
        );

        osint.news.slice(0, 3).forEach((news: any, index: number) => {
          const title = this.safeText(news.title);
          const source = this.safeText(news.source);
          const date = this.safeText(news.date);

          doc.font('Helvetica').fontSize(9).lineGap(2);

          const titleHeight = doc.heightOfString(title, {
            width: contentWidth - 38,
          });

          const cardHeight = Math.max(68, titleHeight + 46);

          this.ensureSpace(doc, cardHeight + 10);

          const startY = doc.y;

          this.drawRoundedBox(
            doc,
            50,
            startY,
            contentWidth,
            cardHeight,
            this.colors.cyanSoft,
          );

          doc.roundedRect(50, startY, 4, cardHeight, 2).fill(this.colors.cyan);

          doc
            .font('Helvetica-Bold')
            .fontSize(8)
            .fillColor(this.colors.cyan)
            .text(
              `NEWS ${String(index + 1).padStart(2, '0')}`,
              68,
              startY + 10,
            );

          doc
            .font('Helvetica')
            .fontSize(9)
            .fillColor(this.colors.primary)
            .text(title, 68, startY + 25, {
              width: contentWidth - 38,
              lineGap: 2,
              link: news.link || undefined,
              underline: false,
            });

          doc
            .font('Helvetica')
            .fontSize(7.5)
            .fillColor(this.colors.muted)
            .text(`${source}  •  ${date}`, 68, startY + cardHeight - 17);

          doc.y = startY + cardHeight + 9;
        });
      }

      this.ensureSpace(doc, 76);

      const disclaimerY = doc.y + 6;

      this.drawRoundedBox(
        doc,
        50,
        disclaimerY,
        contentWidth,
        60,
        this.colors.surface,
      );

      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor(this.colors.ink)
        .text('IMPORTANT NOTICE', 68, disclaimerY + 12);

      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(this.colors.muted)
        .text(
          'This report is for informational and screening purposes only. Potential matches must be reviewed and verified against official sanctions lists and authoritative sources before any business decision is made.',
          68,
          disclaimerY + 26,
          {
            width: contentWidth - 36,
            lineGap: 2,
          },
        );

      const range = doc.bufferedPageRange();
      const totalPages = range.count;

      for (let i = 0; i < totalPages; i++) {
        const pageNumber = range.start + i;
        doc.switchToPage(pageNumber);

        this.drawPageChrome(
          doc,
          this.safeText(query.org?.name, 'Organization'),
          pageNumber + 1,
        );
      }

      doc.end();
    });
  }
}
