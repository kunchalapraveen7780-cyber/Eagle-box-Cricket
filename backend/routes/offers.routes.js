const express = require("express");
const { authenticateToken } = require("../middleware/auth.middleware");
const prisma = require("../lib/prisma");

const router = express.Router();

// Get all active offers/vouchers
router.get("/", authenticateToken, async (req, res) => {
  try {
    const offers = await prisma.offer.findMany({
      orderBy: { validTo: "asc" }
    });
    res.json(offers);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/validate", authenticateToken, async (req, res) => {
  const code = req.body.code;
  const amount = req.body.amount !== undefined && req.body.amount !== null ? req.body.amount : req.body.bookingAmount;

  if (!code) return res.status(400).json({ error: "Offer code is required" });
  if (amount === undefined || amount === null) return res.status(400).json({ error: "Amount/bookingAmount is required" });

  try {
    const offer = await prisma.offer.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (!offer) {
      return res.status(400).json({ error: "Invalid offer code" });
    }

    const now = new Date();
    if (now < new Date(offer.validFrom) || now > new Date(offer.validTo)) {
      return res.status(400).json({ error: "This offer has expired" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const tier = user.membershipTier; // NONE, STARTER, PRO, ELITE, CHAMPION
    if (offer.targetSegment !== "ALL" && offer.targetSegment !== tier) {
      return res.status(400).json({ error: `This offer is only available for ${offer.targetSegment} tier members.` });
    }

    const discountAmount = Math.round((amount * offer.discountPercent / 100) * 100) / 100;
    const finalAmount = Math.max(0, amount - discountAmount);

    res.json({
      valid: true,
      code: offer.code,
      discountPercent: offer.discountPercent,
      discountAmount,
      finalAmount
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
