import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { config } from "./config.js";
import type { HubStore } from "./types.js";

const STORE_FILE = "hub-store.json";

function emptyStore(): HubStore {
  return {
    plans: [],
    posts: [],
    bandit: {},
    trends: [],
    hashtagStats: {},
    meta: { createdAt: new Date().toISOString() },
  };
}

function storePath(): string {
  return resolve(join(config.dataDir, STORE_FILE));
}

export async function loadStore(): Promise<HubStore> {
  const path = storePath();
  if (!existsSync(path)) return emptyStore();
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw) as Partial<HubStore>;
    return { ...emptyStore(), ...parsed };
  } catch {
    return emptyStore();
  }
}

export async function saveStore(store: HubStore): Promise<void> {
  await mkdir(resolve(config.dataDir), { recursive: true });
  await writeFile(storePath(), JSON.stringify(store, null, 2), "utf8");
}

/** Read-modify-write helper that keeps the on-disk store consistent. */
export async function withStore<T>(fn: (s: HubStore) => T | Promise<T>): Promise<T> {
  const store = await loadStore();
  const result = await fn(store);
  await saveStore(store);
  return result;
}
