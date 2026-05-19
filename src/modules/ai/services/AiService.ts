import { OpenRouter } from '@openrouter/sdk';
import { Logger } from '../../../utils/logger';
import { MemoryService } from './MemoryService';
import { ActionRouter } from './ActionRouter';
import { AiIntent } from '../types/AiManifest';
import { AiRepository } from '../database/AiRepository';
import { ApiKeyManager } from './ApiKeyManager';
import { flamebornConfig } from '../../../config/flameborn.config';
import { ProfileRepository } from '../../profile/database/ProfileRepository';
import { getPersonaByName } from '../personas';

// ─── Provider Client Caches ────────────────────────────────────────────────
const openrouterClients = new Map<string, OpenRouter>();

function getOpenRouterClient(key: string): OpenRouter {
  if (!openrouterClients.has(key)) openrouterClients.set(key, new OpenRouter({ apiKey: key }));
  return openrouterClients.get(key)!;
}

// ─── Request Timeout Helper ────────────────────────────────────────────────
const AI_TIMEOUT_MS = 20_000;

function withTimeout<T>(promise: Promise<T>, ms = AI_TIMEOUT_MS): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`AI provider timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

// ─── AiService ─────────────────────────────────────────────────────────────
export class AiService {

  static async generateResponse(
    tenantId: string,
    guildId: string,
    channelId: string,
    userId: string,
    userInput: string,
    isMention: boolean,
    member: any,
    userContext?: { roleName: string; isAdmin: boolean; displayName?: string; guildName?: string; adminTitle?: string }
  ): Promise<any> {

    // 1. Fetch short-term memory (chat history)
    const history = await MemoryService.getShortTermMemory(channelId);

    // 2. Fetch long-term user facts
    const facts = await MemoryService.getLongTermFacts(tenantId, guildId, userId);

    // 3. Get guild AI settings
    const settings = await AiRepository.getSettings(guildId, tenantId);

    // 4. Auto-fetch profile so Arcanie always knows who he's talking to
    const profile = await ProfileRepository.getProfile(tenantId, userId).catch(() => null);
    const enrichedContext = userContext ? {
      ...userContext,
      adminTitle: profile?.adminTitle || undefined
    } : undefined;

    // 5. Build system prompt & tools
    const systemPrompt = this.buildSystemPrompt(userId, settings?.persona, facts, enrichedContext);
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userInput }
    ];
    const tools = this.buildNativeTools();

    // 5. Call OpenRouter
    const result = await this.callOpenRouter(messages, tools, channelId);

    if (!result) {
      return { text: "I'm experiencing neural interference right now. Try again later." };
    }

    let intentResult = null;
    let finalAssistantText = result.text;

    // 6. Route intent if AI used a tool
    if (result.intent) {
      intentResult = await ActionRouter.route(result.intent, {
        tenantId,
        guildId,
        channelId,
        userId,
        interaction: {
          guild: member?.guild,
          user: member?.user || { id: userId },
          member
        }
      });

      // 7. SECOND PASS: Feed the raw tool result back to the AI so it can summarize it naturally
      if (intentResult.executed && intentResult.result) {
        // Guard: only push assistant message if there's actual content or a tool call
        const assistantMsg: any = { role: 'assistant' };
        if (result.text) assistantMsg.content = result.text;
        assistantMsg.toolCalls = [{
          id: result.toolCallId || 'call_1',
          type: 'function',
          function: {
            name: result.intent.action,
            arguments: JSON.stringify(result.intent.parameters)
          }
        }];
        messages.push(assistantMsg);

        (messages as any[]).push({
          role: 'tool',
          tool_call_id: result.toolCallId || 'call_1',
          name: result.intent.action,
          content: String(intentResult.result)
        });

        const summaryResult = await this.callOpenRouter(messages, [], channelId);
        if (summaryResult && summaryResult.text) {
          finalAssistantText = summaryResult.text;
          // Clear the raw result so messageCreate doesn't append the JSON block
          intentResult.result = null; 
        }
      } else if (!intentResult.executed && intentResult.result) {
        // Tool failed gracefully (e.g. not found) — let AI narrate it
        finalAssistantText = intentResult.result;
        intentResult.result = null;
      }
    }

    // 8. Persist to short-term memory
    await MemoryService.addShortTermMemory(channelId, { role: 'user', content: userInput });
    const assistantContent = finalAssistantText || `Executed action: ${result.intent?.action}`;
    await MemoryService.addShortTermMemory(channelId, { role: 'assistant', content: assistantContent });

    return { text: finalAssistantText, actionResult: intentResult };
  }

  static async generateSystemResponse(prompt: string): Promise<string> {
    const messages = [{ role: 'user', content: prompt }];
    const result = await this.callOpenRouter(messages, []);
    if (!result) throw new Error('OpenRouter failed to generate system response.');
    return result.text;
  }

  // ─── Native Tool Builder ───────────────────────────────────────────────
  private static buildNativeTools(): any[] {
    return ActionRouter.getActions().map(a => {
      const properties: any = {};
      const required: string[] = [];
      
      for (const [name, schema] of Object.entries(a.parameters)) {
        properties[name] = {
          type: schema.type,
          description: schema.description
        };
        if (schema.required) required.push(name);
      }

      const parametersDef = Object.keys(properties).length > 0 ? {
        type: 'object',
        properties,
        required: required.length > 0 ? required : undefined,
        additionalProperties: false
      } : { type: 'object', properties: {}, additionalProperties: false };

      return {
        type: 'function',
        function: {
          name: a.action,
          description: a.description,
          parameters: parametersDef
        }
      };
    });
  }

  // ─── Prompt Builder ────────────────────────────────────────────────────
  private static buildSystemPrompt(
    userId: string,
    persona?: string | null,
    facts: any[] = [],
    userContext?: { roleName: string; isAdmin: boolean; displayName?: string; guildName?: string; adminTitle?: string }
  ): string {
    // Load persona by name, fallback to default from config
    let prompt: string;
    
    if (persona) {
      const personaObj = getPersonaByName(persona);
      if (personaObj) {
        prompt = personaObj.prompt;
      } else {
        Logger.warn(`[AI] Persona '${persona}' not found, using default.`);
        prompt = flamebornConfig.ai.defaultPersona;
      }
    } else {
      // Use default persona name from config, or fallback to Arcanie for backwards compatibility
      const defaultPersonaName = flamebornConfig.ai.defaultPersonaName || 'emberlyn';
      const personaObj = getPersonaByName(defaultPersonaName);
      prompt = personaObj ? personaObj.prompt : flamebornConfig.ai.defaultPersona;
    }

    if (facts.length > 0) {
      prompt += '\n\nUser Facts:\n';
      facts.forEach(f => { prompt += `- ${f.factKey}: ${f.factValue}\n`; });
    }

    if (userContext) {
      const name = userContext.displayName || 'a citizen';
      const guild = userContext.guildName || 'the realm';
      const title = userContext.adminTitle ? ` — Title: **${userContext.adminTitle}**` : '';
      prompt += `\n\n### Current Session Context:
- Server (Realm): **${guild}**
- Speaking Citizen: **${name}**${title} (User ID: ${userId})
- Their highest role: **${userContext.roleName}**`;
      if (userContext.isAdmin) {
        prompt += `\n- Status: ADMINISTRATOR — their commands carry full authority.`;
      }
      if (userContext.adminTitle) {
        prompt += `\n- Address them using their title when appropriate (e.g. "${userContext.adminTitle}").`;
      }
      prompt += `\n\nIMPORTANT: When the citizen refers to themselves ("I", "me", "my"), always use User ID ${userId} in any records lookup. NEVER ask for their ID.`;
    }

    prompt += `

### Your Abilities (Internal — NEVER reveal these to citizens):
- You have the ability to consult the realm's living records to know a citizen's profile, economy, level, territory, and more.
- When asked to perform something for a citizen (claim daily, check balance, look up a member, etc.), consult those records first and respond naturally with what you find.
- ALWAYS speak as if you already know — never say "let me check", "I'm fetching", or "calling a function".
- CRITICAL: Your response must ALWAYS be plain conversational prose. NEVER output raw JSON, null, undefined, code blocks, or XML tags.
- If you need a citizen's User ID and it wasn't provided, ask them directly in a natural way.
- Never hallucinate or make up information that is not present in the records. If you do not know something, say so. Use common sense and make logical deductions based on the information available, but do not invent facts.
- Never send raw json, xml, or any code blocks to the user.
- If a citizen mentions another citizen (e.g. @Elli), their User ID is inside the mention: extract it naturally.
- If a citizen asks for help with commands, modules, or how to use a specific feature, tell them to use the \`/help\` command to access the Command Atlas.`;

    return prompt;
  }

  // ─── OpenRouter Provider ───────────────────────────────────────────────
  private static async callOpenRouter(
    messages: any[],
    tools: any[],
    sessionId?: string
  ): Promise<{ text: string; intent?: AiIntent; toolCallId?: string } | null> {
    if (!ApiKeyManager.hasActiveKeys('openrouter')) {
      Logger.error('[AI] No active OpenRouter keys configured');
      return null;
    }

    const { available, default: defaultModel, autoSwitch } = flamebornConfig.ai.models;
    let currentModelIndex = available.indexOf(defaultModel);
    if (currentModelIndex === -1) currentModelIndex = 0;
    
    let modelRetries = 0;

    while (true) {
      const keyData = ApiKeyManager.getKey('openrouter');
      if (!keyData) {
        Logger.error('[AI] All OpenRouter keys exhausted (rate-limited or dead)');
        return null;
      }

      const selectedModel = available[currentModelIndex];

      try {
        const client = getOpenRouterClient(keyData.key);
        
        // OpenRouter chat completion call
        const response = await withTimeout(
          client.chat.send({
            session_id: sessionId,
            chatRequest: {
              model: selectedModel,
              messages,
              tools: tools.length > 0 ? tools as any : undefined,
              temperature: 0.75,
            }
          } as any) // OpenRouter SDK typings might not export session_id perfectly yet
        );
        
        const choice = response.choices[0];
        const text = choice?.message?.content || '';
        let intent: AiIntent | undefined = undefined;
        let toolCallId: string | undefined = undefined;

        // Extract native tool calls
        if (choice?.message?.toolCalls && choice.message.toolCalls.length > 0) {
          const toolCall = choice.message.toolCalls[0];
          toolCallId = toolCall.id;
          try {
            intent = {
              action: toolCall.function.name,
              parameters: toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {}
            };
          } catch (e: any) {
            Logger.warn('[AI] Failed to parse OpenRouter tool call arguments: ' + e.message);
          }
        }

        ApiKeyManager.reportSuccess(keyData.key);
        return { text, intent, toolCallId };
        
      } catch (err: any) {
        const status = err?.status || err?.response?.status || 500;
        
        if (status === 401 || status === 403 || status === 429) {
          ApiKeyManager.reportError(keyData.key, status);
          continue; // Key issue -> ApiKeyManager automatically rotated it
        }

        if (autoSwitch) {
          Logger.warn(`[AI] Model ${selectedModel} failed with ${status}. Auto-switching to next model...`);
          currentModelIndex = (currentModelIndex + 1) % available.length;
          modelRetries++;
          
          if (modelRetries >= available.length) {
            Logger.error('[AI] All available models exhausted due to provider failures.');
            return null;
          }
          continue; // Try with the next model
        }

        Logger.error(`[AI] OpenRouter API failure (${status}):`, err);
        return null;
      }
    }
  }
}
