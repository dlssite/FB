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
  const guildId = '1409095756438175816';
  const newTenant = process.env.TENANT_ID || 'sanctyr';
  
  console.log(`🔧 Updating guild ${guildId} to tenant: ${newTenant}`);
  
  try {
    const result = await prisma.guild_tenant_map.upsert({
      where: { guildId },
      update: { tenantId: newTenant },
      create: { guildId, tenantId: newTenant, createdAt: new Date() }
    });
    
    console.log(`✅ Guild mapping updated:`, result);
  } catch (error) {
    console.error('❌ Error updating guild mapping:', error);
  }
  
  await prisma.$disconnect();
}

fixGuildTenantMapping();
