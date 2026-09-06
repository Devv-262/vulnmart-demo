const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware");

const router = express.Router();

function getCartLines(req) {
  const cart = req.session.cart || [];
  return cart.map((line) => {
    const product = db.query("SELECT * FROM products WHERE id = ?", [line.productId])[0];
    return { ...line, product, lineTotal: product ? product.price * line.qty : 0 };
  });
}

router.post("/cart/add", requireAuth, (req, res) => {
  const productId = parseInt(req.body.productId, 10);
  const qty = parseInt(req.body.qty, 10) || 1;
  req.session.cart = req.session.cart || [];

  const existing = req.session.cart.find((l) => l.productId === productId);
  if (existing) existing.qty += qty;
  else req.session.cart.push({ productId, qty });

  res.redirect("/cart");
});

router.get("/cart", requireAuth, (req, res) => {
  const lines = getCartLines(req);
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  res.render("cart", { lines, subtotal, userName: req.session.userName });
});

module.exports = { router, getCartLines };
