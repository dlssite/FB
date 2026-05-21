import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from './src/database/client.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env.kai by default, or use DOTENV_FILE env variable
const envFile = process.env.DOTENV_FILE || path.join(__dirname, '.env.kai');
console.log(`📂 Loading env from: ${envFile}`);
dotenv.config({ path: envFile });

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
