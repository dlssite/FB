export const manifest = {
  id: 'tenant',
  name: 'Tenant Management Module',
  version: '1.0.0',
  description: 'Multi-tenant management and module configuration system',
  author: 'Copilot',
  enabled: true,
  dependencies: [],
  commands: ['tenant'],
  events: [],
  database: {
    models: [
      'tenants',
      'guild_tenant_map',
      'tenant_modules'
    ]
  },
  features: {
    tenantManagement: true,
    moduleConfiguration: true,
    adminControls: true,
    tenantMetrics: true
  }
};
