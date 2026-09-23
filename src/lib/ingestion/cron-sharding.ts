export const CRON_SHARD_COUNT = 16;

// Source IDs never change, so every sweep assigns each source to exactly one shard.
export function sourceShard(id: string): number {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index++) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % CRON_SHARD_COUNT;
}

export function kstDayStart(now: Date): string {
  const day = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  return new Date(`${day}T00:00:00+09:00`).toISOString();
}
