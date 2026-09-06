const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware");

const router = express.Router();

router.get("/products", requireAuth, (req, res) => {
  const products = db.query("SELECT * FROM products");
  res.render("products", { products, userName: req.session.userName });
});

module.exports = router;
