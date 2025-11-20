import { PrismaClient } from '@prisma/client';
const globalForPrisma = global as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: ['query', 'error', 'warn'],
});
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
export default prisma;
export async function testDatabaseConnection(): Promise<{ success: boolean; message?: string; error?: any }> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { success: true };
  } catch (error) {
    return { success: false, message: 'Database connection failed', error };
  }
}