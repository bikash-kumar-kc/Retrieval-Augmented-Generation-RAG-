import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/** AES-256-GCM. `aad` binds a blob to its owner, so a row copied to another user won't decrypt. */
export class SecretBox {
  private readonly key: Buffer;
  constructor(base64Key: string) {
    this.key = Buffer.from(base64Key, "base64");
    if (this.key.length !== 32) throw new Error("CREDENTIALS_ENCRYPTION_KEY must be 32 bytes, base64-encoded");
  }
  seal(data: Record<string, string>, aad: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    cipher.setAAD(Buffer.from(aad));
    const ct = Buffer.concat([cipher.update(JSON.stringify(data), "utf8"), cipher.final()]);
    return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), ct.toString("base64")].join(".");
  }
  open(blob: string, aad: string): Record<string, string> {
    const [version, iv, tag, ct] = blob.split(".");
    if (version !== "v1" || !iv || !tag || !ct) throw new Error("Unsupported credential blob");
    const d = createDecipheriv("aes-256-gcm", this.key, Buffer.from(iv, "base64"));
    d.setAAD(Buffer.from(aad));
    d.setAuthTag(Buffer.from(tag, "base64"));
    return JSON.parse(Buffer.concat([d.update(Buffer.from(ct, "base64")), d.final()]).toString("utf8"));
  }
}