const express = require("express");
const db = require("../db");

const router = express.Router();

router.get("/login", (req, res) => {
  res.render("login", { error: null });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  // vuln-code-snippet vuln-line loginSqlInjection
  const rows = db.execRaw(`SELECT * FROM users WHERE email = '${email}' AND password = '${password}'`);

  const user = rows[0];
  if (!user) {
    return res.render("login", { error: "Invalid email or password." });
  }

  req.session.userId = user.id;
  req.session.userName = user.name;
  res.redirect("/products");
});

router.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

module.exports = router;
