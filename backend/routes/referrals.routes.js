const express = require("express");
const { authenticateToken } = require("../middleware/auth.middleware");
const prisma = require("../lib/prisma");

const router = express.Router();

// Get referral code and statistics
router.get("/my-code", authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { referralCode: true, pointsBalance: true }
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    // Find all referrals made by this user
    const referrals = await prisma.referral.findMany({
      where: { referrerId: req.user.userId },
      include: {
        referred: {
          select: { name: true, email: true, createdAt: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const totalReferrals = referrals.length;
    const totalPointsEarned = referrals.reduce((sum, r) => sum + r.pointsAwarded, 0);

    res.json({
      referralCode: user.referralCode,
      totalReferrals,
      totalPointsEarned,
      referrals
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Apply referral code for logged in user post-registration
router.post("/apply", authenticateToken, async (req, res) => {
  const { referralCode } = req.body;
  if (!referralCode) return res.status(400).json({ error: "Referral code is required" });

  try {
    // Check if the current user was already referred by someone
    const existingReferral = await prisma.referral.findFirst({
      where: { referredId: req.user.userId }
    });

    if (existingReferral) {
      return res.status(400).json({ error: "You have already applied a referral code." });
    }

    // Look up the referrer
    const referrer = await prisma.user.findUnique({
      where: { referralCode }
    });

    if (!referrer) {
      return res.status(400).json({ error: "Invalid referral code" });
    }

    if (referrer.id === req.user.userId) {
      return res.status(400).json({ error: "You cannot refer yourself." });
    }

    // Create the linkage inside a transaction to ensure integrity
    const referralRecord = await prisma.$transaction(async (tx) => {
      const pointsReferrer = 100;
      const pointsReferred = 50;

      await tx.user.update({
        where: { id: referrer.id },
        data: { pointsBalance: { increment: pointsReferrer } }
      });

      await tx.user.update({
        where: { id: req.user.userId },
        data: { pointsBalance: { increment: pointsReferred } }
      });

      const ref = await tx.referral.create({
        data: {
          referrerId: referrer.id,
          referredId: req.user.userId,
          pointsAwarded: pointsReferrer
        }
      });

      // Create notifications
      await tx.notification.create({
        data: {
          userId: referrer.id,
          message: `Your friend registered using your referral code! You earned ${pointsReferrer} points.`,
          type: "REFERRAL"
        }
      });

      await tx.notification.create({
        data: {
          userId: req.user.userId,
          message: `Referral code successfully applied! You earned ${pointsReferred} points.`,
          type: "REFERRAL"
        }
      });

      return ref;
    });

    res.json({ message: "Referral code applied successfully!", referral: referralRecord });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
