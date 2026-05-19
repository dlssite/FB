# Flameborn Cognitive Engine: AI Manifest Guide

The **AI Manifest** system allows any module (addon) to register its capabilities with the central AI engine. This enables the AI to "discover" and execute actions across the bot without needing hardcoded logic in the `AiService`.

## 📂 File Location
By convention, manifests should be located in your module folder:
`src/modules/[module_name]/ai.manifest.ts`

---

## 🏗️ Manifest Structure

An `AiModuleManifest` consists of a `moduleName` and an array of `actions`.

```typescript
import { AiModuleManifest, RiskLevel } from '../ai/types/AiManifest';

export const MyModuleManifest: AiModuleManifest = {
  moduleName: 'MyModule',
  actions: [
    {
      action: 'my_action_name',
      description: 'Describe what this action does so the AI knows when to use it.',
      risk: RiskLevel.LOW, // LOW, MEDIUM, or HIGH
      parameters: {
        paramName: { 
            type: 'string', 
            description: 'What is this parameter?', 
            required: true 
        }
      },
      handler: async (params, context) => {
        // Logic goes here
        // context contains: tenantId, guildId, channelId, userId, interaction
        return { executed: true, result: 'Action completed successfully!' };
      }
    }
  ]
};
```

### Risk Levels
- **LOW**: Informational or harmless actions (e.g., checking balance).
- **MEDIUM**: Actions with side effects (e.g., playing music, claiming daily).
- **HIGH**: Administrative or destructive actions (e.g., kicking users, setting balances).

---

## 🚀 Registration

Once you have created your manifest, you **must** register it in the `manifestLoader.ts` so the AI can find it.

1. Open `src/modules/ai/loaders/manifestLoader.ts`.
2. Import your manifest.
3. Add it to the `manifests` array.

```typescript
// src/modules/ai/loaders/manifestLoader.ts

import { MyModuleManifest } from '../../my_module/ai.manifest';

export async function loadAiManifests() {
  const manifests = [
    // ... other manifests
    MyModuleManifest
  ];
  
  // ... rest of the loader logic
}
```

---

## 💡 Best Practices

1. **Clear Descriptions**: The AI uses the `description` fields to decide which action to take. Be specific!
2. **Parameter Extraction**: The AI is good at extracting IDs and names. Use `description` to tell the AI if it should look for a User ID or a string.
3. **Context Usage**: Use the `context` object to enforce permissions. For example, if an action is `HIGH` risk, check `context.member.permissions` inside the handler.
4. **Return Results**: The `result` string you return from the handler is what the AI will see. It will then use that information to formulate its final response to the user.

---

## 🛠️ Example: Simple Balance Check

```typescript
{
  action: 'get_balance',
  description: 'Checks the Embers balance of a user.',
  risk: RiskLevel.LOW,
  parameters: {
    userId: { type: 'string', description: 'The ID of the user to check.', required: false }
  },
  handler: async (params, context) => {
    const targetId = params.userId || context.userId;
    const balance = await MyService.getBalance(context.tenantId, targetId);
    return { executed: true, result: `<@${targetId}> has ${balance} Embers.` };
  }
}
```
