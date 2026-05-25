# Tenant System Integration Guide for Modules

## Quick Start - 5 Minute Integration

### Step 1: Update Your Service Initialize

In your module's service initialization (usually called from `src/index.ts`), add tenant context:

```typescript
// Before (old way)
export class MyModuleService {
  static async initialize() {
    const guildSettings = await prisma.guild_settings.findMany();
    // ... rest of init
  }
}

// After (with tenant)
import { getModuleTenantId, registerModuleWithTenant } from '../utils/tenantUtils';

export class MyModuleService {
  private static currentTenantId: string;

  static async initialize() {
    // Register with tenant system
    await registerModuleWithTenant('mymodule');
    
    // Get the tenant ID for this module
    this.currentTenantId = await getModuleTenantId('mymodule');
    
    const guildSettings = await prisma.guild_settings.findMany({
      where: { tenantId: this.currentTenantId }
    });
    // ... rest of init
  }

  static getCurrentTenant() {
    return this.currentTenantId;
  }
}
```

### Step 2: Update Database Queries

Add `tenantId` filter to all queries:

```typescript
// Before
const user = await prisma.users.findUnique({
  where: { id: userId }
});

// After
const user = await prisma.users.findUnique({
  where: { 
    id_tenantId: {
      id: userId,
      tenantId: MyModuleService.getCurrentTenant()
    }
  }
});

// Or simpler with where clause
const data = await prisma.someTable.findMany({
  where: {
    tenantId: await getModuleTenantId('mymodule'),
    guildId: interaction.guildId
  }
});
```

### Step 3: Update Command Handlers

Make sure commands respect the tenant context:

```typescript
export default {
  data: ...,
  async execute(interaction: ChatInputCommandInteraction) {
    const tenantId = await getModuleTenantId('mymodule');
    
    // All your queries now use this tenantId
    const data = await prisma.someTable.findUnique({
      where: {
        tenantId,
        guildId: interaction.guildId
      }
    });
    
    // ... rest of handler
  }
};
```

## Complete Example: Economy Module Migration

### Before (Single Tenant)

```typescript
// src/modules/economy/services/EconomyService.ts
export class EconomyService {
  static async getBalance(userId: string, guildId: string) {
    return await prisma.economy_accounts.findUnique({
      where: { userId_guildId: { userId, guildId } }
    });
  }

  static async addBalance(userId: string, guildId: string, amount: number) {
    return await prisma.economy_accounts.update({
      where: { userId_guildId: { userId, guildId } },
      data: { balance: { increment: amount } }
    });
  }
}
```

### After (Multi-Tenant)

```typescript
// src/modules/economy/services/EconomyService.ts
import { getModuleTenantId, registerModuleWithTenant } from '../../../utils/tenantUtils';

export class EconomyService {
  private static currentTenant: string;

  static async initialize() {
    await registerModuleWithTenant('economy');
    this.currentTenant = await getModuleTenantId('economy');
    Logger.info(`Economy service initialized for tenant: ${this.currentTenant}`);
  }

  static async getBalance(userId: string, guildId: string) {
    return await prisma.economy_accounts.findUnique({
      where: {
        userId_guildId_tenantId: { 
          userId,
          guildId,
          tenantId: this.currentTenant
        }
      }
    });
  }

  static async addBalance(userId: string, guildId: string, amount: number) {
    return await prisma.economy_accounts.update({
      where: {
        userId_guildId_tenantId: {
          userId,
          guildId,
          tenantId: this.currentTenant
        }
      },
      data: { balance: { increment: amount } }
    });
  }
}
```

### Update the Command Handler

```typescript
// src/modules/economy/commands/balance.ts
import { getModuleTenantId } from '../../../utils/tenantUtils';

export default {
  data: ...,
  async execute(interaction: ChatInputCommandInteraction) {
    const tenantId = await getModuleTenantId('economy');
    const userId = interaction.options.getString('user');

    // Pass tenantId to queries
    const account = await prisma.economy_accounts.findUnique({
      where: {
        userId_guildId_tenantId: {
          userId,
          guildId: interaction.guildId,
          tenantId
        }
      }
    });

    if (!account) {
      return await replyV2(interaction, 
        ContainerService.simple('No account found')
      );
    }

    await replyV2(interaction,
      ContainerService.create({
        title: 'Balance',
        description: `Balance: ${account.balance}`,
        interaction
      })
    );
  }
};
```

## Advanced: Dynamic Tenant Switching

### Use Case: Admin Command to Switch Tenant for a Module

```typescript
// In your admin command handler
import { TenantService } from '../../services/TenantService';

export default {
  data: ...,
  async execute(interaction: ChatInputCommandInteraction) {
    const moduleName = interaction.options.getString('module');
    const newTenantId = interaction.options.getString('tenant');

    // Switch the module to the new tenant
    const result = await TenantService.setModuleTenant(
      moduleName,
      newTenantId,
      true
    );

    if (result) {
      // Invalidate cache so next call uses new tenant
      TenantContextManager.invalidateModuleCache(moduleName);
      
      // Restart service (optional, depends on your architecture)
      // await MyModuleService.reinitialize();

      await replyV2(interaction, 
        ContainerService.simple(
          `✅ Switched ${moduleName} to tenant ${newTenantId}`
        )
      );
    }
  }
};
```

## Background Workers with Tenants

### Pattern: Tenant-Aware Cron Job

```typescript
// src/modules/economy/workers/minerWorker.ts
import { getModuleTenantId, logModuleAction } from '../../../utils/tenantUtils';
import { TenantService } from '../../../services/TenantService';

export async function startMiningWorker() {
  const moduleName = 'economy';

  // Get all active tenants
  const tenants = await TenantService.listAllTenants();

  setInterval(async () => {
    for (const tenant of tenants) {
      try {
        const modules = await TenantService.getTenantModules(tenant.tenantId);
        const economyModule = modules.find(m => m.moduleName === moduleName);

        if (!economyModule?.isActive) continue;

        // Mine for this specific tenant
        const miningAccounts = await prisma.mining_sessions.findMany({
          where: {
            tenantId: tenant.tenantId,
            completedAt: null
          }
        });

        for (const session of miningAccounts) {
          // Process mining completion
          await EconomyService.completeMiningSesh(session);
        }

        await logModuleAction(moduleName, 'mining_cycle_completed', undefined, {
          tenant: tenant.tenantId,
          sessionsProcessed: miningAccounts.length
        });
      } catch (error) {
        await logModuleAction(moduleName, 'error', undefined, {
          tenant: tenant.tenantId,
          error: error.message
        });
      }
    }
  }, 60000); // Run every minute
}
```

## Testing Tenant Isolation

```typescript
// Example test to verify tenant isolation
async function testTenantIsolation() {
  // Create two tenants
  const tenant1 = await TenantService.createTenant('test-1', 'Test Tenant 1');
  const tenant2 = await TenantService.createTenant('test-2', 'Test Tenant 2');

  // Assign module to tenant1
  await TenantService.setModuleTenant('economy', tenant1.tenantId, true);

  // Assign module to tenant2
  await TenantService.setModuleTenant('economy', tenant2.tenantId, true);

  // Create data in tenant1
  await prisma.economy_accounts.create({
    data: {
      tenantId: tenant1.tenantId,
      guildId: '111',
      userId: 'user1',
      balance: 100
    }
  });

  // Create data in tenant2
  await prisma.economy_accounts.create({
    data: {
      tenantId: tenant2.tenantId,
      guildId: '222',
      userId: 'user1',
      balance: 200
    }
  });

  // Verify isolation - same user, different tenants, different balances
  const tenant1Account = await prisma.economy_accounts.findUnique({
    where: {
      userId_guildId_tenantId: { userId: 'user1', guildId: '111', tenantId: tenant1.tenantId }
    }
  });

  const tenant2Account = await prisma.economy_accounts.findUnique({
    where: {
      userId_guildId_tenantId: { userId: 'user1', guildId: '222', tenantId: tenant2.tenantId }
    }
  });

  console.assert(tenant1Account.balance === 100, 'Tenant1 balance isolation failed');
  console.assert(tenant2Account.balance === 200, 'Tenant2 balance isolation failed');
  console.log('✅ Tenant isolation verified');
}
```

## Common Patterns

### Pattern 1: Cached Tenant Context

```typescript
export class CachedModuleService {
  private static tenantCache: string | null = null;
  private static lastFetch = 0;
  private static CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  static async getTenant() {
    const now = Date.now();
    if (this.tenantCache && (now - this.lastFetch) < this.CACHE_TTL) {
      return this.tenantCache;
    }

    this.tenantCache = await getModuleTenantId('mymodule');
    this.lastFetch = now;
    return this.tenantCache;
  }
}
```

### Pattern 2: Tenant-Aware Repository

```typescript
export class MyModuleRepository {
  constructor(private tenantId: string) {}

  async findUser(userId: string) {
    return await prisma.users.findUnique({
      where: { id_tenantId: { id: userId, tenantId: this.tenantId } }
    });
  }

  async findByGuild(guildId: string) {
    return await prisma.someTable.findMany({
      where: { guildId, tenantId: this.tenantId }
    });
  }

  static async create(tenantId: string) {
    return new MyModuleRepository(tenantId);
  }
}

// Usage
const repo = await MyModuleRepository.create(await getModuleTenantId('mymodule'));
const user = await repo.findUser('userId');
```

### Pattern 3: Event Listeners with Tenants

```typescript
export class MyModuleEventHandler {
  @EventListener('messageCreate')
  async onMessage(message: Message) {
    if (message.author.bot) return;

    const tenantId = await getModuleTenantId('mymodule');

    // Only process for this module's tenant
    const guildTenant = await prisma.guild_tenant_map.findUnique({
      where: { guildId: message.guildId }
    });

    if (guildTenant?.tenantId !== tenantId) return;

    // Process message...
  }
}
```

## Checklist for Module Migration

- [ ] Add `tenantId` field to all database queries
- [ ] Call `registerModuleWithTenant()` during initialization
- [ ] Store tenant ID in service or use `getModuleTenantId()` dynamically
- [ ] Update all Prisma queries to include tenantId in WHERE clause
- [ ] Update command handlers to use tenant context
- [ ] Update event listeners to respect tenant boundaries
- [ ] Update background workers to iterate over tenants
- [ ] Add logging with `logModuleAction()`
- [ ] Test with multiple tenants
- [ ] Update README/documentation

## Rollback Plan

If you need to rollback to single-tenant:

1. Remove `tenantId` filter from queries
2. Use default tenant ID everywhere
3. Comment out `registerModuleWithTenant()` calls
4. The system will continue to work, just with one tenant per module

## Support

For questions or issues:
1. Check the main [Tenant Module README](./README.md)
2. Run `/tenant status` to verify module registration
3. Check activity logs: `/tenant info [module-tenant]`
