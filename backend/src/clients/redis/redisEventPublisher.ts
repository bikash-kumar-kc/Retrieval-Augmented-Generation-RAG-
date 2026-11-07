import type { Redis } from "ioredis";
import {
  EventPublisher,
  EVENTS_CHANNEL,
  PipelineEvent,
} from "../../interface/eventPublisher.interface.js";

export class RedisEventPublisher implements EventPublisher {
  constructor(private readonly redis: Redis) {}

  async publish(event: PipelineEvent): Promise<void> {
    await this.redis.publish(EVENTS_CHANNEL, JSON.stringify(event));
  }
}

export interface Lock {
  release(): Promise<void>;
}

const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0`;

/** Per-document lock so two workers never process the same document at once. */
export class RedisLocks {
  constructor(private readonly redis: Redis) {}

  async acquire(key: string, ttlMs: number): Promise<Lock | null> {
    const token = `${process.pid}:${Math.random().toString(36).slice(2)}`;
    const fullKey = `lock:${key}`;
    const ok = await this.redis.set(fullKey, token, "PX", ttlMs, "NX");
    if (ok !== "OK") return null;
    return {
      release: async () => {
        await this.redis.eval(RELEASE_SCRIPT, 1, fullKey, token);
      },
    };
  }
}
