const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware");

const router = express.Router();

router.get("/orders", requireAuth, (req, res) => {
  const orders = db.query("SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC", [req.session.userId]);
  res.render("orders", { orders, userName: req.session.userName });
});

router.get("/orders/:id", requireAuth, (req, res) => {
  // vuln-code-snippet vuln-line orderIdorNoOwnershipCheck
  const order = db.query("SELECT * FROM orders WHERE id = ?", [req.params.id])[0];

  if (!order) return res.status(404).send("Order not found");
  const owner = db.query("SELECT * FROM users WHERE id = ?", [order.user_id])[0];
  const items = JSON.parse(order.items);
  res.render("order", { order, items, owner, userName: req.session.userName });
});

module.exports = router;
