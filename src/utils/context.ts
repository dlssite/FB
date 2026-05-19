import { AsyncLocalStorage } from 'async_hooks';

interface TenantContext {
  tenantId: string;
  guildId: string;
  lang: string;
}

export const tenantStorage = new AsyncLocalStorage<TenantContext>();

export function getTenantContext(): TenantContext {
  const context = tenantStorage.getStore();
  if (!context) {
    throw new Error('Tenant context is missing! Are you outside of an interaction lifecycle?');
  }
  return context;
}
