const express = require("express");
const prisma = require("../lib/prisma");
const { authenticateToken } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/admin.middleware");

const router = express.Router();

router.get("/", async (req, res) => {
  const { date, branchId } = req.query; // format: YYYY-MM-DD
  
  try {
    const whereClause = {};
    if (date) {
      whereClause.date = date;
    }
    if (branchId) {
      whereClause.branchId = branchId;
    }

    const slots = await prisma.slot.findMany({
      where: whereClause,
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' }
      ]
    });
    res.json(slots);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Create slot (Admin only)
router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  const { date, startTime, endTime, price, branchId } = req.body;
  if (!date || !startTime || !endTime || !price) {
    return res.status(400).json({ error: "Date, startTime, endTime, and price are required." });
  }

  try {
    const slot = await prisma.slot.create({
      data: {
        date,
        startTime,
        endTime,
        price: parseFloat(price),
        branchId: branchId || null
      }
    });
    res.status(201).json(slot);
  } catch (err) {
    console.error("Create Slot Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete slot (Admin only)
router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const bookingCount = await prisma.booking.count({ where: { slotId: id } });
    if (bookingCount > 0) {
      return res.status(400).json({ error: "Cannot delete slot because it has active bookings." });
    }

    await prisma.slot.delete({
      where: { id }
    });
    res.json({ message: "Slot deleted successfully." });
  } catch (err) {
    console.error("Delete Slot Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
