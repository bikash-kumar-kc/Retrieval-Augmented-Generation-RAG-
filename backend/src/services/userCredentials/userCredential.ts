import { CredentialRepository } from "../../repository/credentials.repository.js";
import { SecretBox } from "../../security/security.js";
import { NonRetryableError } from "../../utils/error.js";

type Creds = Record<string, string>;
type CredsEntry = { creds: Creds; expiresAt: number };
type ClientEntry = { client: Promise<unknown>; expiresAt: number };

export class UserCredentials {
  private readonly userRecord = new Map<string, Map<string, CredsEntry>>();
  private readonly userClients = new Map<string, Map<string, ClientEntry>>();
  private readonly ttlMs: number;
  private readonly now: () => number;

  constructor(
    private readonly deps: {
      repo: CredentialRepository;
      box: SecretBox;
      ttlMs?: number;
      now?: () => number;
    },
  ) {
    this.ttlMs = deps.ttlMs ?? 5 * 60_000;
    this.now = deps.now ?? Date.now;
  }

  /** `validate` proves the key works BEFORE anything is stored. */
  async registerUserCredentials(
    userId: string,
    provider: string,
    creds: Creds,
    validate?: (c: Creds) => Promise<void>,
  ) {
    await validate?.(creds);
    await this.deps.repo.save(
      userId,
      provider,
      this.deps.box.seal(creds, aad(userId, provider)),
    );
    this.invalidate(userId, provider);
  }

  async getUserCredentials(userId: string, provider: string): Promise<Creds> {
    const hit = this.userRecord.get(userId)?.get(provider);
    if (hit && hit.expiresAt > this.now()) return hit.creds;

    const row = await this.deps.repo.load(userId, provider);
    if (!row)
      throw new NonRetryableError(
        `No ${provider} credentials saved for this account. Add them in settings.`,
      );
    const creds = this.deps.box.open(row.blob, aad(userId, provider));
    slot(this.userRecord, userId).set(provider, {
      creds,
      expiresAt: this.now() + this.ttlMs,
    });
    return creds;
  }

  /** Get-or-create. Concurrent callers share one creation because the *promise* is cached. */
  getUserClient<T>(
    userId: string,
    provider: string,
    factory: (c: Creds) => T | Promise<T>,
  ): Promise<T> {
    const hit = this.userClients.get(userId)?.get(provider);
    if (hit && hit.expiresAt > this.now()) return hit.client as Promise<T>;

    const client = this.getUserCredentials(userId, provider).then(factory);
    this.storeUserClient(userId, provider, client);
    client.catch(() => this.userClients.get(userId)?.delete(provider)); // never cache a failure
    return client;
  }

  private storeUserClient(
    userId: string,
    provider: string,
    client: Promise<unknown>,
  ) {
    slot(this.userClients, userId).set(provider, {
      client,
      expiresAt: this.now() + this.ttlMs,
    });
  }

  async removeUserCredentials(userId: string, provider: string) {
    await this.deps.repo.remove(userId, provider);
    this.invalidate(userId, provider);
  }

  invalidate(userId: string, provider: string) {
    this.userRecord.get(userId)?.delete(provider);
    this.userClients.get(userId)?.delete(provider);
  }
}

const aad = (userId: string, provider: string) => `${userId}:${provider}`;

function slot<V>(
  outer: Map<string, Map<string, V>>,
  userId: string,
): Map<string, V> {
  let inner = outer.get(userId);
  if (!inner) outer.set(userId, (inner = new Map()));
  return inner;
}
