import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
const { CREATE_TABLES, SEED_CATEGORIES } = await import("../lib/schema.ts");
const { MIGRATIONS, runMigrations } = await import("../lib/migrations.ts");
const { getDatabasePaths } = await import("../lib/data-directory.ts");

function initializeSchema(db) {
  db.transaction(() => {
    db.exec(CREATE_TABLES);
    db.exec(SEED_CATEGORIES);
  })();
  runMigrations(db);
}

function createLegacyDatabase() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
      color TEXT,
      is_system INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO accounts (id, name, type) VALUES (1, 'Legacy checking', 'checking');
    INSERT INTO transactions (id, account_id, date, description, amount)
    VALUES (41, 1, '2024-01-02', 'Existing transaction', -12.5);
  `);
  return db;
}

test("version 0 applies every migration and reaches the latest version", () => {
  const db = new Database(":memory:");
  try {
    initializeSchema(db);
    assert.equal(db.pragma("user_version", { simple: true }), MIGRATIONS.at(-1).version);
    assert.ok(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'holdings'").get());
    assert.ok(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'tags'").get());
    assert.ok(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'goal_contributions'").get());
  } finally {
    db.close();
  }
});

test("completed migrations are not applied a second time", () => {
  const db = new Database(":memory:");
  let applications = 0;
  const migrations = [
    {
      version: 1,
      name: "count_once",
      up(database) {
        applications += 1;
        database.exec("CREATE TABLE once_only (id INTEGER PRIMARY KEY)");
      },
    },
  ];

  try {
    runMigrations(db, migrations);
    runMigrations(db, migrations);
    assert.equal(applications, 1);
    assert.equal(db.pragma("user_version", { simple: true }), 1);
  } finally {
    db.close();
  }
});

test("a failing migration rolls back and does not advance user_version", () => {
  const db = new Database(":memory:");
  const migrations = [
    {
      version: 1,
      name: "deliberate_failure",
      up(database) {
        database.exec("CREATE TABLE rolled_back (id INTEGER PRIMARY KEY)");
        throw new Error("intentional test failure");
      },
    },
  ];

  try {
    assert.throws(
      () => runMigrations(db, migrations),
      /Database migration 1 \(deliberate_failure\) failed: intentional test failure.*Startup aborted/s
    );
    assert.equal(db.pragma("user_version", { simple: true }), 0);
    assert.equal(db.prepare("SELECT name FROM sqlite_master WHERE name = 'rolled_back'").get(), undefined);
  } finally {
    db.close();
  }
});

test("successful migration changes user_version only with its committed schema", () => {
  const db = new Database(":memory:");
  const migrations = [
    {
      version: 1,
      name: "transactional_success",
      up(database) {
        database.exec("CREATE TABLE committed_schema (id INTEGER PRIMARY KEY)");
      },
    },
  ];

  try {
    runMigrations(db, migrations);
    assert.equal(db.pragma("user_version", { simple: true }), 1);
    assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE name = 'committed_schema'").get());
  } finally {
    db.close();
  }
});

test("legacy database migrates without losing existing account or transaction data", () => {
  const db = createLegacyDatabase();
  try {
    initializeSchema(db);
    const account = db.prepare("SELECT name FROM accounts WHERE id = 1").get();
    const transaction = db.prepare("SELECT description, amount, category FROM transactions WHERE id = 41").get();

    assert.deepEqual(account, { name: "Legacy checking" });
    assert.deepEqual(transaction, {
      description: "Existing transaction",
      amount: -12.5,
      category: "",
    });
    assert.equal(db.pragma("user_version", { simple: true }), MIGRATIONS.at(-1).version);

    const categoryCount = db.prepare("SELECT count(*) AS count FROM categories").get().count;
    initializeSchema(db);
    assert.equal(db.prepare("SELECT count(*) AS count FROM categories").get().count, categoryCount);
    assert.equal(db.prepare("SELECT count(*) AS count FROM transactions").get().count, 1);
  } finally {
    db.close();
  }
});

test("production requires LEDGR_DATA_DIR before creating a local fallback", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousDataDirectory = process.env.LEDGR_DATA_DIR;
  const previousWorkingDirectory = process.cwd();
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "ledgr-production-config-"));
  try {
    process.chdir(temporaryDirectory);
    process.env.NODE_ENV = "production";
    delete process.env.LEDGR_DATA_DIR;

    assert.throws(
      () => getDatabasePaths(),
      /LEDGR_DATA_DIR is required when NODE_ENV=production.*inside the container filesystem/
    );
    assert.equal(fs.existsSync(path.join(temporaryDirectory, "data")), false);
  } finally {
    process.chdir(previousWorkingDirectory);
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousDataDirectory === undefined) delete process.env.LEDGR_DATA_DIR;
    else process.env.LEDGR_DATA_DIR = previousDataDirectory;
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});

test("development retains its local data-directory fallback", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousDataDirectory = process.env.LEDGR_DATA_DIR;
  const previousWorkingDirectory = process.cwd();
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "ledgr-development-config-"));
  try {
    process.chdir(temporaryDirectory);
    process.env.NODE_ENV = "development";
    delete process.env.LEDGR_DATA_DIR;

    const paths = getDatabasePaths();
    assert.equal(paths.dataDirectory, path.join(temporaryDirectory, "data"));
    assert.equal(paths.databasePath, path.join(temporaryDirectory, "data", "finance.db"));
    assert.equal(fs.existsSync(paths.dataDirectory), true);
  } finally {
    process.chdir(previousWorkingDirectory);
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousDataDirectory === undefined) delete process.env.LEDGR_DATA_DIR;
    else process.env.LEDGR_DATA_DIR = previousDataDirectory;
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});

test("a configured database directory is created and used exactly", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousDataDirectory = process.env.LEDGR_DATA_DIR;
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "ledgr-configured-dir-"));
  const configuredDirectory = path.join(temporaryDirectory, "persistent-data");
  try {
    process.env.NODE_ENV = "production";
    process.env.LEDGR_DATA_DIR = configuredDirectory;

    const paths = getDatabasePaths();
    assert.equal(paths.dataDirectory, configuredDirectory);
    assert.equal(paths.databasePath, path.join(configuredDirectory, "finance.db"));
    assert.equal(fs.existsSync(configuredDirectory), true);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousDataDirectory === undefined) delete process.env.LEDGR_DATA_DIR;
    else process.env.LEDGR_DATA_DIR = previousDataDirectory;
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});

test("an unusable configured directory reports the filesystem error", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousDataDirectory = process.env.LEDGR_DATA_DIR;
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "ledgr-invalid-dir-"));
  const filePath = path.join(temporaryDirectory, "not-a-directory");
  fs.writeFileSync(filePath, "file");
  try {
    process.env.NODE_ENV = "production";
    process.env.LEDGR_DATA_DIR = filePath;

    assert.throws(
      () => getDatabasePaths(),
      new RegExp(`Database directory ".*not-a-directory" is not accessible:.*`)
    );
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousDataDirectory === undefined) delete process.env.LEDGR_DATA_DIR;
    else process.env.LEDGR_DATA_DIR = previousDataDirectory;
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});