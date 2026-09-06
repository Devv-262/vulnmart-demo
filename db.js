// In-memory SQLite (sql.js — pure WASM, no native build step, so this
// container never needs a compiler toolchain) seeded fresh on every boot.
// Data resets whenever the sandbox rebuilds the container, which is exactly
// what a disposable exploit-verification instance should do.
const initSqlJs = require("sql.js");

let db = null;

async function initDb() {
  const SQL = await initSqlJs();
  db = new SQL.Database();

  db.run(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL
    );
    CREATE TABLE products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL
    );
    CREATE TABLE orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      items TEXT NOT NULL,
      total REAL NOT NULL,
      coupon_applied TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE redeemed_coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      code TEXT NOT NULL,
      order_id INTEGER NOT NULL
    );
  `);

  db.run(`
    INSERT INTO users (email, password, name) VALUES
      ('alice@vulnmart.test', 'alice123', 'Alice Anderson'),
      ('bob@vulnmart.test', 'bob123', 'Bob Baker');

    INSERT INTO products (name, price) VALUES
      ('Wireless Mouse', 25.00),
      ('Mechanical Keyboard', 80.00),
      ('USB-C Hub', 35.00),
      ('1080p Webcam', 50.00);
  `);

  // A pre-existing order belonging to Bob (user_id 2) — gives the IDOR
  // exploit a deterministic victim to target: Alice requesting order id 1
  // (not her own) should never see "Bob Baker" or his items.
  db.run(`
    INSERT INTO orders (user_id, items, total, coupon_applied, created_at) VALUES
      (2, '[{"productId":2,"name":"Mechanical Keyboard","qty":1,"price":80}]', 80.00, NULL, '2026-09-01T10:00:00.000Z');
  `);

  console.log("[db] Seeded — 2 users, 4 products, 1 order (Bob's)");
}

/** Runs a raw, unparameterized SQL string and returns rows as objects. Used
 * ONLY by the deliberately vulnerable login path — never build this from
 * untrusted input anywhere else. */
function execRaw(sql) {
  const rows = [];
  const stmt = db.prepare(sql);
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

/** Parameterized query — the safe way, used by every other route (and by
 * the fixed version of the login route once the patch is applied). */
function query(sql, params = []) {
  const rows = [];
  const stmt = db.prepare(sql);
  stmt.bind(params);
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function run(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  stmt.step();
  stmt.free();
}

function lastInsertId() {
  return execRaw("SELECT last_insert_rowid() AS id")[0].id;
}

module.exports = { initDb, execRaw, query, run, lastInsertId };
