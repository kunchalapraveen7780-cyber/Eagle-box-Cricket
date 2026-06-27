const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { authenticateToken } = require("../middleware/auth.middleware");
const prisma = new PrismaClient();

// Public: Get homepage / venue reviews
router.get("/public", async (req, res) => {
  try {
    const { branchId } = req.query;

    let whereClause = { isApproved: true };
    if (branchId) {
      whereClause.branchId = branchId;
    }

    const reviews = await prisma.review.findMany({
      where: whereClause,
      include: {
        branch: { select: { name: true } }
      },
      orderBy: [
        { isFeatured: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 20
    });

    res.json(reviews);
  } catch (err) {
    console.error("Public reviews fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// User: Get my reviews
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const reviews = await prisma.review.findMany({
      where: { userId },
      include: {
        branch: { select: { name: true, location: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(reviews);
  } catch (err) {
    console.error("My reviews fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// User: Submit a new review
router.post("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { bookingId, rating, message } = req.body;

    if (!bookingId || !rating || !message) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { slot: true, user: true }
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (booking.userId !== userId) {
      return res.status(403).json({ error: "Unauthorized to review this booking" });
    }

    const isDemoMode = process.env.DEMO_MODE === 'true';

    if (!isDemoMode) {
      // Must be confirmed or completed
      if (booking.status !== "CONFIRMED" && booking.status !== "COMPLETED") {
        return res.status(400).json({ error: "Can only review confirmed or completed bookings" });
      }

      // Match End Time has passed
      const now = new Date();
      const matchEndTime = new Date(`${booking.slot.date}T${booking.slot.endTime}`);
      if (matchEndTime > now) {
        return res.status(400).json({ error: "Can only review bookings that have already completed" });
      }
    }

    const existing = await prisma.review.findUnique({
      where: { bookingId }
    });

    if (existing || booking.reviewGiven) {
      return res.status(400).json({ error: "You have already submitted a review for this booking" });
    }

    const newReview = await prisma.review.create({
      data: {
        userId,
        userName: booking.user.name || req.user.name || "Anonymous",
        branchId: booking.slot.branchId,
        bookingId,
        rating,
        message,
        isApproved: true,
        isFeatured: false
      }
    });

    await prisma.booking.update({
      where: { id: bookingId },
      data: { reviewGiven: true }
    });

    res.status(201).json({ message: "Review submitted successfully!", review: newReview });
  } catch (err) {
    console.error("Review submission error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
