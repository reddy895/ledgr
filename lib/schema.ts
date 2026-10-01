export const CREATE_TABLES = `
  CREATE TABLE IF NOT EXISTS accounts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL,
    type            TEXT    NOT NULL DEFAULT 'checking',
    currency        TEXT    NOT NULL DEFAULT 'CHF',
    color           TEXT    NOT NULL DEFAULT '#6366f1',
    exchange_rate   REAL    NOT NULL DEFAULT 1.0,
    initial_balance REAL    NOT NULL DEFAULT 0,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT    NOT NULL,
    parent_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    color     TEXT,
    is_system INTEGER NOT NULL DEFAULT 0,
    created_at TEXT   NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id   INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    date         TEXT    NOT NULL,
    description  TEXT    NOT NULL,
    amount       REAL    NOT NULL,
    category     TEXT    NOT NULL DEFAULT '',
    reimbursable INTEGER NOT NULL DEFAULT 0,
    needs_review INTEGER NOT NULL DEFAULT 0,
    linked_transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS imports (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    filename    TEXT    NOT NULL,
    account_id  INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    count       INTEGER NOT NULL,
    imported_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS exchange_rate_cache (
    currency    TEXT PRIMARY KEY,
    rate_to_chf REAL NOT NULL,
    fetched_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rules (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern    TEXT NOT NULL,
    category   TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    month    TEXT NOT NULL,
    amount   REAL NOT NULL,
    UNIQUE(category, month)
  );

  CREATE TABLE IF NOT EXISTS recurring (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT NOT NULL,
    pattern    TEXT NOT NULL,
    frequency  TEXT NOT NULL DEFAULT 'monthly',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS goals (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    target_amount REAL NOT NULL,
    target_date   TEXT,
    color         TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS goal_contributions (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    date    TEXT NOT NULL,
    amount  REAL NOT NULL,
    note    TEXT NOT NULL DEFAULT ''
  );

`;
// Seed the fixed system categories — safe to run repeatedly
export const SEED_CATEGORIES = `
  INSERT OR IGNORE INTO categories (id, name, parent_id, color, is_system) VALUES
    (1, 'Income',   NULL, '#10b981', 1),
    (2, 'Expenses', NULL, '#ef4444', 1),
    (3, 'Needs',    2,    NULL,      1),
    (4, 'Wants',    2,    NULL,      1),
    (5, 'Savings',  NULL, '#3b82f6', 1);
`;
