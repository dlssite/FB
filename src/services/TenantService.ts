import { prisma } from '../database/client';
import { flamebornConfig } from '../config/flameborn.config';
import { Logger } from '../utils/logger';

export class TenantService {
  static async ensureTenant() {
    const tenantId = flamebornConfig.bot.tenant.id;
    const name = flamebornConfig.bot.tenant.name;

    Logger.info(`Ensuring tenant exists: ${tenantId} (${name})...`, 'TENANT' as any);

    try {
      const tenant = await prisma.tenants.upsert({
        where: { tenantId },
        update: { name },
        create: {
          tenantId,
          name,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      Logger.info(`Verified tenant: ${tenant.name}`, 'TENANT' as any);
      return tenant;
    } catch (error) {
      Logger.error(`Failed to ensure tenant:`, error);
      throw error;
    }
  }
}
