import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { AiProvider, RiskLevel, ListSource } from '@prisma/client';

export interface ExplainInput {
  queryName: string;
  riskLevel: RiskLevel | string;
  matches: Array<{
    matchedName: string;
    similarityScore: number;
    listSource: ListSource | string;
    entityType?: string;
    country?: string | null;
    programs?: string[];
  }>;
  userApiKey?: string;
  provider: AiProvider;
}

const LEGAL_FOOTER =
  '\n\n---\n⚠️ Automated analysis — not legal advice. HIGH/CRITICAL matches require qualified compliance review.';

const SYSTEM_PROMPT = `You are a compliance analyst specializing in international sanctions.
Your job is to write clear, professional risk explanations for sanctions screening matches.
Format your response as 3 sections: 
1. Risk Summary (Executive overview)
2. Match Analysis (Detailed comparison)
3. Recommended Action (Next steps)
Be factual, concise, and professional. Never make definitive legal conclusions.
Always recommend human review for HIGH or CRITICAL matches.
Keep the total length under 300 words.`;

@Injectable()
export class AiExplainerService {
  private readonly logger = new Logger(AiExplainerService.name);

  async explain(input: ExplainInput): Promise<string> {
    const apiKey = input.userApiKey;

    if (!apiKey || apiKey.trim() === '') {
      this.logger.warn(
        `AI Analysis skipped: No API key found for ${input.provider}`,
      );
      return `AI analysis is currently unavailable because no API key is configured in settings.${LEGAL_FOOTER}`;
    }

    const userPrompt = this.buildUserPrompt(input);

    try {
      const explanation =
        input.provider === AiProvider.ANTHROPIC
          ? await this.requestAnthropic(apiKey, userPrompt)
          : await this.requestOpenAI(apiKey, userPrompt);

      return explanation + LEGAL_FOOTER;
    } catch (err: any) {
      return this.handleAiError(err, input.provider);
    }
  }

  private buildUserPrompt(input: ExplainInput): string {
    const matchLines = input.matches
      .map((m, i) => {
        const score =
          typeof m.similarityScore === 'number' && m.similarityScore <= 1
            ? (m.similarityScore * 100).toFixed(1)
            : Number(m.similarityScore).toFixed(1);

        const parts = [
          `${i + 1}. Entity: "${m.matchedName}"`,
          `Match: %${score}`,
          `Source: ${m.listSource}`,
          `Type: ${m.entityType || 'N/A'}`,
        ];

        if (m.country) parts.push(`Country: ${m.country}`);
        if (m.programs?.length)
          parts.push(`Programs: ${m.programs.join(', ')}`);

        return parts.join(' | ');
      })
      .join('\n');

    return `Screening query for: "${input.queryName}"\nAssessed Risk Level: ${input.riskLevel}\nDetected Matches:\n${matchLines}\n\nPlease provide a professional risk analysis for these findings.`;
  }

  private async requestOpenAI(apiKey: string, prompt: string): Promise<string> {
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 400,
    });
    return response.choices[0]?.message?.content || '';
  }

  private async requestAnthropic(
    apiKey: string,
    prompt: string,
  ): Promise<string> {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    const block = response.content.find((b) => b.type === 'text');
    return block?.type === 'text' ? block.text : '';
  }

  private handleAiError(err: any, provider: AiProvider): string {
    this.logger.error(
      `AI Analysis failed for ${provider}: ${err.message}`,
      err.stack,
    );

    let errorMsg =
      'Automated risk analysis is temporarily unavailable. Please review matches manually.';

    if (err.status === 401) {
      errorMsg = `🚨 AI Error: The API Key for ${provider} is invalid. Please check your settings.`;
    } else if (err.status === 429) {
      errorMsg = `🚨 AI Error: Rate limit or quota exceeded for ${provider}. Please try again later.`;
    }

    return errorMsg + LEGAL_FOOTER;
  }
}
