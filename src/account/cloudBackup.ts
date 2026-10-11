import type { AccountSnapshot } from "./types";

/** Must match Rust's PhoneApp wire capacity in account.rs. */
export const CLOUD_BACKUP_MAX_BYTES = 45_000;
/** A successful or failed attempt must not hammer the PhoneApp endpoint. */
export const CLOUD_BACKUP_MIN_INTERVAL_MS = 30_000;

export class CloudBackupSizeError extends Error {
  readonly code = "BACKUP_SIZE_LIMIT_EXCEEDED";

  constructor(readonly bytes: number) {
    super("BACKUP_SIZE_LIMIT_EXCEEDED");
    this.name = "CloudBackupSizeError";
  }
}

/**
 * Mirrors Rust's snapshot_to_phone_groups + serde_json serialization exactly.
 * Structural validation runs before writes, so every category member resolves
 * to a stock record here just as it does in the Rust HashMap lookup.
 */
type CloudBackupData = Pick<AccountSnapshot, "stocks" | "categories">;

export const cloudBackupPayload = (snapshot: CloudBackupData) => {
  const byId = new Map(snapshot.stocks.map((stock) => [stock.id, stock]));
  return snapshot.categories.map((category) => ({
    id: category.id,
    name: category.name,
    stocks: category.stockIds.flatMap((id) => {
      const stock = byId.get(id);
      return stock
        ? [{ symbol: stock.id, name: stock.name, price: "---", change: "0.0", isPositive: true }]
        : [];
    }),
  }));
};

export const cloudBackupPayloadBytes = (snapshot: CloudBackupData) =>
  new TextEncoder().encode(JSON.stringify(cloudBackupPayload(snapshot))).length;

export const canCloudBackup = (snapshot: CloudBackupData) =>
  cloudBackupPayloadBytes(snapshot) <= CLOUD_BACKUP_MAX_BYTES;

export const sameCloudBackupData = (
  left: CloudBackupData,
  right: CloudBackupData,
) => JSON.stringify(cloudBackupPayload(left)) === JSON.stringify(cloudBackupPayload(right));
