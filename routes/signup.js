const express = require("express");
const db = require("../db");

const router = express.Router();

router.get("/signup", (req, res) => {
  res.render("signup", { error: null });
});

router.post("/signup", (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.render("signup", { error: "Name, email, and password are all required." });
  }

  const existing = db.query("SELECT id FROM users WHERE email = ?", [email]);
  if (existing.length > 0) {
    return res.render("signup", { error: "An account with that email already exists." });
  }

  db.run("INSERT INTO users (email, password, name) VALUES (?, ?, ?)", [email, password, name]);
  const userId = db.lastInsertId();

  req.session.userId = userId;
  req.session.userName = name;
  res.redirect("/products");
});

module.exports = router;
