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
      price REAL NOT NULL,
      image_url TEXT NOT NULL,
      category TEXT NOT NULL
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

    INSERT INTO products (name, price, image_url, category) VALUES
      ('Wireless Mouse', 25.00, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&q=80&fit=crop', 'Accessories'),
      ('Mechanical Keyboard', 80.00, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&q=80&fit=crop', 'Accessories'),
      ('27" 4K Monitor', 320.00, 'https://images.unsplash.com/photo-1527443195645-1133f7f28990?w=500&q=80&fit=crop', 'Displays'),
      ('Ultrabook Laptop', 999.00, 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&q=80&fit=crop', 'Computers'),
      ('Noise-Cancelling Headphones', 150.00, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80&fit=crop', 'Audio'),
      ('Portable Bluetooth Speaker', 60.00, 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500&q=80&fit=crop', 'Audio'),
      ('Fitness Smartwatch', 220.00, 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&q=80&fit=crop', 'Wearables'),
      ('Instant Print Camera', 90.00, 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&q=80&fit=crop', 'Cameras'),
      ('12.9" Tablet', 650.00, 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500&q=80&fit=crop', 'Computers'),
      ('Wireless Game Controller', 45.00, 'https://images.unsplash.com/photo-1592840496694-26d035b52b48?w=500&q=80&fit=crop', 'Accessories');
  `);

  // A pre-existing order belonging to Bob (user_id 2) — gives the IDOR
  // exploit a deterministic victim to target: Alice requesting order id 1
  // (not her own) should never see "Bob Baker" or his items.
  db.run(`
    INSERT INTO orders (user_id, items, total, coupon_applied, created_at) VALUES
      (2, '[{"productId":2,"name":"Mechanical Keyboard","qty":1,"price":80}]', 80.00, NULL, '2026-09-01T10:00:00.000Z');
  `);

  console.log("[db] Seeded — 2 users, 10 products, 1 order (Bob's)");
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
