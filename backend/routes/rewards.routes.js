const express = require("express");
const { authenticateToken } = require("../middleware/auth.middleware");
const prisma = require("../lib/prisma");

const router = express.Router();

router.post("/redeem", authenticateToken, async (req, res) => {
  const { points } = req.body;

  if (!points || ![500, 1000, 1500].includes(points)) {
    return res.status(400).json({ error: "Invalid points value for redemption. Must be 500, 1000, or 1500 points." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.pointsBalance < points) {
      return res.status(400).json({ error: `Insufficient points. You need at least ${points} points, but you have ${user.pointsBalance} points.` });
    }

    let discountPercent = 10;
    if (points === 1000) discountPercent = 20;
    else if (points === 1500) discountPercent = 30;

    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const code = `REDEEM${discountPercent}-${randomSuffix}`;

    const validFrom = new Date();
    const validTo = new Date();
    validTo.setDate(validTo.getDate() + 30); // Valid for 30 days

    const result = await prisma.$transaction(async (tx) => {
      // Deduct points
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { pointsBalance: { decrement: points } }
      });

      // Create Offer coupon
      const offer = await tx.offer.create({
        data: {
          code,
          discountPercent,
          validFrom,
          validTo,
          targetSegment: "ALL"
        }
      });

      // Create Notification
      await tx.notification.create({
        data: {
          userId: user.id,
          message: `Redeemed ${points} points for dynamic coupon "${code}" (${discountPercent}% off your next booking!).`,
          type: "REWARD"
        }
      });

      // Add Audit Log
      await tx.auditLog.create({
        data: {
          adminName: "SYSTEM",
          actionType: "Reward Redemption",
          userAffected: user.id,
          newValue: `Redeemed ${points} pts for ${code}`
        }
      });

      return { offer, updatedUser };
    });

    res.json({
      message: "Reward points successfully redeemed!",
      code: result.offer.code,
      discountPercent: result.offer.discountPercent,
      pointsBalance: result.updatedUser.pointsBalance
    });

  } catch (err) {
    console.error("Redemption Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
