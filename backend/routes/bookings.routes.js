const express = require("express");
const { authenticateToken } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/admin.middleware");
const prisma = require("../lib/prisma");

const router = express.Router();

// Create booking
router.post("/", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { slotId, amountPaid, discountApplied, date, time, branchId, userMembershipId } = req.body;

  console.log(`\n--- NEW BOOKING INITIATED ---`);
  console.log(`[UserId]: ${userId}`);
  console.log(`[SlotId]: ${slotId}`);
  console.log(`[Ground/BranchId]: ${branchId}`);
  console.log(`[Booking Date]: ${date}`);
  console.log(`[userMembershipId]: ${userMembershipId}`);
  console.log(`[BookingType Intent]: ${userMembershipId ? "PREPAID" : "PAID"}`);
  console.log(`[Payment Amount]: ₹${amountPaid} (Discount: ₹${discountApplied})`);
  console.log(`[Request Body]:`, req.body);
  console.log(`-----------------------------\n`);

  try {
    const result = await prisma.$transaction(async (tx) => {
      let actualSlotId = slotId;
      let slot;

      const isMockSlot = slotId.startsWith('m-ms') || slotId.startsWith('e-ms');

      if (isMockSlot) {
        if (!date || !time || !branchId) {
          throw new Error("Missing details for dynamic slot creation");
        }
        const timeParts = time.split('-');
        const startTime = timeParts[0].trim();
        const endTime = timeParts[1].trim();

        // Check if a slot already exists to prevent duplicate creation
        const existingSlot = await tx.slot.findFirst({
          where: { date, startTime, endTime }
        });

        if (existingSlot) {
          if (existingSlot.status === "BOOKED") throw new Error("Slot not available");
          actualSlotId = existingSlot.id;
          slot = existingSlot;
          await tx.slot.update({ where: { id: actualSlotId }, data: { status: "BOOKED" } });
        } else {
          // Check if branch exists to prevent Foreign Key constraint error
          const branchExists = await tx.branch.findUnique({ where: { id: branchId } });

          slot = await tx.slot.create({
            data: {
              date,
              startTime,
              endTime,
              price: amountPaid + discountApplied,
              branchId: branchExists ? branchId : null,
              status: "BOOKED"
            }
          });
          actualSlotId = slot.id;
        }
      } else {
        // Basic conflict prevention (atomic check inside transaction)
        slot = await tx.slot.findUnique({
          where: { id: slotId },
          include: { slotLocks: { where: { expiresAt: { gt: new Date() } } } }
        });

        if (!slot || slot.status === "BOOKED") {
          throw new Error("Slot not available");
        }

        if (slot.slotLocks && slot.slotLocks.length > 0 && slot.slotLocks[0].userId !== userId) {
          throw new Error("Slot is currently locked by another user");
        }

        // Mark slot as booked
        await tx.slot.update({
          where: { id: slotId },
          data: { status: "BOOKED" }
        });

        // Release any locks
        await tx.slotLock.deleteMany({
          where: { slotId: slotId }
        });
      }

      // Verify user exists to prevent stale JWT foreign key errors
      const existingUser = await tx.user.findUnique({ where: { id: userId } });
      if (!existingUser) {
        throw new Error("User session invalid. Please log out and log in again.");
      }

      // Check for Prepaid Slot Consumption
      let finalAmountPaid = amountPaid;
      let finalDiscountApplied = discountApplied;
      let consumedPrepaidSlot = false;
      let usedMembershipTier = "NONE";

      if (userMembershipId) {
        const userMembership = await tx.userMembership.findUnique({
          where: { id: userMembershipId }
        });
        if (!userMembership || userMembership.userId !== userId) {
          throw new Error("Invalid membership selected.");
        }
        if (userMembership.status !== "ACTIVE" || userMembership.usedSlots >= userMembership.totalSlots) {
          throw new Error("Selected membership is inactive or out of slots.");
        }

        usedMembershipTier = userMembership.tier;
        finalAmountPaid = 0;
        finalDiscountApplied = slot.price; // the full price is discounted
        consumedPrepaidSlot = true;
      } else if (req.body.couponCode) {
        // Validate Coupon
        const coupon = await tx.coupon.findUnique({ where: { code: req.body.couponCode } });
        if (!coupon || coupon.isUsed) {
          throw new Error("Invalid or already used coupon code.");
        }
        if (coupon.userId !== userId) {
          throw new Error("You do not own this coupon.");
        }

        finalDiscountApplied = coupon.discountAmount;
        finalAmountPaid = Math.max(0, slot.price - finalDiscountApplied);

        // Mark coupon as used
        await tx.coupon.update({
          where: { id: coupon.id },
          data: { isUsed: true, usedAt: new Date() }
        });
      }

      const pointsEarned = 50; // Flat 50 points per booking

      const booking = await tx.booking.create({
        data: {
          userId,
          slotId: actualSlotId,
          amountPaid: finalAmountPaid,
          discountApplied: finalDiscountApplied,
          pointsEarned,
          bookingType: consumedPrepaidSlot ? "PREPAID" : "PAID",
          userMembershipId: consumedPrepaidSlot ? userMembershipId : null
        }
      });

      // Update user points, and spend logic
      const userUpdateData = {
        pointsBalance: { increment: pointsEarned },
        totalSpent: { increment: finalAmountPaid },
        lifetimeSavings: { increment: finalDiscountApplied }
      };

      const user = await tx.user.update({
        where: { id: userId },
        data: userUpdateData
      });

      if (consumedPrepaidSlot) {
        await tx.userMembership.update({
          where: { id: userMembershipId },
          data: { usedSlots: { increment: 1 } }
        });

        // Check if fully consumed
        const updatedMem = await tx.userMembership.findUnique({ where: { id: userMembershipId } });
        if (updatedMem.usedSlots >= updatedMem.totalSlots) {
          await tx.userMembership.update({
            where: { id: userMembershipId },
            data: { status: "CONSUMED" }
          });
        }
      }

      // Add notification for booking
      await tx.notification.create({
        data: { userId, message: `Your booking for slot ${slot.startTime}-${slot.endTime} is confirmed.`, type: "BOOKING" }
      });

      // Add Audit Log
      await tx.auditLog.create({
        data: {
          adminName: "SYSTEM",
          actionType: "Booking Confirmation",
          userAffected: userId,
          newValue: `Booking ID: ${booking.id}`
        }
      });

      let branchData = null;
      if (slot.branchId) {
        branchData = await tx.branch.findUnique({ where: { id: slot.branchId } });
      }

      return { booking, pointsEarned, slot, user, branchData, usedMembershipTier };
    });

    // Send Email notification (Awaited for Vercel serverless compatibility)
    // Note: sendEmail has a built-in try-catch so it will never throw or block the 201 response if it fails
    if (result.user && result.user.email) {
      const { sendEmail, templates } = require('../lib/email');
      const groundName = result.branchData ? result.branchData.name : "Eagle Box Cricket";
      const branchLocation = result.branchData ? result.branchData.location : "Main Arena, Bengaluru";

      await sendEmail({
        to: result.user.email,
        subject: "Booking Confirmed - Eagle Box Cricket",
        html: templates.bookingConfirmation(
          result.user.name,
          result.booking.id,
          groundName,
          branchLocation,
          result.slot.date,
          `${result.slot.startTime} - ${result.slot.endTime}`,
          result.booking.amountPaid,
          result.booking.discountApplied,
          result.usedMembershipTier || "NONE"
        )
      });
    }

    if (global.broadcastSlotUpdate) {
      global.broadcastSlotUpdate({
        type: "SLOT_UPDATE",
        slotId: result.booking.slotId,
        status: "BOOKED",
        date: result.slot.date,
        branchId: result.slot.branchId,
        userId: result.booking.userId
      });
    }

    res.status(201).json({
      success: true,
      bookingId: result.booking.id,
      message: "Booking created successfully",
      // Include full booking for backward compatibility if needed
      ...result.booking
    });
  } catch (err) {
    console.error(`\n[!] Booking Creation Failed: ${err.message}\n`, err.stack || err);
    const actualErrorMsg = err.message || String(err) || "Server error";
    if (actualErrorMsg === "User session invalid. Please log out and log in again.") {
      return res.status(401).json({ success: false, error: actualErrorMsg });
    }
    if (actualErrorMsg === "Slot not available" || actualErrorMsg === "Missing details for dynamic slot creation" || actualErrorMsg === "Slot is currently locked by another user") {
      return res.status(400).json({ success: false, error: actualErrorMsg });
    }
    res.status(500).json({ success: false, error: actualErrorMsg });
  }
});

// Get user bookings
router.get("/:userId", authenticateToken, async (req, res) => {
  const { userId } = req.params;

  if (req.user.userId !== userId && req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Access denied." });
  }

  try {
    const rawBookings = await prisma.booking.findMany({
      where: { userId },
      include: { slot: { include: { branch: true } }, review: true, userMembership: { select: { tier: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const now = new Date();
    let upcomingCount = 0;
    let historyCount = 0;
    let cancelledCount = 0;

    const bookings = rawBookings.map(b => {
      let currentStatus = (b.status || "CONFIRMED").toUpperCase();
      const slotEndDateTime = new Date(`${b.slot.date} ${b.slot.endTime}`);

      if (currentStatus === "CONFIRMED" && slotEndDateTime < now) {
        currentStatus = "COMPLETED";
      }

      const processedBooking = { ...b, status: currentStatus };

      if (currentStatus === "CANCELLED") {
        cancelledCount++;
      } else if (currentStatus === "COMPLETED") {
        historyCount++;
      } else if (currentStatus === "CONFIRMED" && slotEndDateTime > now) {
        upcomingCount++;
      } else if (currentStatus === "CONFIRMED" && slotEndDateTime <= now) {
        historyCount++;
      }

      return processedBooking;
    });

    res.json({
      success: true,
      bookings,
      counts: {
        upcoming: upcomingCount,
        history: historyCount,
        cancelled: cancelledCount
      }
    });
  } catch (err) {
    console.error("Fetch bookings error:", err);
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

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: "CANCELLED" }
      });
      await tx.slot.update({
        where: { id: booking.slotId },
        data: { status: "AVAILABLE" }
      });
      await tx.user.update({
        where: { id: booking.userId },
        data: {
          pointsBalance: { decrement: booking.pointsEarned },
          totalSpent: { decrement: booking.amountPaid },
          lifetimeSavings: { decrement: booking.discountApplied }
        }
      });

      if (booking.bookingType === "PREPAID" && booking.userMembershipId) {
        await tx.userMembership.update({
          where: { id: booking.userMembershipId },
          data: { usedSlots: { decrement: 1 }, status: "ACTIVE" } // status back to ACTIVE if it was CONSUMED
        });
      }

      await tx.notification.create({
        data: {
          userId: booking.userId,
          message: `Your booking for slot ${booking.slot.startTime}-${booking.slot.endTime} has been cancelled.`,
          type: "CANCELLATION"
        }
      });
    });

    // Send Cancellation Email
    const user = await prisma.user.findUnique({ where: { id: booking.userId } });
    if (user && user.email) {
      const { sendEmail } = require('../lib/email');
      await sendEmail({
        to: user.email,
        subject: "Booking Cancelled - Eagle Box Cricket",
        html: `<p>Hi ${user.name}, your booking for ${booking.slot.date} at ${booking.slot.startTime} has been cancelled.</p>`
      });
    }

    if (global.broadcastSlotUpdate) {
      global.broadcastSlotUpdate({
        type: "SLOT_UPDATE",
        slotId: booking.slotId,
        status: "AVAILABLE",
        date: booking.slot.date,
        branchId: booking.slot.branchId
      });
    }

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

      return { updatedBooking, newSlot };
    });

    if (global.broadcastSlotUpdate) {
      global.broadcastSlotUpdate({
        type: "SLOT_UPDATE",
        slotId: booking.slotId,
        status: "AVAILABLE",
        date: booking.slot.date,
        branchId: booking.slot.branchId
      });
      global.broadcastSlotUpdate({
        type: "SLOT_UPDATE",
        slotId: slotId,
        status: "BOOKED",
        date: result.newSlot.date,
        branchId: result.newSlot.branchId
      });
    }

    res.json(result.updatedBooking);
  } catch (err) {
    if (err.message === "New slot is not available") {
      return res.status(400).json({ error: "New slot is not available." });
    }
    console.error("Reschedule Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;