import { z } from 'zod';

export type RuntimeSchemaProvider = () => z.ZodTypeAny;

export function getRuntimeSchema(): z.ZodTypeAny {
  const g = globalThis as any;
  if (g && g.__TAIXU_SCHEMA__) {
    return g.__TAIXU_SCHEMA__;
  }
  return z.object({}).catchall(z.any());
}
