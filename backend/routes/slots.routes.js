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
      include: {
        slotLocks: {
          where: { expiresAt: { gt: new Date() } }
        }
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' }
      ]
    });

    // Deduplicate slots based on startTime to prevent duplicates on frontend
    const uniqueSlotsMap = new Map();
    
    slots.forEach(slot => {
      // If we haven't seen this startTime yet, or if the current slot is BOOKED/LOCKED 
      // (preferring booked/locked over an errant duplicate AVAILABLE slot)
      if (!uniqueSlotsMap.has(slot.startTime) || slot.status !== 'AVAILABLE') {
        uniqueSlotsMap.set(slot.startTime, slot);
      }
    });

    const uniqueSlots = Array.from(uniqueSlotsMap.values());

    const slotsWithLockStatus = uniqueSlots.map(slot => {
      if (slot.status === 'AVAILABLE' && slot.slotLocks && slot.slotLocks.length > 0) {
        return { ...slot, status: 'LOCKED', lockedBy: slot.slotLocks[0].userId };
      }
      return slot;
    });

    res.json(slotsWithLockStatus);
  } catch (err) {
    console.error("Fetch Slots Error:", err);
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

// Get all slot locks (Admin only)
router.get("/admin/slot-locks", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const locks = await prisma.slotLock.findMany({
      where: { expiresAt: { gt: new Date() } },
      include: {
        slot: {
          include: { branch: true }
        },
        user: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(locks);
  } catch (err) {
    console.error("Fetch Slot Locks Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Lock slot
router.post("/:id/lock", authenticateToken, async (req, res) => {
  let { id } = req.params;
  const userId = req.user.userId;
  const { date, time, branchId, price } = req.body;

  try {
    const isMockSlot = id.startsWith('m-ms') || id.startsWith('e-ms');
    let slot;

    if (isMockSlot) {
      if (!date || !time) return res.status(400).json({ error: "Missing details for mock slot lock" });
      const timeParts = time.split('-');
      const startTime = timeParts[0].trim();
      const endTime = timeParts[1].trim();

      // Check if real slot already exists
      slot = await prisma.slot.findFirst({
        where: { date, startTime, endTime, branchId: branchId || null },
        include: { slotLocks: { where: { expiresAt: { gt: new Date() } } } }
      });

      if (!slot) {
        // Create it
        slot = await prisma.slot.create({
          data: {
            date,
            startTime,
            endTime,
            price: parseFloat(price) || 1000,
            branchId: branchId || null,
            status: "AVAILABLE"
          },
          include: { slotLocks: true }
        });
      }
      id = slot.id; // use real ID
    } else {
      slot = await prisma.slot.findUnique({
        where: { id },
        include: { slotLocks: { where: { expiresAt: { gt: new Date() } } } }
      });
    }

    if (!slot || slot.status !== 'AVAILABLE') {
      return res.status(400).json({ error: "Slot is not available" });
    }

    if (slot.slotLocks && slot.slotLocks.length > 0) {
      if (slot.slotLocks[0].userId === userId) {
        return res.json({ message: "You already have a lock on this slot", lock: slot.slotLocks[0], realSlotId: id });
      }
      return res.status(409).json({ error: "Slot is currently locked by another user" });
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const lock = await prisma.slotLock.create({
      data: {
        slot: { connect: { id: id } },
        user: { connect: { id: userId } },
        expiresAt
      }
    });

    global.broadcastSlotUpdate({
      type: 'SLOT_UPDATE',
      slotId: id,
      status: 'LOCKED',
      userId
    });

    res.status(201).json({ lock, realSlotId: id });
  } catch (err) {
    console.error("Lock Slot Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Unlock slot
router.delete("/:id/lock", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    await prisma.slotLock.deleteMany({
      where: {
        slotId: id,
        userId: userId
      }
    });

    global.broadcastSlotUpdate({
      type: 'SLOT_UPDATE',
      slotId: id,
      status: 'AVAILABLE'
    });

    res.json({ message: "Slot unlocked" });
  } catch (err) {
    console.error("Unlock Slot Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
