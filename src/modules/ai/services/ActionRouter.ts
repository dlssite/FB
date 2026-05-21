import { AiActionDefinition, AiModuleManifest, RiskLevel, AiIntent } from '../types/AiManifest';
import { Logger } from '../../../utils/logger';

export class ActionRouter {
  private static registry: Map<string, AiActionDefinition> = new Map();

  /**
   * Registers a module's AI capabilities
   */
  static register(manifest: AiModuleManifest) {
    for (const actionDef of manifest.actions) {
      this.registry.set(actionDef.action.toLowerCase(), actionDef);
    }
  }

  /**
   * Returns all registered actions for prompt building
   */
  static getActions(): AiActionDefinition[] {
    return Array.from(this.registry.values());
  }

  static getRiskLevel(action: string): RiskLevel {
    const normalizedAction = action.toLowerCase().replace(/\s+/g, '_');
    const def = this.registry.get(normalizedAction);
    return def ? def.risk : RiskLevel.LOW;
  }

  static async route(intent: AiIntent, context: any): Promise<any> {
    // Sanitize parameters (e.g., extract ID from mentions)
    if (intent.parameters?.userId) {
      const mentionMatch = intent.parameters.userId.match(/<@!?(\d+)>/);
      if (mentionMatch) {
        intent.parameters.userId = mentionMatch[1];
      } else {
        intent.parameters.userId = intent.parameters.userId.replace(/\D/g, '');
      }
    }

    const normalizedAction = intent.action.toLowerCase().replace(/\s+/g, '_');
    const def = this.registry.get(normalizedAction);

    if (!def) {
      Logger.warn(`[AI] Tool call attempted for unknown action: ${intent.action}`);
      return { executed: false, result: `Action "${intent.action}" is not supported.` };
    }

    const risk = def.risk;
    Logger.info(`[AI] Tool detected: ${def.action} (risk: ${risk}), params: ${JSON.stringify(intent.parameters)}`);

    if (risk === RiskLevel.HIGH || risk === RiskLevel.MEDIUM) {
      Logger.info(`[AI] Tool requires confirmation: ${def.action} (${risk} risk)`);
      return {
        requiresConfirmation: true,
        risk: risk,
        action: def.action,
        parameters: intent.parameters,
        message: risk === RiskLevel.HIGH 
          ? `I need explicit confirmation to execute this high-risk action: **${def.action}**.`
          : `Are you sure you want me to perform: **${def.action}**?`
      };
    }

    // LOW risk - Execute immediately
    return this.executeAction(intent, context);
  }

  public static async executeAction(intent: AiIntent, context: any) {
    const normalizedAction = intent.action.toLowerCase().replace(/\s+/g, '_');
    const def = this.registry.get(normalizedAction);

    if (!def) {
      Logger.warn(`[AI] Tool execution failed: action "${intent.action}" not found in registry`);
      return { executed: false, result: `Action "${intent.action}" no longer exists in the registry.` };
    }

    try {
      Logger.debug(`[AI] Executing tool: ${def.action}`);
      const result = await def.handler(intent.parameters, context);
      
      if (result.executed) {
        Logger.info(`[AI] Tool executed successfully: ${def.action}`);
      } else {
        Logger.warn(`[AI] Tool execution failed: ${def.action} - ${result.result}`);
      }
      
      return result;
    } catch (err: any) {
      Logger.error(`[AI] Tool execution error for ${intent.action}:`, err);
      return { executed: false, result: `Failed to execute ${intent.action}: ${err.message}` };
    }
  }
}
