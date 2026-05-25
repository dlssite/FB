# Tenant Module - Multi-Tenant Management System

## Overview

The Tenant Module provides comprehensive multi-tenant management capabilities for the FBT bot system. It allows you to:

- **View all tenants** in the database
- **Get detailed tenant information** including metrics and configuration
- **List modules** and their tenant assignments
- **Switch modules** between different tenants
- **Manage tenant configurations** with admin commands

## Architecture

### Database Schema Additions

Three new tables have been added to support the tenant system:

1. **`module_tenant_config`** - Tracks module-to-tenant assignments
   - `moduleName`: The name of the module (e.g., "economy", "leveling")
   - `tenantId`: Which tenant this module is configured for
   - `isActive`: Whether the module is enabled for this tenant
   - `config`: JSON configuration specific to the module
   - Unique constraint: `(moduleName, tenantId)`

2. **`tenant_details`** - Enhanced tenant information
   - `tenantId`: Reference to the tenant
   - `description`: Tenant description
   - `metadata`: Additional metadata as JSON
   - `isVerified`: Whether the tenant is verified
   - `isPremium`: Whether the tenant has premium features
   - `totalGuilds`: Cached guild count
   - `totalUsers`: Cached user count
   - `customization`: Theme and branding settings as JSON

3. **`tenant_module_activity`** - Audit trail for module changes
   - `tenantId`: Which tenant
   - `moduleName`: Which module
   - `actionType`: "activated", "deactivated", "configured", "error"
   - `userId`: Who performed the action
   - `details`: Action details and results
   - `timestamp`: When the action occurred

### Service Layer

#### TenantService (Enhanced)
Located in `src/services/TenantService.ts`

**Key Methods:**

```typescript
// List all tenants
static async listAllTenants(): Promise<TenantInfo[]>

// Get tenant details
static async getTenantInfo(tenantId: string): Promise<TenantInfo | null>

// Get modules for a tenant
static async getTenantModules(tenantId: string): Promise<ModuleStatus[]>

// Assign module to tenant
static async setModuleTenant(
  moduleName: string,
  tenantId: string,
  isActive: boolean = true,
  config?: Record<string, any>
): Promise<ModuleStatus | null>

// Get which tenant a module uses
static async getModuleTenant(moduleName: string, defaultTenantId?: string): Promise<string | null>

// Get module statistics
static async getModuleStatistics(): Promise<Map<...>>

// Log activity
static async logModuleActivity(tenantId, moduleName, actionType, userId?, details?)
```

#### TenantContextManager (New)
Located in `src/modules/tenant/services/TenantContextManager.ts`

Provides runtime tenant resolution for modules:

```typescript
// Get active tenant for a module
static async getModuleTenant(moduleName: string, defaultTenantId?: string): Promise<string>

// Get tenant for a guild (module-aware)
static async getTenantForGuild(guildId: string, moduleName?: string): Promise<string>

// Refresh caches
static async refreshModuleCache(): Promise<void>

// Invalidate specific module cache
static invalidateModuleCache(moduleName: string): void
```

## Commands

### /tenant list
Lists all tenants in the database with basic information.

**Output includes:**
- Tenant name and ID
- Number of guilds
- Number of active modules
- Creation date
- Verification and premium status

### /tenant info [tenant]
Get detailed information about a specific tenant (defaults to current tenant).

**Output includes:**
- Basic info (ID, name, owner)
- Statistics (guilds, modules, users)
- Timeline (created, updated)
- Description
- Recent activity

### /tenant modules [tenant]
List all modules and their tenant assignments.

**Modes:**
- Without filter: Overview of all modules with tenant counts
- With tenant filter: All modules for a specific tenant

### /tenant status
Show current tenant and guild status.

**Output includes:**
- Current tenant details
- Bot instance information
- Active modules list
- Metrics and configuration

### /tenant admin [subcommand]
Administrative commands (owner-only).

**Subcommands:**
- `create <id> <name> [owner]` - Create a new tenant
- `setmodule <module> <tenant> <active>` - Assign module to tenant
- `setstatus <tenant> [verified] [premium] [description]` - Update tenant status

## Usage Examples

### List all tenants
```
/tenant list
```

### Get current tenant info
```
/tenant info
```

### Switch a module to a different tenant
```
/tenant admin setmodule economy ember-prod true
```

### Create a new tenant
```
/tenant admin create staging-v2 "Staging Server V2" 123456789
```

### View modules for specific tenant
```
/tenant modules tenant:ember-prod
```

## Integration with Modules

### Using TenantContextManager in Your Module

When building commands or services, use TenantContextManager to get the correct tenant:

```typescript
import { TenantContextManager } from '../tenant/services/TenantContextManager';

// In your command/service:
export class MyModuleService {
  static async doSomething() {
    const tenantId = await TenantContextManager.getModuleTenant('mymodule');
    // Use tenantId for database queries
  }
}
```

### Module Configuration Pattern

When initializing a module service:

```typescript
import { TenantContextManager } from '../tenant/services/TenantContextManager';

export class MyService {
  static async initialize() {
    // Get the tenant this module is configured for
    const tenantId = await TenantContextManager.getModuleTenant(
      'mymodule',
      flamebornConfig.bot.tenant.id // fallback to default
    );

    // Initialize with correct tenant
    this.currentTenantId = tenantId;
    // ... rest of initialization
  }
}
```

### Listening to Tenant Changes

You can listen to the activity log to detect when a module's tenant changes:

```typescript
const history = await TenantService.getModuleActivityHistory(
  tenantId,
  'mymodule',
  50
);

const lastChange = history.find(h => h.actionType === 'configured');
if (lastChange) {
  // Module was reconfigured, refresh cache
  TenantContextManager.invalidateModuleCache('mymodule');
}
```

## Best Practices

### 1. Always Use TenantContextManager
Instead of hardcoding tenant IDs, use the context manager to get the current tenant:

```typescript
// ❌ Don't do this
const tenantId = flamebornConfig.bot.tenant.id;

// ✅ Do this
const tenantId = await TenantContextManager.getModuleTenant('economy');
```

### 2. Cache Tenant Decisions
TenantContextManager caches assignments with a 5-minute TTL to reduce database queries.

### 3. Audit Important Changes
Log module configuration changes:

```typescript
await TenantService.logModuleActivity(
  tenantId,
  'mymodule',
  'configured',
  userId,
  { oldTenant, newTenant, reason }
);
```

### 4. Handle Multi-Tenant Gracefully
When a module can serve multiple tenants, use module-level scoping:

```typescript
// Query only the current module's tenant data
const data = await prisma.someTable.findMany({
  where: {
    tenantId: await TenantContextManager.getModuleTenant('mymodule'),
  }
});
```

## Migration Guide

### For Existing Installations

1. **Run the Prisma migration:**
   ```bash
   npm run generate
   npm run migrate
   ```

2. **Update your bot configuration:**
   - Enable the tenant module in `flamebornConfig.modules.tenant.active = true`

3. **Initialize existing modules (optional):**
   ```typescript
   // Seed module assignments for existing modules
   for (const moduleName of Object.keys(flamebornConfig.modules)) {
     await TenantService.setModuleTenant(
       moduleName,
       flamebornConfig.bot.tenant.id,
       flamebornConfig.modules[moduleName].active
     );
   }
   ```

4. **Restart the bot and verify:**
   ```
   /tenant status
   /tenant list
   ```

## Troubleshooting

### Modules not appearing in /tenant modules
- Check if the module is enabled in config: `flamebornConfig.modules.[module].active`
- Run `/tenant admin setmodule [module] [tenant] true` to add it

### Tenant context not switching
- Clear the cache: `TenantContextManager.invalidateModuleCache('modulename')`
- Check the activity log: `/tenant info [tenant]`
- Verify the module_tenant_config entry exists in the database

### Cache staleness
The cache expires after 5 minutes or can be manually refreshed:
```typescript
await TenantContextManager.refreshModuleCache();
```

## Performance Considerations

- **Caching**: Module assignments are cached for 5 minutes
- **Database Indexes**: Indexes on `(tenantId, moduleName)` optimize queries
- **Activity Log**: Keep audit logs trimmed using database maintenance jobs
- **Batch Operations**: When assigning multiple modules, batch them for efficiency

## Future Enhancements

Potential features to add:

1. **Module Quota Management** - Limit modules per tenant tier
2. **Dynamic Module Loading** - Load/unload modules at runtime
3. **Module Health Monitoring** - Track module errors per tenant
4. **Cross-Tenant Communication** - IPC between tenant modules
5. **Dashboard Integration** - Web UI for tenant management
6. **Activity Webhooks** - Send activity events to external services
7. **Module Dependency Tracking** - Manage module relationships

## Support

For issues or questions about the tenant module:
1. Check the command outputs with `/tenant status` and `/tenant info`
2. Review activity history: `/tenant info [tenant]`
3. Contact the bot development team with activity logs
