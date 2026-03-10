import PgBoss from "pg-boss";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required for pg-boss");
}

export const boss = new PgBoss({
  connectionString,
  schema: "pgboss",
});

export const JOB_NAMES = {
  GENERATION: "generation",
} as const;

export async function startQueue(): Promise<void> {
  await boss.start();
  await boss.createQueue(JOB_NAMES.GENERATION).catch(() => undefined);
}

export async function stopQueue(): Promise<void> {
  await boss.stop();
}
