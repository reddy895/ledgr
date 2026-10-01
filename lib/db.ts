import Database from "better-sqlite3";
import { CREATE_TABLES, SEED_CATEGORIES } from "./schema";
import { runMigrations } from "./migrations";
import { getDatabasePaths } from "./data-directory";
import { refreshExchangeRates } from "./exchange-rates";

let db: Database.Database;

export function sqlPlaceholders(count: number, separator = ","): string {
  return Array.from({ length: count }, () => "?").join(separator);
}

export function getDb(): Database.Database {
  if (!db) {
    const { databasePath } = getDatabasePaths();
    let connection: Database.Database;
    try {
      connection = new Database(databasePath);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`Could not open database "${databasePath}": ${detail}`);
    }

    try {
      connection.pragma("journal_mode = WAL");
      connection.pragma("foreign_keys = ON");
      connection.transaction(() => {
        connection.exec(CREATE_TABLES);
        connection.exec(SEED_CATEGORIES);
      })();
      runMigrations(connection);
    } catch (error) {
      connection.close();
      throw error;
    }

    db = connection;

    // Refresh exchange rates in the background on first startup
    refreshExchangeRates(db).catch((e) =>
      console.error("[exchange-rates] Background refresh failed:", e)
    );
  }
  return db;
}
