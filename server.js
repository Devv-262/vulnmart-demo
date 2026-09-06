const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require("path");
const db = require("./db");

const loginRoutes = require("./routes/login");
const signupRoutes = require("./routes/signup");
const productRoutes = require("./routes/products");
const { router: cartRoutes } = require("./routes/cart");
const checkoutRoutes = require("./routes/checkout");
const orderRoutes = require("./routes/orders");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(
  session({
    secret: "vulnmart-demo-secret-not-for-production",
    resave: false,
    saveUninitialized: false,
  })
);

app.get("/", (req, res) => res.redirect(req.session.userId ? "/products" : "/login"));

app.use(loginRoutes);
app.use(signupRoutes);
app.use(productRoutes);
app.use(cartRoutes);
app.use(checkoutRoutes);
app.use(orderRoutes);

db.initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`VulnMart demo listening on http://localhost:${PORT}`);
  });
});
