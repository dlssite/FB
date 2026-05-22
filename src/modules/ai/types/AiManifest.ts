export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export interface UserContext {
  userId: string;
  username: string;
  roles: string[];
  isAdmin: boolean;
  highestRole: string;
  timestamp: number;
  displayName?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  userContext?: UserContext;
  conversationId?: string;
}

export interface AiIntent {
  action: string;
  parameters: Record<string, any>;
}

export interface AiParameterSchema {
  type: 'string' | 'number' | 'boolean';
  description: string;
  required?: boolean;
}

export interface AiActionDefinition {
  action: string;
  description: string;
  parameters: Record<string, AiParameterSchema>;
  risk: RiskLevel;
  handler: (params: any, context: any) => Promise<{ executed: boolean; result: string }>;
}

export interface AiModuleManifest {
  moduleName: string;
  actions: AiActionDefinition[];
}
