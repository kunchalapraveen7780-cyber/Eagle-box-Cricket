const express = require("express");
const { authenticateToken } = require("../middleware/auth.middleware");
const prisma = require("../lib/prisma");

const router = express.Router();

// Get all notifications for logged in user
router.get("/", authenticateToken, async (req, res) => {
  const { unread } = req.query;
  try {
    const whereClause = { userId: req.user.userId };
    if (unread === "true") {
      whereClause.isRead = false;
    }
    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" }
    });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Mark single notification as read
router.patch("/:id/read", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const notif = await prisma.notification.findUnique({
      where: { id }
    });

    if (!notif) return res.status(404).json({ error: "Notification not found" });
    if (notif.userId !== req.user.userId) return res.status(403).json({ error: "Access denied" });

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Mark all notifications as read for logged in user
router.patch("/read-all", authenticateToken, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.userId, isRead: false },
      data: { isRead: true }
    });
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Clear all notifications
router.delete("/clear", authenticateToken, async (req, res) => {
  try {
    await prisma.notification.deleteMany({
      where: { userId: req.user.userId }
    });
    res.json({ message: "All notifications cleared" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
