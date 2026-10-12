import { ApiError } from "./api";
const calls = new Map<string, { count: number; expires: number }>();
export function limitAnalysis(userId: string) {
  const now = Date.now();
  for (const [id, item] of calls) if (item.expires <= now) calls.delete(id);
  const item = calls.get(userId) || { count: 0, expires: now + 10 * 60 * 1000 };
  if (item.count >= 30)
    throw new ApiError(
      429,
      "Analysis limit reached. Try again in ten minutes.",
    );
  item.count++;
  calls.set(userId, item);
}
