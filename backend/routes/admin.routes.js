const express = require("express");
const { authenticateToken } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/admin.middleware");
const prisma = require("../lib/prisma");

const router = express.Router();

// Get admin dashboard stats and chart data
router.get("/dashboard-stats", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    const todaysBookings = await prisma.booking.count({
      where: {
        slot: { date: todayStr },
        status: { not: "CANCELLED" }
      }
    });

    const activeMembers = await prisma.user.count({ 
      where: { 
        membershipTier: { not: "NONE" } 
      } 
    });

    const pendingApprovals = await prisma.booking.count({ 
      where: { 
        status: "PENDING" 
      } 
    });
    
    const nonCancelledBookings = await prisma.booking.findMany({ 
      where: { status: { not: "CANCELLED" } },
      select: { amountPaid: true } 
    });
    const totalRevenue = nonCancelledBookings.reduce((sum, b) => sum + b.amountPaid, 0);

    // Calculate last 7 days revenue trend dynamically
    const trend = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      
      const startOfDay = new Date(d.setHours(0, 0, 0, 0));
      const endOfDay = new Date(d.setHours(23, 59, 59, 999));
      
      const dayBookings = await prisma.booking.findMany({
        where: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay
          },
          status: { not: "CANCELLED" }
        },
        select: { amountPaid: true }
      });
      
      const revenue = dayBookings.reduce((sum, b) => sum + b.amountPaid, 0);
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      trend.push({ name: dayName, revenue });
    }

    res.json({ todaysBookings, activeMembers, pendingApprovals, totalRevenue, trend });
  } catch (err) {
    console.error("Dashboard Stats Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// List all users for admin dashboard
router.get("/users", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        _count: {
          select: { bookings: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    // Omit passwords
    const sanitized = users.map(({ password, _count, ...u }) => ({
      ...u,
      bookingCount: _count ? _count.bookings : 0
    }));
    res.json(sanitized);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// List all bookings for admin dashboard
router.get("/bookings", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        user: {
          select: { name: true, email: true, phone: true }
        },
        slot: {
          include: {
            branch: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/admin/revenue-chart?days=7
router.get("/revenue-chart", authenticateToken, requireAdmin, async (req, res) => {
  const days = parseInt(req.query.days) || 7;
  try {
    const trend = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      
      const startOfDay = new Date(d.setHours(0, 0, 0, 0));
      const endOfDay = new Date(d.setHours(23, 59, 59, 999));
      
      const dayBookings = await prisma.booking.findMany({
        where: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay
          },
          status: { not: "CANCELLED" }
        },
        select: { amountPaid: true }
      });
      
      const revenue = dayBookings.reduce((sum, b) => sum + b.amountPaid, 0);
      const dayName = d.toLocaleDateString("en-IN", { weekday: "short" });
      const fullDateStr = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      trend.push({ name: dayName, date: fullDateStr, revenue });
    }
    
    res.json(trend);
  } catch (err) {
    console.error("Revenue Chart Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Update booking status (Admin only)
router.patch("/bookings/:id/status", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) return res.status(400).json({ error: "Status is required." });

  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { slot: true }
    });

    if (!booking) return res.status(404).json({ error: "Booking not found." });

    const updated = await prisma.booking.update({
      where: { id },
      data: { status }
    });

    // Adjust status of slot & points if cancelling or restoring
    if (status === "CANCELLED" && booking.status !== "CANCELLED") {
      await prisma.slot.update({
        where: { id: booking.slotId },
        data: { status: "AVAILABLE" }
      });
      await prisma.user.update({
        where: { id: booking.userId },
        data: { pointsBalance: { decrement: booking.pointsEarned } }
      });
    } else if (status !== "CANCELLED" && booking.status === "CANCELLED") {
      await prisma.slot.update({
        where: { id: booking.slotId },
        data: { status: "BOOKED" }
      });
      await prisma.user.update({
        where: { id: booking.userId },
        data: { pointsBalance: { increment: booking.pointsEarned } }
      });
    }

    await prisma.notification.create({
      data: {
        userId: booking.userId,
        message: `Your booking for slot ${booking.slot.startTime}-${booking.slot.endTime} status is updated to ${status}.`,
        type: "STATUS_UPDATE"
      }
    });

    res.json(updated);
  } catch (err) {
    console.error("Update Status Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
