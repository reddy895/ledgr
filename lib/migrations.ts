import type Database from "better-sqlite3";

export type Migration = {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
};

function addColumnIfMissing(
  db: Database.Database,
  table: string,
  column: string,
  definition: string
): void {
  const existingColumns = db.pragma(`table_info("${table}")`) as {
    name: string;
  }[];
  if (!existingColumns.some((existing) => existing.name === column)) {
    db.exec(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${definition}`);
  }
}

function createImportsTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS imports (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      filename    TEXT    NOT NULL,
      account_id  INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      count       INTEGER NOT NULL,
      imported_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

function createHoldingsTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS holdings (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id         INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      ticker             TEXT    NOT NULL,
      name               TEXT    NOT NULL,
      shares             REAL    NOT NULL,
      avg_cost_per_share REAL    NOT NULL,
      currency           TEXT    NOT NULL DEFAULT 'USD',
      created_at         TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

function createTagsTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      color      TEXT,
      icon       TEXT,
      is_system  INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.exec("INSERT OR IGNORE INTO tags (id, name, color, icon, is_system) VALUES (1, 'Transfer', '#6B8CAE', NULL, 1)");
  db.exec("INSERT OR IGNORE INTO tags (id, name, color, icon, is_system) VALUES (2, 'Owed by parents', '#C49A3C', NULL, 1)");
  db.exec("INSERT OR IGNORE INTO tags (id, name, color, icon, is_system) VALUES (3, 'Needs review', '#E07B4F', NULL, 1)");
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: "account_and_transaction_fields",
    up(db) {
      addColumnIfMissing(db, "accounts", "currency", "TEXT NOT NULL DEFAULT 'CHF'");
      addColumnIfMissing(db, "accounts", "color", "TEXT NOT NULL DEFAULT '#6366f1'");
      addColumnIfMissing(db, "accounts", "initial_balance", "REAL NOT NULL DEFAULT 0");
      addColumnIfMissing(db, "transactions", "reimbursable", "INTEGER NOT NULL DEFAULT 0");
      db.exec("UPDATE categories SET parent_id = NULL, color = '#3b82f6' WHERE id = 5");
      addColumnIfMissing(db, "transactions", "category", "TEXT NOT NULL DEFAULT ''");
      addColumnIfMissing(
        db,
        "transactions",
        "linked_transaction_id",
        "INTEGER REFERENCES transactions(id) ON DELETE SET NULL"
      );
      addColumnIfMissing(db, "transactions", "needs_review", "INTEGER NOT NULL DEFAULT 0");
      addColumnIfMissing(db, "accounts", "exchange_rate", "REAL NOT NULL DEFAULT 1.0");
    },
  },
  {
    version: 2,
    name: "imports_and_holdings",
    up(db) {
      createImportsTable(db);
      addColumnIfMissing(
        db,
        "transactions",
        "import_id",
        "INTEGER REFERENCES imports(id) ON DELETE SET NULL"
      );
      createHoldingsTable(db);
      db.exec("CREATE INDEX IF NOT EXISTS idx_holdings_account_id ON holdings(account_id)");
      addColumnIfMissing(db, "transactions", "ticker", "TEXT NOT NULL DEFAULT ''");
      addColumnIfMissing(db, "transactions", "shares", "REAL NOT NULL DEFAULT 0");
      addColumnIfMissing(db, "holdings", "isin", "TEXT NOT NULL DEFAULT ''");
      addColumnIfMissing(db, "holdings", "current_price", "REAL");
      addColumnIfMissing(db, "holdings", "price_updated_at", "TEXT");
    },
  },
  {
    version: 3,
    name: "category_hierarchy_and_tags",
    up(db) {
      addColumnIfMissing(db, "categories", "icon", "TEXT");
      db.exec(`
        INSERT INTO categories (name, parent_id, is_system)
        SELECT 'Income', 1, 0
        WHERE NOT EXISTS (
          SELECT 1 FROM categories WHERE parent_id = 1 AND name = 'Income' AND is_system = 0
        )
      `);
      db.exec(`
        UPDATE categories
        SET parent_id = (
          SELECT id FROM categories
          WHERE parent_id = 1 AND name = 'Income' AND is_system = 0 LIMIT 1
        )
        WHERE id IN (6, 7, 27) AND parent_id = 1
      `);
      db.exec("UPDATE transactions SET category = 'Income: Salary' WHERE category = 'Salary'");
      db.exec("UPDATE transactions SET category = 'Income: Parents' WHERE category = 'Parents'");
      db.exec("UPDATE transactions SET category = 'Income: Miscellaneous' WHERE category = 'Miscellaneous'");
      db.exec(`
        INSERT INTO categories (name, parent_id, is_system)
        SELECT 'General', 3, 0
        WHERE NOT EXISTS (
          SELECT 1 FROM categories WHERE parent_id = 3 AND name = 'General' AND is_system = 0
        )
      `);
      db.exec(`
        UPDATE categories
        SET parent_id = (
          SELECT id FROM categories
          WHERE parent_id = 3 AND name = 'General' AND is_system = 0 LIMIT 1
        )
        WHERE id IN (14, 21, 41, 46) AND parent_id = 3
      `);
      db.exec("UPDATE transactions SET category = 'Needs: General: Groceries' WHERE category = 'Needs: Groceries'");
      db.exec("UPDATE transactions SET category = 'Needs: General: Phone' WHERE category = 'Needs: Phone'");
      db.exec("UPDATE transactions SET category = 'Needs: General: Miscellaneous' WHERE category = 'Needs: Miscellaneous'");
      db.exec("UPDATE transactions SET category = 'Needs: General: Personal Care' WHERE category = 'Needs: Personal Care'");
      db.exec(`
        INSERT INTO categories (name, parent_id, is_system)
        SELECT 'General', 4, 0
        WHERE NOT EXISTS (
          SELECT 1 FROM categories WHERE parent_id = 4 AND name = 'General' AND is_system = 0
        )
      `);
      db.exec(`
        UPDATE categories
        SET parent_id = (
          SELECT id FROM categories
          WHERE parent_id = 4 AND name = 'General' AND is_system = 0 LIMIT 1
        )
        WHERE id IN (33, 38, 40) AND parent_id = 4
      `);
      db.exec("UPDATE transactions SET category = 'Wants: General: Travel' WHERE category = 'Wants: Travel'");
      db.exec("UPDATE transactions SET category = 'Wants: General: Clothing' WHERE category = 'Wants: Clothing'");
      db.exec("UPDATE transactions SET category = 'Wants: General: Gifts' WHERE category = 'Wants: Gifts'");
      db.exec(`
        INSERT INTO categories (name, parent_id, is_system)
        SELECT 'Savings', 5, 0
        WHERE EXISTS (SELECT 1 FROM categories WHERE id = 10 AND parent_id = 5)
      `);
      db.exec(`
        UPDATE categories
        SET parent_id = (
          SELECT id FROM categories
          WHERE parent_id = 5 AND name = 'Savings' AND is_system = 0 ORDER BY id DESC LIMIT 1
        )
        WHERE id IN (10, 11) AND parent_id = 5
      `);
      db.exec("UPDATE transactions SET category = 'Savings: Investment' WHERE category = 'Investment'");
      db.exec("UPDATE transactions SET category = 'Savings: Savings' WHERE category = 'Savings'");
      db.exec(`
        INSERT INTO categories (name, parent_id, is_system)
        SELECT 'General', 24, 0
        WHERE EXISTS (SELECT 1 FROM categories WHERE id = 24)
          AND NOT EXISTS (SELECT 1 FROM categories WHERE parent_id = 24 AND name = 'General')
      `);
      db.exec("UPDATE transactions SET category = 'Needs: Sports: General' WHERE category = 'Needs: Sports'");
      createTagsTable(db);
    },
  },
  {
    version: 4,
    name: "archived_accounts_and_planning_tables",
    up(db) {
      addColumnIfMissing(db, "accounts", "archived", "INTEGER NOT NULL DEFAULT 0");
      db.exec(`
        CREATE TABLE IF NOT EXISTS rules (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          pattern    TEXT NOT NULL,
          category   TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
      db.exec(`
        CREATE TABLE IF NOT EXISTS budgets (
          id       INTEGER PRIMARY KEY AUTOINCREMENT,
          category TEXT NOT NULL,
          month    TEXT NOT NULL,
          amount   REAL NOT NULL,
          UNIQUE(category, month)
        )
      `);
      db.exec(`
        CREATE TABLE IF NOT EXISTS recurring (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          title      TEXT NOT NULL,
          pattern    TEXT NOT NULL,
          frequency  TEXT NOT NULL DEFAULT 'monthly',
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
      db.exec(`
        CREATE TABLE IF NOT EXISTS goals (
          id            INTEGER PRIMARY KEY AUTOINCREMENT,
          name          TEXT NOT NULL,
          target_amount REAL NOT NULL,
          target_date   TEXT,
          color         TEXT,
          created_at    TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
      db.exec(`
        CREATE TABLE IF NOT EXISTS goal_contributions (
          id      INTEGER PRIMARY KEY AUTOINCREMENT,
          goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
          date    TEXT NOT NULL,
          amount  REAL NOT NULL,
          note    TEXT NOT NULL DEFAULT ''
        )
      `);
    },
  },
  {
    version: 5,
    name: "transaction_price_per_share",
    up(db) {
      addColumnIfMissing(db, "transactions", "price_per_share", "REAL");
    },
  },
  {
    version: 6,
    name: "core_query_indexes",
    up(db) {
      db.exec("CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id)");
      db.exec("CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)");
      db.exec("CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category)");
      db.exec("CREATE INDEX IF NOT EXISTS idx_transactions_linked ON transactions(linked_transaction_id)");
      db.exec("CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id)");
    },
  },
];

export function runMigrations(
  db: Database.Database,
  migrations: Migration[] = MIGRATIONS
): void {
  const versions = new Set<number>();
  for (const migration of migrations) {
    if (!Number.isInteger(migration.version) || migration.version < 1) {
      throw new Error(`Invalid database migration version: ${migration.version}`);
    }
    if (versions.has(migration.version)) {
      throw new Error(`Duplicate database migration version: ${migration.version}`);
    }
    versions.add(migration.version);
  }

  const orderedMigrations = [...migrations].sort((left, right) => left.version - right.version);
  let currentVersion = db.pragma("user_version", { simple: true }) as number;
  const latestVersion = orderedMigrations.at(-1)?.version ?? 0;
  if (currentVersion > latestVersion) {
    throw new Error(
      `Database schema version ${currentVersion} is newer than this application supports (${latestVersion}).`
    );
  }

  let appliedMigration = false;
  for (const migration of orderedMigrations) {
    if (migration.version <= currentVersion) continue;

    try {
      db.transaction(() => {
        migration.up(db);
        db.pragma(`user_version = ${migration.version}`);
      })();
      currentVersion = migration.version;
      appliedMigration = true;
      console.info(`Applied migration ${migration.version}: ${migration.name}`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Database migration ${migration.version} (${migration.name}) failed: ${detail}\n` +
          `Startup aborted. Database user_version remains ${currentVersion}.`
      );
    }
  }

  if (!appliedMigration) {
    console.info(`Database schema is current (version ${currentVersion}); no pending migrations.`);
  }
}