const express = require("express");
const prisma = require("../lib/prisma");
const { authenticateToken } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const memberships = await prisma.membership.findMany();
    const formatted = memberships.map(m => {
      let benefits = [];
      try {
        benefits = JSON.parse(m.benefitsJson);
      } catch (err) {
        benefits = [m.benefitsJson];
      }
      return {
        ...m,
        benefits
      };
    });
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/purchase", authenticateToken, async (req, res) => {
  const { membershipId } = req.body;
  if (!membershipId) return res.status(400).json({ error: "Membership ID is required" });

  try {
    const membership = await prisma.membership.findUnique({
      where: { id: membershipId }
    });

    if (!membership) {
      return res.status(404).json({ error: "Membership plan not found" });
    }

    const tierName = membership.name.toUpperCase();
    let welcomePoints = 200;
    if (tierName === "GOLD") welcomePoints = 500;
    else if (tierName === "PLATINUM") welcomePoints = 1000;

    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: req.user.userId },
        data: {
          membershipTier: tierName,
          pointsBalance: { increment: welcomePoints }
        }
      });

      await tx.notification.create({
        data: {
          userId: req.user.userId,
          message: `Successfully purchased ${membership.name} Membership! Welcome points (+${welcomePoints} pts) awarded.`,
          type: "MEMBERSHIP"
        }
      });

      return updatedUser;
    });

    const { password: _, ...userData } = result;
    res.json({ message: "Membership purchased successfully!", user: userData });

  } catch (err) {
    console.error("Membership Purchase Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
