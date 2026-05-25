/**
 * Tenant Module - Main Export
 * 
 * This module provides multi-tenant management capabilities for the FBT bot.
 * 
 * Key Exports:
 * - TenantContextManager: Runtime tenant resolution for modules
 * - TenantService: Database operations for tenants
 * - tenantUtils: Helper functions for modules
 * 
 * Usage:
 * import { TenantContextManager, getModuleTenantId } from 'path/to/tenant/index';
 */

export { TenantContextManager } from './services/TenantContextManager';
export * from '../../utils/tenantUtils';
export type { TenantInfo, ModuleStatus } from '../../services/TenantService';
