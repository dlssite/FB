import { PrismaClient } from '@prisma/client';
import { flamebornConfig } from '../config/flameborn.config';

export const prisma = new PrismaClient({
  log: flamebornConfig.database.logging,
});
