import 'dotenv/config';
import { prisma } from './src/database/client.ts';

async function fixGuildTenantMapping() {
  const newTenant = process.env.TENANT_ID || 'sanctyr';
  
  console.log(`🔧 Fixing guild_tenant_map to use tenant: ${newTenant}`);
  
  try {
    const result = await prisma.guild_tenant_map.updateMany({
      where: {},
      data: { tenantId: newTenant }
    });
    
    console.log(`✅ Updated ${result.count} guild mappings to tenant: ${newTenant}`);
  } catch (error) {
    console.error('❌ Error updating guild mappings:', error);
  }
  
  await prisma.$disconnect();
}

fixGuildTenantMapping();
