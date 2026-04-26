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

@Injectable()
export class AiExplainerService {
  private readonly logger = new Logger(AiExplainerService.name);

  private readonly SYSTEM_PROMPT = `You are a compliance analyst specializing in international sanctions.
Your job is to write clear, professional risk explanations for sanctions screening matches.
Format your response as 3 sections: 
1. Risk Summary (Executive overview)
2. Match Analysis (Detailed comparison of names/entities)
3. Recommended Action (Next steps for compliance officer)
Be factual, concise, and professional. Never make definitive legal conclusions.
Always recommend human review for HIGH or CRITICAL matches.
Keep the total length under 300 words.`;

  async explain(input: ExplainInput): Promise<string> {
    const apiKey = input.userApiKey;

    if (!apiKey || apiKey.trim() === '') {
      this.logger.warn(
        `AI Analysis skipped: No API key found for ${input.provider}`,
      );
      return 'AI analysis is currently unavailable because no API key is configured in settings.';
    }

    const userPrompt = this.buildUserPrompt(input);

    try {
      if (input.provider === AiProvider.ANTHROPIC) {
        return await this.requestAnthropic(apiKey, userPrompt);
      }
      return await this.requestOpenAI(apiKey, userPrompt);
    } catch (err: any) {
      return this.handleAiError(err, input.provider);
    }
  }

  private buildUserPrompt(input: ExplainInput): string {
    const matchLines = input.matches
      .map((m, i) => {
        const score = (m.similarityScore * 1).toFixed(1);
        return `${i + 1}. Entity: "${m.matchedName}" | Match: %${score} | Source: ${m.listSource} | Type: ${m.entityType || 'N/A'}${m.country ? ` | Country: ${m.country}` : ''}`;
      })
      .join('\n');

    return `Screening query for: "${input.queryName}"
Assessed Risk Level: ${input.riskLevel}
Detected Matches:
${matchLines}

Please provide a professional risk analysis for these findings.`;
  }

  private async requestOpenAI(apiKey: string, prompt: string): Promise<string> {
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: this.SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    });
    return response.choices[0].message.content || '';
  }

  private async requestAnthropic(
    apiKey: string,
    prompt: string,
  ): Promise<string> {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 600,
      system: this.SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    const block = response.content.find((b) => b.type === 'text');
    return block?.type === 'text' ? block.text : '';
  }

  private handleAiError(err: any, provider: AiProvider): string {
    this.logger.error(`AI Analysis failed for ${provider}: ${err.message}`);

    if (err.status === 401) {
      return `🚨 AI Error: The API Key for ${provider} is invalid. Please check your settings.`;
    }
    if (err.status === 429) {
      return `🚨 AI Error: Rate limit or quota exceeded for ${provider}. Please check your billing.`;
    }

    return 'AI risk analysis is temporarily unavailable. Please review matches manually.';
  }
}
