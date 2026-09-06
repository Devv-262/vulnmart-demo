const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware");
const { getCartLines } = require("./cart");

const router = express.Router();

const COUPON_CODE = "WELCOME10";
const COUPON_DISCOUNT = 10;

router.get("/checkout", requireAuth, (req, res) => {
  const lines = getCartLines(req);
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  res.render("checkout", { lines, subtotal, userName: req.session.userName });
});

router.post("/checkout", requireAuth, (req, res) => {
  const lines = getCartLines(req);
  if (lines.length === 0) return res.redirect("/cart");

  // vuln-code-snippet vuln-line checkoutPriceTampering
  let total = parseFloat(req.body.total);

  // vuln-code-snippet vuln-line checkoutDoubleCoupon
  const couponsApplied = [];
  for (const code of [req.body.coupon1, req.body.coupon2]) {
    if (code && code.trim().toUpperCase() === COUPON_CODE) {
      total -= COUPON_DISCOUNT;
      couponsApplied.push(code.trim().toUpperCase());
    }
  }

  db.run("INSERT INTO orders (user_id, items, total, coupon_applied, created_at) VALUES (?, ?, ?, ?, ?)", [
    req.session.userId,
    JSON.stringify(lines.map((l) => ({ productId: l.productId, name: l.product.name, qty: l.qty, price: l.product.price }))),
    total,
    couponsApplied.join(",") || null,
    new Date().toISOString(),
  ]);
  const orderId = db.lastInsertId();

  req.session.cart = [];
  res.redirect(`/orders/${orderId}`);
});

module.exports = router;
