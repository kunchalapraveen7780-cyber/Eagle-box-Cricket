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

const { startCronJobs } = require("./services/cron.service");
startCronJobs();

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
const couponsRoutes = require("./routes/coupons.routes");
const supportRoutes = require("./routes/support.routes");
const reviewsRoutes = require("./routes/reviews.routes");



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
app.use("/api/coupons", couponsRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/reviews", reviewsRoutes);

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

app.get("/api/branches/:id/live-availability", async (req, res) => {
  try {
    const { id } = req.params;
    const branch = await prisma.branch.findUnique({ where: { id } });
    if (!branch) return res.status(404).json({ error: "Branch not found" });

    // Today's date in YYYY-MM-DD
    // Note: We use local time for 'today' or standard UTC based ISO string
    // Because slots are stored with YYYY-MM-DD in the `date` field.
    const today = new Date().toISOString().split('T')[0];

    // Total slots today
    const totalSlots = await prisma.slot.count({
      where: { branchId: id, date: today }
    });

    // Booked slots today
    const bookedSlots = await prisma.booking.count({
      where: {
        slot: { branchId: id, date: today },
        status: "CONFIRMED"
      }
    });

    const availableSlots = Math.max(0, totalSlots - bookedSlots);
    const occupancy = totalSlots > 0 ? Math.round((bookedSlots / totalSlots) * 100) : 0;

    res.json({
      venueId: id,
      venueName: branch.name,
      totalSlots,
      bookedSlots,
      availableSlots,
      occupancy
    });
  } catch (err) {
    console.error("Live Availability Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/test-email", async (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.status(400).json({ success: false, error: "Please provide a test email via query parameter: ?email=your@email.com" });
  }

  try {
    const { sendEmail, templates } = require("./lib/email");
    // Send a sample booking confirmation as the test
    const testData = await sendEmail({
      to: email,
      subject: "TEST DISPATCH - EagleBox Cricket Configuration",
      html: templates.bookingConfirmation(
        "Test User",
        "TEST-UUID-12345",
        "Eagle Box Cricket Demo",
        "Test Location, Bengaluru",
        "25 Dec 2026",
        "06:00 PM - 07:00 PM",
        1500,
        150,
        "ELITE"
      )
    });

    if (testData) {
      res.json({ success: true, message: "Test email dispatched successfully", data: testData });
    } else {
      res.status(500).json({ success: false, error: "Failed to dispatch email. Please check your backend terminal for the simulated output or API errors." });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const http = require("http");
const WebSocket = require("ws");

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const wsClients = new Set();

wss.on("connection", (ws) => {
  wsClients.add(ws);

  ws.on("close", () => {
    wsClients.delete(ws);
  });

  ws.on("error", (err) => {
    console.error("WebSocket client error:", err);
    wsClients.delete(ws);
  });
});

global.broadcastSlotUpdate = (payload) => {
  const message = JSON.stringify(payload);
  wsClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

// Background Daemon for SlotLock Cleanup
setInterval(async () => {
  try {
    const expiredLocks = await prisma.slotLock.findMany({
      where: {
        expiresAt: { lte: new Date() }
      }
    });

    if (expiredLocks.length > 0) {
      const lockIds = expiredLocks.map(l => l.id);
      await prisma.slotLock.deleteMany({
        where: { id: { in: lockIds } }
      });
    }
  } catch (error) {
    console.error("SlotLock cleanup error:", error);
  }
}, 60 * 1000);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});