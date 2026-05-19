import { AiModuleManifest, RiskLevel } from '../ai/types/AiManifest';
import { FunService } from './services/FunService';

export const FunManifest: AiModuleManifest = {
  moduleName: 'fun',
  actions: [
    {
      action: 'tell_joke',
      description: 'Fetches and returns a random dad or programming joke.',
      risk: RiskLevel.LOW,
      parameters: {},
      handler: async () => {
        const joke = await FunService.getJoke();
        return { executed: true, result: joke };
      }
    },
    {
      action: 'tell_fact',
      description: 'Fetches and returns a random interesting or useless fact.',
      risk: RiskLevel.LOW,
      parameters: {},
      handler: async () => {
        const fact = await FunService.getFact();
        return { executed: true, result: fact };
      }
    },
    {
      action: 'generate_roast',
      description: 'Generates a lighthearted, safe roast for a specific user ID.',
      risk: RiskLevel.LOW,
      parameters: {
        userId: { type: 'string', description: 'The Discord user ID to roast.', required: true }
      },
      handler: async (params) => {
        const roast = await FunService.getRoast(params.userId);
        return { executed: true, result: roast };
      }
    },
    {
      action: 'solve_math',
      description: 'Safely evaluates a basic mathematical expression (e.g. 5 * 10 + 4).',
      risk: RiskLevel.LOW,
      parameters: {
        expression: { type: 'string', description: 'The equation to solve.', required: true }
      },
      handler: async (params) => {
        const result = FunService.evaluateMath(params.expression);
        return { executed: true, result: `The math result of ${params.expression} is ${result}.` };
      }
    }
  ]
};
