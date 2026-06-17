const express = require("express");
const { authenticateToken } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/admin.middleware");
const prisma = require("../lib/prisma");

const router = express.Router();

// Create booking
router.post("/", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { slotId, amountPaid } = req.body;
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Basic conflict prevention (atomic check inside transaction)
      const slot = await tx.slot.findUnique({ where: { id: slotId } });
      if (!slot || slot.status === "BOOKED") {
        throw new Error("Slot not available");
      }

      const pointsEarned = Math.floor(amountPaid / 10); // Logic: 1 point per 10 rs

      const booking = await tx.booking.create({
        data: { userId, slotId, amountPaid, pointsEarned }
      });

      // Mark slot as booked
      await tx.slot.update({
        where: { id: slotId },
        data: { status: "BOOKED" }
      });

      // Update user points and check tier upgrade
      const user = await tx.user.update({
        where: { id: userId },
        data: { pointsBalance: { increment: pointsEarned } }
      });
      
      // Auto tier upgrade
      let newTier = user.membershipTier;
      if (user.pointsBalance >= 3000) newTier = "PLATINUM";
      else if (user.pointsBalance >= 1500) newTier = "GOLD";
      else if (user.pointsBalance >= 500) newTier = "SILVER";

      if (newTier !== user.membershipTier) {
        await tx.user.update({
          where: { id: userId },
          data: { membershipTier: newTier }
        });
        // Add notification for upgrade
        await tx.notification.create({
           data: { userId, message: `Congratulations! You've been upgraded to ${newTier} tier.`, type: "UPGRADE" }
        });
      }

      // Add notification for booking
      await tx.notification.create({
        data: { userId, message: `Your booking for slot ${slot.startTime}-${slot.endTime} is confirmed.`, type: "BOOKING" }
      });

      return { booking, pointsEarned };
    });

    res.status(201).json(result.booking);
  } catch (err) {
    if (err.message === "Slot not available") {
      return res.status(400).json({ error: "Slot not available" });
    }
    res.status(500).json({ error: "Server error" });
  }
});

// Get user bookings
router.get("/:userId", authenticateToken, async (req, res) => {
  const { userId } = req.params;
  
  if (req.user.userId !== userId && req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Access denied." });
  }
  
  try {
    const bookings = await prisma.booking.findMany({
      where: { userId },
      include: { slot: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Cancel booking
router.patch("/:bookingId/cancel", authenticateToken, async (req, res) => {
  const { bookingId } = req.params;
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { slot: true }
    });

    if (!booking) return res.status(404).json({ error: "Booking not found" });

    if (booking.userId !== req.user.userId && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Access denied." });
    }

    if (booking.status === "CANCELLED") {
      return res.status(400).json({ error: "Booking already cancelled." });
    }

    await prisma.$transaction([
      prisma.booking.update({
        where: { id: bookingId },
        data: { status: "CANCELLED" }
      }),
      prisma.slot.update({
        where: { id: booking.slotId },
        data: { status: "AVAILABLE" }
      }),
      prisma.user.update({
        where: { id: booking.userId },
        data: { pointsBalance: { decrement: booking.pointsEarned } }
      }),
      prisma.notification.create({
        data: {
          userId: booking.userId,
          message: `Your booking for slot ${booking.slot.startTime}-${booking.slot.endTime} has been cancelled.`,
          type: "CANCELLATION"
        }
      })
    ]);

    res.json({ message: "Booking cancelled successfully" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Update booking status (Admin only)
router.patch("/:bookingId/status", authenticateToken, requireAdmin, async (req, res) => {
  const { bookingId } = req.params;
  const { status } = req.body;

  if (!status) return res.status(400).json({ error: "Status is required." });

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { slot: true }
    });

    if (!booking) return res.status(404).json({ error: "Booking not found." });

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status }
    });

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

// Reschedule booking
router.patch("/:bookingId/reschedule", authenticateToken, async (req, res) => {
  const { bookingId } = req.params;
  const { slotId } = req.body;

  if (!slotId) return res.status(400).json({ error: "New Slot ID is required." });

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { slot: true }
    });

    if (!booking) return res.status(404).json({ error: "Booking not found." });

    if (booking.userId !== req.user.userId && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Access denied." });
    }

    if (booking.status === "CANCELLED") {
      return res.status(400).json({ error: "Cannot reschedule a cancelled booking." });
    }

    const result = await prisma.$transaction(async (tx) => {
      const newSlot = await tx.slot.findUnique({ where: { id: slotId } });
      if (!newSlot || newSlot.status === "BOOKED") {
        throw new Error("New slot is not available");
      }

      await tx.slot.update({
        where: { id: booking.slotId },
        data: { status: "AVAILABLE" }
      });

      await tx.slot.update({
        where: { id: slotId },
        data: { status: "BOOKED" }
      });

      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: { slotId }
      });

      await tx.notification.create({
        data: {
          userId: booking.userId,
          message: `Your booking has been rescheduled to ${newSlot.date} (${newSlot.startTime}-${newSlot.endTime}).`,
          type: "RESCHEDULE"
        }
      });

      return updatedBooking;
    });

    res.json(result);
  } catch (err) {
    if (err.message === "New slot is not available") {
      return res.status(400).json({ error: "New slot is not available." });
    }
    console.error("Reschedule Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get all bookings with user name (Admin only)
router.get("/admin/bookings", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        user: {
          select: { name: true }
        },
        slot: true
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(bookings);
  } catch (err) {
    console.error("Admin bookings fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
