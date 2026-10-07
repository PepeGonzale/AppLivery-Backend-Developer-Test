import 'dotenv/config';

function readNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && value !== undefined && value !== '' ? parsed : fallback;
}

export const env = {
  /** The official suite targets http://localhost:8888, so 8888 is the default. */
  port: readNumber(process.env.PORT, 8888),
  mongoUri: process.env.MONGO_URI ?? 'mongodb://localhost:27017/yvh',
} as const;
