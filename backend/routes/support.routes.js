const express = require("express");
const { authenticateToken } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/admin.middleware");
const prisma = require("../lib/prisma");
const { sendEmail, templates } = require("../lib/email");

const router = express.Router();

// Helper to generate Ticket ID
const generateTicketId = async (tx) => {
  const currentYear = new Date().getFullYear();
  // We can count existing tickets for this year to format the ID
  const count = await tx.supportTicket.count({
    where: {
      ticketId: { startsWith: `EB-${currentYear}-` }
    }
  });
  const paddedCount = String(count + 1).padStart(4, '0');
  return `EB-${currentYear}-${paddedCount}`;
};

// ==========================================
// CUSTOMER ROUTES
// ==========================================

// Create a new support ticket
router.post("/", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { subject, category, priority, message, attachmentUrl } = req.body;

  if (!subject || !message) {
    return res.status(400).json({ error: "Subject and message are required" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error("User not found");

      const ticketId = await generateTicketId(tx);

      const ticket = await tx.supportTicket.create({
        data: {
          ticketId,
          userId,
          subject,
          category: category || "Other",
          priority: priority || "Medium",
          message,
          attachmentUrl
        }
      });

      // Log an email notification for the customer
      await tx.emailLog.create({
        data: {
          toEmail: user.email,
          subject: `Support Ticket Created: [${ticketId}]`,
          status: "SENT"
        }
      });

      return ticket;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("Error creating ticket:", error);
    res.status(500).json({ error: "Failed to create support ticket" });
  }
});

// Get customer's tickets
router.get("/my-tickets", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(tickets);
  } catch (error) {
    console.error("Error fetching tickets:", error);
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

// ==========================================
// ADMIN ROUTES
// ==========================================

// Get analytics
router.get("/admin/analytics", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const total = await prisma.supportTicket.count();
    const open = await prisma.supportTicket.count({ where: { status: "OPEN" } });
    const pending = await prisma.supportTicket.count({ where: { status: "PENDING" } });
    const resolved = await prisma.supportTicket.count({ where: { status: "RESOLVED" } });

    // Calculate average response time
    // For simplicity, we just check the time difference between updated and created for resolved tickets
    const resolvedTickets = await prisma.supportTicket.findMany({
      where: { status: "RESOLVED" },
      select: { createdAt: true, updatedAt: true }
    });

    let avgResponseTimeHours = 0;
    if (resolvedTickets.length > 0) {
      const totalMs = resolvedTickets.reduce((acc, t) => {
        return acc + (new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime());
      }, 0);
      avgResponseTimeHours = (totalMs / resolvedTickets.length) / (1000 * 60 * 60);
    }

    res.json({
      total,
      open,
      pending,
      resolved,
      avgResponseTimeHours: avgResponseTimeHours.toFixed(1)
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// Get all tickets
router.get("/admin", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      include: {
        user: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(tickets);
  } catch (error) {
    console.error("Error fetching tickets:", error);
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

// Update/Reply to ticket
router.patch("/admin/:id", authenticateToken, requireAdmin, async (req, res) => {
  const ticketIdInternal = req.params.id; // Prisma uuid
  const { status, adminResponse } = req.body;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.supportTicket.findUnique({
        where: { id: ticketIdInternal },
        include: { user: true }
      });

      if (!existing) throw new Error("Ticket not found");

      const updateData = {};
      if (status) updateData.status = status;
      if (adminResponse !== undefined) updateData.adminResponse = adminResponse;

      const ticket = await tx.supportTicket.update({
        where: { id: ticketIdInternal },
        data: updateData
      });

      // Send email if admin replied or status changed
      if (adminResponse || status) {
        // Create in-app notification
        await tx.notification.create({
          data: {
            userId: existing.userId,
            title: "Support Ticket Update",
            message: `Your ticket ${existing.ticketId} has been updated. Status: ${status || existing.status}`,
            type: "SUPPORT_UPDATE"
          }
        });

        // Trigger email
        sendEmail({
          to: existing.user.email,
          subject: "Support Ticket Update - EagleBox",
          userId: existing.userId,
          template: "supportTicketUpdate",
          html: templates.supportTicketUpdate(
            existing.user.name,
            existing.ticketId,
            status || existing.status,
            adminResponse || existing.adminResponse || "No response provided yet."
          )
        });
      }

      return ticket;
    });

    res.json(result);
  } catch (error) {
    console.error("Error updating ticket:", error);
    res.status(500).json({ error: "Failed to update ticket" });
  }
});

module.exports = router;
