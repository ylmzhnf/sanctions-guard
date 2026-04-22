import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { AiProvider } from '@prisma/client';

export interface ExplainInput {
  queryName: string;
  matches: any[];
  riskLevel: string;
  userApiKey?: string;
  provider: AiProvider;
}

@Injectable()
export class AiExplainerService {
  private readonly logger = new Logger(AiExplainerService.name);

  private readonly SYSTEM_PROMPT = `You are a professional compliance analyst. 
  Analyze the following sanctions screening result and provide a concise risk report in 3 sections:
  1. Risk Summary, 2. Match Analysis, 3. Recommended Action.
  Be factual and professional. Avoid definitive legal judgments.`;

  async explain(input: ExplainInput): Promise<string> {
    const userPrompt = `Query Name: "${input.queryName}"\nRisk Level: ${input.riskLevel}\nMatches: ${JSON.stringify(input.matches)}`;

    const apiKey = input.userApiKey;

    if (!apiKey || apiKey.trim() === '') {
      this.logger.warn(
        `AI Analysis skipped: No API key found for ${input.provider}`,
      );
      return 'AI analysis is currently unavailable because no API key is configured.';
    }

    try {
      if (input.provider === AiProvider.ANTHROPIC) {
        return await this.requestAnthropic(apiKey, userPrompt);
      }
      return await this.requestOpenAI(apiKey, userPrompt);
    } catch (err: any) {
      this.logger.error(`AI Analysis failed for ${err.message}`);
      if (err.status === 401) {
        return '🚨 AI Error: The API Key provided in your Settings is invalid or expired. Please check your OpenAI account.';
      }
      if (err.status === 429) {
        return '🚨 AI Error: You have reached your OpenAI API quota or rate limit. Please check your billing details at OpenAI.';
      }
      return 'AI explanation is temporarily unavailable. Please check your API key and balance.';
    }
  }

  private async requestOpenAI(apiKey: string, prompt: string): Promise<string> {
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: this.SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
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
      max_tokens: 512,
      system: this.SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });
    const block = response.content.find((b) => b.type === 'text');
    return block?.type === 'text' ? block.text : '';
  }
}
