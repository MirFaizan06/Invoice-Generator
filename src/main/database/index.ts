import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';
import { AppPaths } from '../utils/paths';

type BindParam = string | number | null | Uint8Array;
type RowObject = Record<string, BindParam>;

class PreparedStatementWrapper {
  constructor(private sql: string, private wrapper: SQLiteWrapper) {}

  run(...args: unknown[]): { lastInsertRowid: number; changes: number } {
    const params = flattenParams(args);
    if (params.length > 0) {
      this.wrapper.db.run(this.sql, params);
    } else {
      this.wrapper.db.run(this.sql);
    }
    const lastInsertRowid = this.wrapper.lastInsertRowid();
    const changes = this.wrapper.changes();
    this.wrapper.persist();
    return { lastInsertRowid, changes };
  }

  get(...args: unknown[]): unknown {
    const params = flattenParams(args);
    const stmt = this.wrapper.db.prepare(this.sql);
    if (params.length > 0) stmt.bind(params);
    const row = stmt.step() ? (stmt.getAsObject() as RowObject) : undefined;
    stmt.free();
    return row;
  }

  all(...args: unknown[]): unknown[] {
    const params = flattenParams(args);
    const stmt = this.wrapper.db.prepare(this.sql);
    if (params.length > 0) stmt.bind(params);
    const rows: RowObject[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject() as RowObject);
    stmt.free();
    return rows;
  }
}

function flattenParams(args: unknown[]): BindParam[] {
  if (args.length === 1 && Array.isArray(args[0])) {
    return (args[0] as BindParam[]);
  }
  return args as BindParam[];
}

export class SQLiteWrapper {
  db: Database;
  private dbPath: string;

  constructor(db: Database, dbPath: string) {
    this.db = db;
    this.dbPath = dbPath;
  }

  prepare(sql: string): PreparedStatementWrapper {
    return new PreparedStatementWrapper(sql, this);
  }

  exec(sql: string): void {
    this.db.exec(sql);
    this.persist();
  }

  pragma(str: string): void {
    this.db.run(`PRAGMA ${str}`);
  }

  lastInsertRowid(): number {
    const res = this.db.exec('SELECT last_insert_rowid()');
    return Number(res[0]?.values[0]?.[0] ?? 0);
  }

  changes(): number {
    const res = this.db.exec('SELECT changes()');
    return Number(res[0]?.values[0]?.[0] ?? 0);
  }

  persist(): void {
    const data = this.db.export();
    fs.writeFileSync(this.dbPath, Buffer.from(data));
  }
}

let dbInstance: SQLiteWrapper | null = null;

export function getDB(): SQLiteWrapper {
  if (!dbInstance) throw new Error('Database not initialized');
  return dbInstance;
}

export async function initializeDatabase(): Promise<void> {
  const wasmPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
    : path.resolve('node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');

  const SQL = await initSqlJs({ locateFile: () => wasmPath });

  let fileData: Buffer | null = null;
  if (fs.existsSync(AppPaths.database)) {
    fileData = fs.readFileSync(AppPaths.database);
  }

  const db = new SQL.Database(fileData ?? undefined);
  dbInstance = new SQLiteWrapper(db, AppPaths.database);

  dbInstance.db.run('PRAGMA foreign_keys = ON');
  runMigrations(dbInstance);
  dbInstance.persist();
}

function addColumnSafe(db: SQLiteWrapper, table: string, column: string, definition: string): void {
  try { db.db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`); } catch {}
}

function runMigrations(db: SQLiteWrapper): void {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS businesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      owner_name TEXT NOT NULL DEFAULT '',
      address TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      gst TEXT DEFAULT '',
      pan TEXT DEFAULT '',
      cin TEXT DEFAULT '',
      invoice_prefix TEXT DEFAULT 'TBD/INV',
      default_tax REAL DEFAULT 18,
      is_active INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS upi_ids (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL,
      label TEXT NOT NULL,
      upi_id TEXT NOT NULL,
      is_primary INTEGER DEFAULT 0,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS invoice_counters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      last_number INTEGER DEFAULT 0,
      UNIQUE(business_id, year),
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL UNIQUE,
      business_id INTEGER NOT NULL,
      client_name TEXT NOT NULL,
      client_address TEXT DEFAULT '',
      client_email TEXT DEFAULT '',
      client_phone TEXT DEFAULT '',
      project_name TEXT NOT NULL,
      date TEXT NOT NULL,
      due_date TEXT DEFAULT '',
      subtotal REAL NOT NULL DEFAULT 0,
      tax_percent REAL NOT NULL DEFAULT 18,
      tax_amount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      notes TEXT DEFAULT '',
      status TEXT DEFAULT 'unpaid',
      html_path TEXT DEFAULT '',
      pdf_path TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (business_id) REFERENCES businesses(id)
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      quantity REAL NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0,
      amount REAL NOT NULL DEFAULT 0,
      order_index INTEGER DEFAULT 0,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER,
      business_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT DEFAULT '',
      date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
      FOREIGN KEY (business_id) REFERENCES businesses(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth (
      id INTEGER PRIMARY KEY,
      password_hash TEXT NOT NULL,
      hint TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS saved_clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      address TEXT DEFAULT '',
      gst TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );
  `);

  // businesses new columns
  addColumnSafe(db, 'businesses', 'logo_path', "TEXT DEFAULT ''");
  addColumnSafe(db, 'businesses', 'template_id', "TEXT DEFAULT 'modern-blue'");

  // upi_ids new columns
  addColumnSafe(db, 'upi_ids', 'upi_name', "TEXT DEFAULT ''");

  // invoices new columns
  addColumnSafe(db, 'invoices', 'po_number', "TEXT DEFAULT ''");
  addColumnSafe(db, 'invoices', 'client_gst', "TEXT DEFAULT ''");
  addColumnSafe(db, 'invoices', 'place_of_supply', "TEXT DEFAULT ''");
  addColumnSafe(db, 'invoices', 'payment_terms', "TEXT DEFAULT ''");
  addColumnSafe(db, 'invoices', 'bank_account', "TEXT DEFAULT ''");
  addColumnSafe(db, 'invoices', 'bank_name', "TEXT DEFAULT ''");
  addColumnSafe(db, 'invoices', 'bank_ifsc', "TEXT DEFAULT ''");
  addColumnSafe(db, 'invoices', 'bank_holder', "TEXT DEFAULT ''");
  addColumnSafe(db, 'invoices', 'discount_percent', 'REAL DEFAULT 0');
  addColumnSafe(db, 'invoices', 'discount_amount', 'REAL DEFAULT 0');
  addColumnSafe(db, 'invoices', 'shipping_charges', 'REAL DEFAULT 0');
  addColumnSafe(db, 'invoices', 'currency', "TEXT DEFAULT 'INR'");

  // invoice_items new columns
  addColumnSafe(db, 'invoice_items', 'hsn_sac', "TEXT DEFAULT ''");
  addColumnSafe(db, 'invoice_items', 'unit', "TEXT DEFAULT ''");

  // soft delete
  addColumnSafe(db, 'invoices', 'is_deleted', 'INTEGER DEFAULT 0');
}
