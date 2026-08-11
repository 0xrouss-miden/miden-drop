import { customType, smallint, timestamp, pgTable, varchar } from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const encryptedDrops = pgTable("encrypted_drops", {
  locatorHash: varchar("locator_hash", { length: 64 }).primaryKey(),
  ciphertext: bytea("ciphertext").notNull(),
  nonce: bytea("nonce").notNull(),
  protocolVersion: smallint("protocol_version").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type EncryptedDropRecord = typeof encryptedDrops.$inferSelect;
