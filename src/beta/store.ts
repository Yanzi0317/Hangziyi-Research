import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { BetaRecord } from "./contracts.ts";

// Storage is pluggable so the same app can run on a host with a disk
// (default JSONL files) or on a stateless host that forwards each record to
// an HTTPS collector you control. Both can be enabled together.
export interface BetaStore {
  readonly name: string;
  append(record: BetaRecord): Promise<void>;
  // Only file-backed stores can read; used by the export CLI and record checks.
  readAll?(): Promise<BetaRecord[]>;
}

export class FileStore implements BetaStore {
  readonly name = "file";
  constructor(readonly dir: string) {}
  private file(kind: BetaRecord["kind"]) {
    return path.join(this.dir, `${kind}.jsonl`);
  }
  async append(record: BetaRecord) {
    await mkdir(this.dir, { recursive: true });
    await appendFile(this.file(record.kind), JSON.stringify(record) + "\n", {
      mode: 0o600,
    });
  }
  async readAll() {
    const out: BetaRecord[] = [];
    for (const kind of ["run", "feedback"] as const) {
      let raw = "";
      try {
        raw = await readFile(this.file(kind), "utf8");
      } catch {
        continue;
      }
      for (const line of raw.split("\n")) {
        if (!line.trim()) continue;
        out.push(JSON.parse(line) as BetaRecord);
      }
    }
    return out;
  }
}

export class WebhookStore implements BetaStore {
  readonly name = "webhook";
  constructor(
    private readonly url: string,
    private readonly token?: string,
  ) {
    const u = new URL(url);
    if (u.protocol !== "https:")
      throw new Error("BETA_WEBHOOK_URL 必须使用 HTTPS。");
  }
  async append(record: BetaRecord) {
    const response = await fetch(this.url, {
      method: "POST",
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
      headers: {
        "Content-Type": "application/json",
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
      body: JSON.stringify(record),
    });
    if (!response.ok)
      throw new Error(`记录转发失败（HTTP ${response.status}）。`);
  }
}

export class MultiStore implements BetaStore {
  readonly name: string;
  constructor(private readonly stores: BetaStore[]) {
    this.name = stores.map((s) => s.name).join("+");
  }
  async append(record: BetaRecord) {
    await Promise.all(this.stores.map((s) => s.append(record)));
  }
  async readAll() {
    const file = this.stores.find((s) => s.readAll);
    return file?.readAll ? file.readAll() : [];
  }
}

export function betaEnabled() {
  return process.env.BETA_COLLECTION !== "off";
}

export function defaultStorageDir() {
  return path.resolve(
    process.cwd(),
    process.env.BETA_STORAGE_DIR || "data/beta-records",
  );
}

export function createStore(): BetaStore {
  const stores: BetaStore[] = [];
  if (process.env.BETA_STORAGE_DIR !== "none")
    stores.push(new FileStore(defaultStorageDir()));
  if (process.env.BETA_WEBHOOK_URL)
    stores.push(
      new WebhookStore(
        process.env.BETA_WEBHOOK_URL,
        process.env.BETA_WEBHOOK_TOKEN,
      ),
    );
  if (!stores.length) throw new Error("没有配置 Beta 记录存储。");
  return stores.length === 1 ? stores[0] : new MultiStore(stores);
}
