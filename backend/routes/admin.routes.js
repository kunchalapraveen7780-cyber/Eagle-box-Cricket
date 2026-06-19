const express = require("express");
const { authenticateToken } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/admin.middleware");
const prisma = require("../lib/prisma");
const PDFDocument = require("pdfkit-table");
const { performance } = require("perf_hooks");

const router = express.Router();

const logAudit = async (adminName, actionType, userAffected = null, previousValue = null, newValue = null) => {
  try {
    await prisma.auditLog.create({
      data: {
        adminName,
        actionType,
        userAffected,
        previousValue: previousValue ? JSON.stringify(previousValue) : null,
        newValue: newValue ? JSON.stringify(newValue) : null,
      }
    });
  } catch (err) {
    console.error("Audit log failed:", err);
  }
};


// Get admin dashboard stats and chart data
router.get("/dashboard-stats", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const today = new Date();
    // Use local time for YYYY-MM-DD
    const todayStr = today.toLocaleDateString('en-CA'); // e.g. "2026-06-18"
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalUsers,
      activeMembers,
      totalBookings, // Active
      todaysBookings,
      activeVenues,
      bookedSlotsTodayCount,
      monthlyBookings,
      cancelledBookings,
      completedBookingsCount
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          userMemberships: { some: { status: "ACTIVE" } }
        }
      }),
      prisma.booking.count({ where: { status: { in: ["CONFIRMED", "COMPLETED", "PAID"] } } }),
      prisma.booking.count({
        where: {
          slot: { date: todayStr },
          status: { in: ["CONFIRMED", "COMPLETED", "PAID"] }
        }
      }),
      prisma.branch.count(),
      prisma.booking.count({
        where: {
          slot: { date: todayStr },
          status: { in: ["CONFIRMED", "COMPLETED", "PAID"] }
        }
      }),
      prisma.booking.findMany({
        where: {
          createdAt: { gte: firstDayOfMonth },
          status: { in: ["CONFIRMED", "COMPLETED", "PAID"] }
        },
        select: { amountPaid: true }
      }),
      prisma.booking.count({ where: { status: "CANCELLED" } }),
      prisma.booking.count({ where: { status: "COMPLETED" } })
    ]);

    const monthlyRevenue = monthlyBookings.reduce((sum, b) => sum + b.amountPaid, 0);
    const totalSlotsToday = activeVenues * 16;
    const bookedSlotsToday = bookedSlotsTodayCount;
    const availableSlotsToday = Math.max(0, totalSlotsToday - bookedSlotsToday);
    const occupancyRate = totalSlotsToday > 0 ? ((bookedSlotsToday / totalSlotsToday) * 100).toFixed(1) : 0;

    res.json({
      totalUsers,
      activeMembers,
      totalBookings,
      todaysBookings,
      monthlyRevenue,
      activeVenues,
      totalSlotsToday,
      bookedSlotsToday,
      availableSlotsToday,
      occupancyRate,
      cancelledBookings,
      completedBookings: completedBookingsCount
    });
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
        userMemberships: true,
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

    await logAudit(req.user?.name || "Admin", "Booking Status Changed", booking.userId, booking.status, status);

    res.json(updated);
  } catch (err) {
    console.error("Update Status Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Revenue Analytics
router.get("/revenue-analytics", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    const allBookings = await prisma.booking.findMany({
      where: { status: { in: ["CONFIRMED", "COMPLETED", "PAID"] } },
      include: {
        slot: { include: { branch: true } },
        user: true
      }
    });

    let todayRevenue = 0, weeklyRevenue = 0, monthlyRevenue = 0, yearlyRevenue = 0, totalRevenue = 0;
    const branchRevenue = {};
    const planRevenue = {};
    const customerRevenue = {};

    allBookings.forEach(b => {
      const bDate = new Date(b.createdAt);
      const amt = b.amountPaid || 0;
      totalRevenue += amt;

      if (bDate >= startOfToday) todayRevenue += amt;
      if (bDate >= startOfWeek) weeklyRevenue += amt;
      if (bDate >= startOfMonth) monthlyRevenue += amt;
      if (bDate >= startOfYear) yearlyRevenue += amt;

      const bName = b.slot?.branch?.name || "Unknown";
      branchRevenue[bName] = (branchRevenue[bName] || 0) + amt;

      const pName = b.user?.membershipTier || "NONE";
      planRevenue[pName] = (planRevenue[pName] || 0) + amt;

      if (b.user) {
        const uId = b.user.id;
        if (!customerRevenue[uId]) customerRevenue[uId] = { name: b.user.name, email: b.user.email, revenue: 0 };
        customerRevenue[uId].revenue += amt;
      }
    });

    const averageBookingValue = allBookings.length > 0 ? (totalRevenue / allBookings.length) : 0;

    const topRevenueCustomers = Object.values(customerRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Trend for last 30 days
    const trend = [];
    const trendStart = new Date(new Date().setDate(new Date().getDate() - 30));
    trendStart.setHours(0, 0, 0, 0);

    const last30Bookings = allBookings.filter(b => new Date(b.createdAt) >= trendStart);

    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const rev = last30Bookings
        .filter(b => new Date(b.createdAt).toISOString().split('T')[0] === dStr)
        .reduce((sum, b) => sum + (b.amountPaid || 0), 0);
      trend.push({
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        revenue: rev
      });
    }

    res.json({
      todayRevenue,
      weeklyRevenue,
      monthlyRevenue,
      yearlyRevenue,
      totalRevenue,
      averageBookingValue,
      revenueByBranch: Object.entries(branchRevenue).map(([name, value]) => ({ name, value })),
      revenueByPlan: Object.entries(planRevenue).map(([name, value]) => ({ name, value })),
      topRevenueCustomers,
      trend
    });
  } catch (err) {
    console.error("Revenue Analytics Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Loyalty Analytics
router.get("/loyalty-analytics", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const rawUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        userMemberships: {
          where: { status: 'ACTIVE' },
          select: { tier: true }
        },
        lifetimeSavings: true,
        pointsBalance: true,
        bookings: {
          where: { status: { in: ["CONFIRMED", "COMPLETED", "PAID"] } },
          select: { amountPaid: true, status: true }
        }
      }
    });

    const tierDistribution = {
      NONE: rawUsers.filter(u => !u.userMemberships?.length).length,
      STARTER: rawUsers.filter(u => u.userMemberships?.[0]?.tier === 'STARTER').length,
      PRO: rawUsers.filter(u => u.userMemberships?.[0]?.tier === 'PRO').length,
      ELITE: rawUsers.filter(u => u.userMemberships?.[0]?.tier === 'ELITE').length,
      CHAMPION: rawUsers.filter(u => u.userMemberships?.[0]?.tier === 'CHAMPION').length
    };

    const totalDiscountsGiven = rawUsers.reduce((sum, u) => sum + (u.lifetimeSavings || 0), 0);

    // Map to include dynamic counts and sums
    const mappedUsers = rawUsers.map(u => ({
      ...u,
      activeBookingsCount: u.bookings.length,
      dynamicTotalSpent: u.bookings.reduce((sum, b) => sum + (b.amountPaid || 0), 0)
    }));

    // Sort customers by Active Booking Count DESC, then Total Spend DESC
    const sortedUsers = [...mappedUsers].sort((a, b) => {
      if (b.activeBookingsCount !== a.activeBookingsCount) {
        return b.activeBookingsCount - a.activeBookingsCount;
      }
      if (b.dynamicTotalSpent !== a.dynamicTotalSpent) {
        return b.dynamicTotalSpent - a.dynamicTotalSpent;
      }
      return (b.pointsBalance || 0) - (a.pointsBalance || 0);
    });

    // Map to the format expected by the frontend
    const topCustomers = sortedUsers.slice(0, 10).map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      userMemberships: u.userMemberships,
      totalSpent: u.dynamicTotalSpent,
      pointsBalance: u.pointsBalance,
      bookingCount: u.activeBookingsCount
    }));

    // Calculate total active points
    const totalActivePoints = rawUsers.reduce((sum, u) => sum + (u.pointsBalance || 0), 0);

    // Sum points awarded from Referral
    const referrals = await prisma.referral.findMany({ select: { pointsAwarded: true } });
    const totalReferralPoints = referrals.reduce((sum, r) => sum + r.pointsAwarded, 0);
    
    // Sum points earned from bookings
    const bookings = await prisma.booking.findMany({ select: { pointsEarned: true } });
    const totalBookingPoints = bookings.reduce((sum, b) => sum + (b.pointsEarned || 0), 0);

    const totalPointsIssued = totalReferralPoints + totalBookingPoints;

    res.json({ tierDistribution, totalDiscountsGiven, topCustomers, totalActivePoints, totalPointsIssued });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Membership Analytics
router.get("/membership-analytics", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const activeMembershipsData = await prisma.userMembership.findMany({
      where: {
        status: "ACTIVE",
        expiryDate: { gt: today }
      },
      select: { tier: true, totalSlots: true, usedSlots: true }
    });

    const activeMembers = activeMembershipsData.length;

    let totalSlotsGranted = 0;
    let totalSlotsUsed = 0;

    const expiringMemberships = await prisma.userMembership.count({
      where: { status: "ACTIVE", expiryDate: { gt: today, lte: nextWeek } }
    });

    // Use actual membership tier prices to calculate revenue (assuming Starter=999, Pro=2499, Elite=4499, Champion=7999)
    let membershipRevenue = 0;
    const tierPrices = {
      "STARTER": 999,
      "PRO": 2499,
      "ELITE": 4499,
      "CHAMPION": 7999
    };

    const breakdowns = {
      STARTER: 0, PRO: 0, ELITE: 0, CHAMPION: 0
    };

    activeMembershipsData.forEach(m => {
      if (tierPrices[m.tier]) {
        membershipRevenue += tierPrices[m.tier];
        breakdowns[m.tier] += 1;
      }
      totalSlotsGranted += (m.totalSlots || 0);
      totalSlotsUsed += (m.usedSlots || 0);
    });

    const expiredMemberships = await prisma.userMembership.count({
      where: { status: "EXPIRED" }
    });

    res.json({
      activeMembers,
      expiringMemberships,
      expiredMemberships,
      membershipRevenue,
      breakdowns,
      usage: {
        totalSlotsGranted,
        totalSlotsUsed,
        usagePercent: totalSlotsGranted > 0 ? ((totalSlotsUsed / totalSlotsGranted) * 100).toFixed(1) : 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Email Analytics
router.get("/email-analytics", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const emails = await prisma.emailLog.findMany({
      orderBy: { sentAt: 'desc' },
      take: 100
    });

    const totalSent = await prisma.emailLog.count();
    const delivered = await prisma.emailLog.count({ where: { status: "DELIVERED" } });
    const failed = await prisma.emailLog.count({ where: { status: "FAILED" } });
    const pending = await prisma.emailLog.count({ where: { status: "PENDING" } });

    res.json({ totalSent, delivered, failed, pending, recentEmails: emails });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// --- NEW AUDIT LOG ROUTE ---
router.get("/audit-logs", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" }
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// --- NEW TOP CUSTOMERS ROUTE ---
router.get("/top-customers", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        _count: {
          select: { bookings: true }
        },
        userMemberships: {
          where: { status: 'ACTIVE' },
          select: { tier: true }
        }
      },
      orderBy: {
        bookings: {
          _count: 'desc'
        }
      },
      take: 50
    });

    const mapped = users.map(u => ({
      id: u.id,
      name: u.name,
      bookingsCount: u._count.bookings,
      totalSpent: u.totalSpent,
      membershipTier: u.userMemberships?.[0]?.tier || 'NONE',
      pointsBalance: u.pointsBalance
    }));

    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// --- NEW VENUE ANALYTICS ---
router.get("/venue-analytics", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const branches = await prisma.branch.findMany({
      include: {
        slots: {
          include: {
            bookings: true
          }
        }
      }
    });

    const today = new Date().toISOString().split('T')[0];

    const analytics = branches.map(branch => {
      const todaysSlots = branch.slots.filter(s => s.date === today);
      const totalSlots = todaysSlots.length;
      let bookedSlots = 0;
      let revenue = 0;

      todaysSlots.forEach(slot => {
        const validBookings = slot.bookings.filter(b => b.status === "CONFIRMED");
        if (validBookings.length > 0) {
          bookedSlots++;
          revenue += validBookings.reduce((sum, b) => sum + b.amountPaid, 0);
        }
      });

      const occupancy = totalSlots > 0 ? ((bookedSlots / totalSlots) * 100).toFixed(1) : 0;

      return {
        id: branch.id,
        name: branch.name,
        totalSlots,
        bookedSlots,
        availableSlots: totalSlots - bookedSlots,
        occupancy,
        revenue
      };
    });

    res.json(analytics);
  } catch (err) {
    console.error("Venue analytics err", err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- NEW GROUND UTILIZATION ---
router.get("/ground-utilization", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { status: { not: "CANCELLED" } },
      include: { slot: true }
    });

    const timeCount = {};
    bookings.forEach(b => {
      const time = `${b.slot.startTime} - ${b.slot.endTime}`;
      timeCount[time] = (timeCount[time] || 0) + 1;
    });

    let peakHour = "N/A";
    let max = 0;
    Object.keys(timeCount).forEach(t => {
      if (timeCount[t] > max) {
        max = timeCount[t];
        peakHour = t;
      }
    });

    res.json({ peakHour, timeStats: timeCount });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// --- NEW REFERRALS ---
router.get("/referrals", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const refs = await prisma.referral.findMany({
      include: {
        referrer: { select: { name: true, email: true } },
        referred: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(refs);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// --- NEW SUPPORT ANALYTICS ---
router.get("/support-analytics", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [openTickets, resolvedTickets, pendingTickets, allTickets] = await Promise.all([
      prisma.supportTicket.count({ where: { status: "OPEN" } }),
      prisma.supportTicket.count({ where: { status: "RESOLVED" } }),
      prisma.supportTicket.count({ where: { status: "PENDING" } }),
      prisma.supportTicket.findMany({
        include: {
          user: { select: { name: true, email: true } }
        },
        orderBy: { createdAt: "desc" }
      })
    ]);

    // Average Response Time is complex without a response table, mock it or compute from updatedAt if RESOLVED
    const resolvedData = allTickets.filter(t => t.status === "RESOLVED");
    let avgResponseTimeHrs = 0;
    if (resolvedData.length > 0) {
      const totalMs = resolvedData.reduce((acc, t) => acc + (new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime()), 0);
      avgResponseTimeHrs = (totalMs / resolvedData.length / (1000 * 60 * 60)).toFixed(1);
    }

    res.json({
      openTickets,
      resolvedTickets,
      pendingTickets,
      averageResponseTime: avgResponseTimeHrs + " hours",
      recentTickets: allTickets.slice(0, 50)
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// --- NEW EXPORT CENTER ---
router.get("/export/:type", authenticateToken, requireAdmin, async (req, res) => {
  const { type } = req.params;
  const { format } = req.query;
  const startTime = performance.now();
  try {
    let data = [];
    if (type === "users") {
      const rawData = await prisma.user.findMany({
        select: { id: true, name: true, email: true, phone: true, role: true, userMemberships: { where: { status: 'ACTIVE' }, select: { tier: true } }, totalSpent: true, pointsBalance: true, createdAt: true }
      });
      data = rawData.map(u => ({
        ...u,
        membershipTier: u.userMemberships?.[0]?.tier || 'NONE',
        userMemberships: undefined
      }));
    } else if (type === "bookings") {
      data = await prisma.booking.findMany({
        select: { id: true, status: true, amountPaid: true, pointsEarned: true, createdAt: true, user: { select: { email: true } }, slot: { select: { date: true, startTime: true } } }
      });
      // flatten
      data = data.map(b => ({
        ...b,
        userEmail: b.user?.email,
        slotDate: b.slot?.date,
        slotStartTime: b.slot?.startTime
      }));
    } else if (type === "revenue") {
      data = await prisma.booking.findMany({
        where: { status: { not: "CANCELLED" } },
        select: { id: true, amountPaid: true, createdAt: true }
      });
    } else if (type === "memberships") {
      const activeMems = await prisma.userMembership.findMany({
        where: { status: "ACTIVE" },
        select: { user: { select: { id: true, name: true, email: true } }, tier: true, expiryDate: true }
      });
      data = activeMems.map(m => ({
        id: m.user?.id,
        name: m.user?.name,
        email: m.user?.email,
        membershipTier: m.tier,
        membershipExpiry: m.expiryDate
      }));
    } else if (type === "rewards") {
      const coupons = await prisma.coupon.findMany({
        select: { id: true, code: true, discount: true, expiryDate: true, isUsed: true, createdAt: true, user: { select: { email: true } } }
      });
      data = coupons.map(c => ({
        id: c.id, code: c.code, discount: c.discount, expiryDate: c.expiryDate, isUsed: c.isUsed, createdAt: c.createdAt, userEmail: c.user?.email
      }));
    } else if (type === "referrals") {
      data = await prisma.referral.findMany({
        select: { id: true, referralCode: true, refereeEmail: true, status: true, pointsAwarded: true, createdAt: true }
      });
    } else if (type === "auditlogs") {
      data = await prisma.auditLog.findMany({
        select: { id: true, adminName: true, actionType: true, userAffected: true, createdAt: true }
      });
    } else {
      return res.status(400).json({ error: "Invalid export type" });
    }

    if (!data.length) {
      return res.status(404).json({ error: "No data found" });
    }

    const flattenObject = (obj, prefix = '') => {
      return Object.keys(obj).reduce((acc, k) => {
        const pre = prefix.length ? prefix + '_' : '';
        if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k]) && !(obj[k] instanceof Date)) {
          Object.assign(acc, flattenObject(obj[k], pre + k));
        } else {
          acc[pre + k] = obj[k];
        }
        return acc;
      }, {});
    };

    const flatData = data.map(item => flattenObject(item));

    if (format === 'pdf') {
      try {
        const doc = new PDFDocument({ margin: 30, size: 'A4' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${type}_report.pdf"`);

        doc.pipe(res);

        const reportNames = {
          users: 'Users',
          bookings: 'Booking',
          revenue: 'Revenue',
          memberships: 'Membership',
          rewards: 'Rewards',
          referrals: 'Referral',
          auditlogs: 'Audit Log'
        };
        const reportName = reportNames[type] || type;

        doc.fontSize(22).fillColor('#22C55E').text('EagleBox Cricket', { align: 'left' });
        doc.moveDown(0.5);
        doc.fontSize(14).fillColor('#323232').text(`${reportName.toUpperCase()} REPORT`);
        doc.fontSize(10).fillColor('#646464').text(`Generated on: ${new Date().toLocaleString()}`);
        doc.moveDown();

        const table = {
          headers: Object.keys(flatData[0]),
          rows: flatData.map(item => Object.values(item).map(val => (val !== null && val !== undefined) ? String(val) : ''))
        };

        await doc.table(table, {
          prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8),
          prepareRow: () => doc.font('Helvetica').fontSize(8)
        });

        doc.end();

        const endTime = performance.now();
        console.log(`Generating ${reportName} Report PDF...`);
        console.log(`Records: ${flatData.length}`);
        console.log(`Generated in: ${((endTime - startTime) / 1000).toFixed(1)} seconds`);
        console.log(`Export Successful`);

      } catch (pdfErr) {
        console.error("PDF generation failed:", pdfErr);
        if (!res.headersSent) {
          return res.status(500).json({ error: `PDF generation failed: ${pdfErr.message}` });
        }
      }
    } else {
      // Return JSON data so the frontend can build Excel, and CSV client-side
      return res.json({ success: true, data: flatData });
    }

  } catch (err) {
    console.error("Export Error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Server error" });
    }
  }
});

// --- REVIEWS MANAGEMENT ---
router.get("/reviews", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      include: {
        user: { select: { name: true, email: true } },
        branch: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(reviews);
  } catch (err) {
    console.error("Fetch reviews err", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/reviews/:id/status", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isApproved, isFeatured } = req.body;

    // We update whatever is provided
    const updateData = {};
    if (typeof isApproved === 'boolean') updateData.isApproved = isApproved;
    if (typeof isFeatured === 'boolean') updateData.isFeatured = isFeatured;

    const review = await prisma.review.update({
      where: { id },
      data: updateData
    });
    res.json(review);
  } catch (err) {
    console.error("Update review err", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/reviews/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.review.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (err) {
    console.error("Delete review err", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Notifications & Email Analytics
router.get("/communications-analytics", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalEmailsSent = await prisma.emailLog.count({ where: { status: 'SENT' } });
    const totalEmailsFailed = await prisma.emailLog.count({ where: { status: 'FAILED' } });
    
    // Group emails by template
    const templateCounts = await prisma.emailLog.groupBy({
      by: ['template'],
      _count: { template: true },
      orderBy: { _count: { template: 'desc' } }
    });

    const emailLogs = await prisma.emailLog.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } }
      }
    });

    res.json({
      totalEmailsSent,
      totalEmailsFailed,
      templateCounts,
      emailLogs
    });
  } catch (err) {
    console.error("Communications analytics error:", err);
    res.status(500).json({ error: "Server error fetching communications analytics" });
  }
});

module.exports = router;
