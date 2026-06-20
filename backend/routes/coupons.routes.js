const express = require("express");
const { authenticateToken } = require("../middleware/auth.middleware");
const prisma = require("../lib/prisma");

const router = express.Router();

// Redeem points for a coupon
router.post("/redeem", authenticateToken, async (req, res) => {
  const { pointsToRedeem } = req.body;
  const userId = req.user.userId;

  if (!pointsToRedeem || pointsToRedeem < 1000 || pointsToRedeem % 1000 !== 0) {
    return res.status(400).json({ error: "Invalid points amount. Must be in multiples of 1000." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.pointsBalance < pointsToRedeem) {
      return res.status(400).json({ error: "Insufficient loyalty points." });
    }

    const discountAmount = pointsToRedeem / 10; // 1000 points = ₹100
    const code = `EAGLE${discountAmount}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    const result = await prisma.$transaction(async (tx) => {
      // Deduct points
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { pointsBalance: { decrement: pointsToRedeem } }
      });

      // Create coupon
      const coupon = await tx.coupon.create({
        data: {
          code,
          discountAmount,
          userId
        }
      });

      // Notification
      await tx.notification.create({
        data: {
          userId,
          message: `You redeemed ${pointsToRedeem} points for a ₹${discountAmount} coupon (${code}).`,
          type: "COUPON"
        }
      });

      return { updatedUser, coupon };
    });

    // Send Email
    if (result.updatedUser.email) {
      const { sendEmail, templates } = require('../lib/email');
      sendEmail({
        to: result.updatedUser.email,
        subject: "Your Loyalty Coupon - EagleBox",
        html: templates.couponGenerated(result.updatedUser.name, code, discountAmount)
      });
    }

    res.status(201).json({
      success: true,
      message: "Points redeemed successfully",
      coupon: result.coupon,
      pointsBalance: result.updatedUser.pointsBalance
    });
  } catch (err) {
    console.error("Coupon Redemption Error:", err);
    res.status(500).json({ error: "Failed to redeem points." });
  }
});

// Get user coupons
router.get("/", authenticateToken, async (req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: "desc" }
    });
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ error: "Server error fetching coupons" });
  }
});

module.exports = router;
