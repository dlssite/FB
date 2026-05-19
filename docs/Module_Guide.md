# 🛠️ Flameborn Ecosystem (FBT) — Module Development Guide

Welcome to the Flameborn prototype ecosystem! This guide is designed for developers creating new modules for the `fbt` bot. Flameborn uses a modular, dynamically loaded architecture designed for multi-tenant scalability, rapid dashboard integration, and high-fidelity Discord UI (Components V2).

---

## 📂 1. Standard Module Structure

All modules live inside `src/modules/<module_name>`. A complete, dashboard-ready module follows this exact structure:

```text
src/modules/example_module/
├── commands/               # Discord Slash Commands
│   ├── example/            # Command Group (Master Command)
│   │   ├── _command.ts     # The Master Router (Required)
│   │   ├── info.ts         # Subcommand: /example info
│   │   └── manage.ts       # Subcommand: /example manage
├── events/                 # Discord Event Listeners
│   └── interactionCreate.ts
├── services/               # Core Business Logic
│   └── ExampleService.ts
├── database/               # Prisma Wrappers & Queries
│   └── ExampleRepository.ts
├── lang/                   # Localization Files
│   ├── en.json
│   └── fr.json
├── api.ts                  # Dashboard REST API (Hono)
└── aliases.ts              # Prefix Command Mappings
```

---

## ⚙️ 2. Registration & Configuration

Before your module is loaded, it **must** be registered in the central configuration file: `src/config/flameborn.config.ts`.

Add your module to the `modules` object:
```typescript
example_module: {
  active: true, // Set to false to entirely disable the module at startup
  name: 'Example System',
  description: 'An example module for demonstration.',
  emoji: '🧪'
}
```
*Note: This metadata is automatically fetched by the Mothership and Dashboard.*

---

## ⌨️ 3. Commands & Prefix Architecture

Flameborn uses a **Master Command / Subcommand** architecture to keep the global command limit low while packing in functionality.

### The Master Command (`_command.ts`)
This file registers the base slash command. The core `commandLoader` automatically mounts subcommands to it.

```typescript
// src/modules/example_module/commands/example/_command.ts
import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('example')
    .setDescription('🧪 Master command for the example module.'),
  
  async execute() {
    // Execution is automatically handled and routed by the commandLoader
  }
};
```

### Subcommands (`info.ts`)
```typescript
// src/modules/example_module/commands/example/info.ts
import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('info')
       .setDescription('View example info.'),

  async execute(interaction: ChatInputCommandInteraction) {
    // Important: Commands are auto-deferred by the loader!
    await interaction.editReply({ content: "Hello from the example module!" });
  }
};
```

### Prefix Support (`aliases.ts`)
We support legacy prefix commands (`!example`) by mapping them directly to our slash command paths using `master:group:sub` syntax.

```typescript
// src/modules/example_module/aliases.ts
export const exampleAliases = {
  'ex': 'example:info',
  'example': 'example:info',
  'setex': 'example:manage'
};
```
*When a user types `!ex`, the `prefixHandler` translates it and executes the `/example info` subcommand, injecting arguments positionally.*

---

## 🌐 4. Context & Multi-Tenancy (Crucial)

Flameborn is a **multi-tenant** system. You must **never** assume a direct relationship between a `guildId` and a database record without the `tenantId`.

Context is passed automatically via `AsyncLocalStorage` in the command and event lifecycle.

```typescript
import { tenantStorage } from '../../../utils/context';

export default {
  // ... inside a command execute() or event execute() ...
  async execute(interaction) {
    const context = tenantStorage.getStore();
    if (!context) return; // Failsafe

    const { tenantId, guildId, lang } = context;

    // Use tenantId in ALL database queries:
    const data = await prisma.example_table.findUnique({
      where: {
        guildId_tenantId: { guildId, tenantId }
      }
    });
  }
};
```

**What if context is missing?** (e.g., inside an un-wrapped button interaction):
```typescript
import { RoutingService } from '../../../services/RoutingService';

const tenantId = await RoutingService.resolveTenantId(interaction.guildId, 'example_module');
```

---

## 📡 5. Dashboard API Integration (`api.ts`)

Every module can expose a REST API that is automatically mounted to the main web server at `/api/<module_name>`. We use **Hono** for speed and minimal overhead.

```typescript
// src/modules/example_module/api.ts
import { Hono } from 'hono';
import { prisma } from '../../database/client';

const app = new Hono();

// Route: GET /api/example_module/stats?tenantId=...&guildId=...
app.get('/stats', async (c) => {
  const tenantId = c.req.query('tenantId');
  const guildId = c.req.query('guildId');
  
  if (!tenantId || !guildId) return c.json({ error: 'Missing parameters' }, 400);

  const count = await prisma.example_table.count({ where: { tenantId, guildId } });
  
  return c.json({ status: 'active', totalExamples: count });
});

export default app; // MUST export default app
```

---

## 🌍 6. Localization (Lang System)

Never hardcode user-facing text. Use the `Translator` service and language JSON files.

**JSON File (`lang/en.json`)**:
```json
{
  "greetings": {
    "hello": "Hello {{user}}, welcome to the matrix!"
  }
}
```

**Usage**:
```typescript
import { Translator } from '../../../core/Translator';
// Assuming `lang` is retrieved from tenantStorage.getStore()

const text = Translator.t('example_module', 'greetings.hello', lang, { user: interaction.user.username });
```

---

## 🎨 7. UI: Discord Containers V2

Flameborn uses Discord's new Component V2 architecture. **Do not use standard embeds.** Use the `ContainerService`.

```typescript
import { ContainerService } from '../../../utils/container';

const response = ContainerService.create({
  title: 'My Module UI',
  description: 'This uses the high-fidelity container system.',
  color: '#FF0000', // Hex or integer
  thumbnail: interaction.user.displayAvatarURL(),
  fields: [
    { name: 'Stat 1', value: '100' }
  ],
  footer: true, // Automatically adds branding
  interaction // Required if footer: true
});

// IMPORTANT: editReply MUST be cast as `any` due to d.js types not fully supporting V2 yet
await interaction.editReply(response as any);
```
> **⚠️ WARNING:** When using `ContainerService` (which sets `MessageFlags.IsComponentsV2`), you **cannot** pass a root-level `content` string to the message. Doing so triggers a `50035 Invalid Form Body` error. All text must be inside the Container components!

---

## 📝 8. Standard Terminal Logger

Do not use `console.log`. Use the standardized `Logger` to ensure outputs are formatted and categorized.

```typescript
import { Logger } from '../../../utils/logger';

// General Info
Logger.info('Task completed successfully.');

// Loaders (Bootstrapping)
Logger.loader('[EXAMPLE] Loaded 5 commands.');

// Errors (Automatically parses stack traces)
Logger.error('Failed to connect to database', err);

// Tenant specific
Logger.tenant(tenantId, `Settings updated for guild ${guildId}`);
```

---

## ⚡ 9. Global State & Caching (Redis)

Flameborn is designed to run across multiple shards and containers. To ensure consistent behavior and high performance, we use **Redis** for all ephemeral state and frequent configuration lookups.

### 🔑 Key Principles
1. **Never use local `Map` for state**: Local variables are not shared across shards.
2. **Cache frequently read settings**: Settings like `leveling_settings` or `automod_settings` should be cached in Redis to prevent excessive database load.
3. **Use Distributed Locks**: If a task (like a background worker) should only run on one shard at a time, use `RedisService.acquireLock`.

### Implementation Examples

**Caching Settings in a Repository:**
```typescript
import { RedisService } from '../../../services/RedisService';

static async getSettings(tenantId: string, guildId: string) {
  const cacheKey = `settings:module_name:${tenantId}:${guildId}`;
  
  // 1. Check Cache
  const cached = await RedisService.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // 2. Fetch from DB
  const settings = await prisma.module_settings.findUnique({ ... });

  // 3. Save to Redis
  if (settings) {
    await RedisService.set(cacheKey, JSON.stringify(settings), 300); // 5 min TTL
  }
  return settings;
}
```

**Invalidating Cache on Update:**
```typescript
static async updateSettings(tenantId: string, guildId: string, data: any) {
  const result = await prisma.module_settings.update({ ... });
  
  // Clear Redis cache immediately
  await RedisService.del(`settings:module_name:${tenantId}:${guildId}`);
  
  return result;
}
```

### Global Redis Invalidation
When settings are updated via the Dashboard, the **Mothership** sends a `remote:guild_update` signal to the fleet. Ensure your module's Repository implements an `invalidateCache` method and is registered in `src/network/mothership.ts`.

---

## 🚀 Final Checklist for a New Module
1. [ ] Folder created in `src/modules/`.
2. [ ] Registered in `flameborn.config.ts`.
3. [ ] `_command.ts` router created.
4. [ ] `aliases.ts` created for Prefix command support.
5. [ ] `api.ts` created and exporting a Hono instance for the Dashboard.
6. [ ] `lang/en.json` created for localization.
7. [ ] All DB queries utilize `tenantId`.
8. [ ] **Frequently accessed settings are cached in Redis.**
9. [ ] UI utilizes `ContainerService`.

