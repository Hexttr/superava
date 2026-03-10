import prismaClientModule from "@prisma/client";

const { PrismaClient } = prismaClientModule as {
  PrismaClient: new (options?: unknown) => any;
};

const globalForPrisma = globalThis as unknown as { prisma: any };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
