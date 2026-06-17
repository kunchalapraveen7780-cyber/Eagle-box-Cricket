const express = require("express");
const cors = require("cors");
require("dotenv").config();
const prisma = require("./lib/prisma");
const { authenticateToken } = require("./middleware/auth.middleware");
const { requireAdmin } = require("./middleware/admin.middleware");
const rateLimit = require("express-rate-limit");

const app = express();
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));
app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per 15 minutes
  message: { error: "Too many authentication attempts from this IP, please try again after 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
});

const authRoutes = require("./routes/auth.routes");
const slotsRoutes = require("./routes/slots.routes");
const bookingsRoutes = require("./routes/bookings.routes");
const notificationsRoutes = require("./routes/notifications.routes");
const offersRoutes = require("./routes/offers.routes");
const referralsRoutes = require("./routes/referrals.routes");
const membershipsRoutes = require("./routes/memberships.routes");
const adminRoutes = require("./routes/admin.routes");
const rewardsRoutes = require("./routes/rewards.routes");

// Transparent rewrite middleware for Admin Bookings route
app.use((req, res, next) => {
  if (req.path === "/api/admin/bookings") {
    req.url = req.url.replace("/api/admin/bookings", "/api/bookings/admin/bookings");
  }
  next();
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/slots", slotsRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/offers", offersRoutes);
app.use("/api/referrals", referralsRoutes);
app.use("/api/memberships", membershipsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/rewards", rewardsRoutes);

app.get("/", (req, res) => {
  res.send("Welcome to the EagleBox Cricket API! Access the web application at http://localhost:5173");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date() });
});

app.get("/api/branches", async (req, res) => {
  try {
    const branches = await prisma.branch.findMany();
    res.json(branches);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
