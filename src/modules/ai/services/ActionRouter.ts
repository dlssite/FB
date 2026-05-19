import { AiActionDefinition, AiModuleManifest, RiskLevel, AiIntent } from '../types/AiManifest';

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
      return { executed: false, result: `Action "${intent.action}" is not supported.` };
    }

    const risk = def.risk;

    if (risk === RiskLevel.HIGH || risk === RiskLevel.MEDIUM) {
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
      return { executed: false, result: `Action "${intent.action}" no longer exists in the registry.` };
    }

    try {
      return await def.handler(intent.parameters, context);
    } catch (err: any) {
      return { executed: false, result: `Failed to execute ${intent.action}: ${err.message}` };
    }
  }
}
