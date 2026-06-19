const cron = require('node-cron');
const prisma = require('../lib/prisma');
const { sendEmail, templates } = require('../lib/email');

// Helper to convert "2026-06-18" and "06:00 AM" into a Date object
const parseSlotDateTime = (dateStr, timeStr) => {
  const [time, modifier] = timeStr.split(' ');
  let [hours, minutes] = time.split(':');
  
  if (hours === '12') {
    hours = '00';
  }
  if (modifier === 'PM') {
    hours = parseInt(hours, 10) + 12;
  }
  
  return new Date(`${dateStr}T${hours.toString().padStart(2, '0')}:${minutes}:00`);
};

const startCronJobs = () => {
  console.log('[Cron Service] Starting automated reminder jobs...');

  // 1. Booking Reminder Job (Runs every 15 minutes)
  cron.schedule('*/15 * * * *', async () => {
    try {
      const now = new Date();

      const bookings = await prisma.booking.findMany({
        where: {
          status: 'CONFIRMED',
          OR: [
            { reminderSent2h: false },
            { reminderSent30m: false }
          ]
        },
        include: {
          slot: { include: { branch: true } },
          user: true
        }
      });

      for (const booking of bookings) {
        const slotTime = parseSlotDateTime(booking.slot.date, booking.slot.startTime);
        
        // Check 2 hours reminder
        if (!booking.reminderSent2h) {
          const diffMs = slotTime - now;
          const diffMins = diffMs / (1000 * 60);
          
          // Send if time to slot is <= 120 mins but still > 30 mins
          if (diffMins <= 120 && diffMins > 30) {
            await sendEmail({
              to: booking.user.email,
              subject: "Upcoming EagleBox Booking Reminder",
              userId: booking.userId,
              template: "bookingReminder2h",
              html: templates.bookingReminder2h(
                booking.user.name,
                booking.slot.branch?.name || "EagleBox",
                booking.slot.date,
                booking.slot.startTime,
                booking.id
              )
            });

            await prisma.notification.create({
              data: {
                userId: booking.userId,
                title: "Booking Reminder",
                message: `Your booking starts in 2 hours at ${booking.slot.branch?.name || "EagleBox"}.`,
                type: "BOOKING_REMINDER_2H"
              }
            });

            await prisma.booking.update({
              where: { id: booking.id },
              data: { reminderSent2h: true }
            });
            console.log(`[Cron] Sent 2h reminder for booking ${booking.id}`);
          }
        }

        // Check 30 minutes reminder
        if (!booking.reminderSent30m && (booking.reminderSent2h || (slotTime - now) / (1000 * 60) <= 30)) {
          const diffMs = slotTime - now;
          const diffMins = diffMs / (1000 * 60);
          
          if (diffMins <= 30 && diffMins > 0) {
            await sendEmail({
              to: booking.user.email,
              subject: "Match Starting Soon! 🏏",
              userId: booking.userId,
              template: "bookingReminder30m",
              html: templates.bookingReminder30m(
                booking.user.name,
                booking.slot.branch?.name || "EagleBox",
                booking.slot.startTime
              )
            });

            await prisma.notification.create({
              data: {
                userId: booking.userId,
                title: "Match Starting in 30 Mins",
                message: `Your match at ${booking.slot.branch?.name || "EagleBox"} starts in 30 minutes. Get ready!`,
                type: "BOOKING_REMINDER_30M"
              }
            });

            await prisma.booking.update({
              where: { id: booking.id },
              data: { reminderSent30m: true }
            });
            console.log(`[Cron] Sent 30m reminder for booking ${booking.id}`);
          }
        }
      }
    } catch (err) {
      console.error('[Cron Error - Booking Reminder]', err);
    }
  });

  // 2. Membership Expiry Reminder Job (Runs daily at 08:00 AM)
  cron.schedule('0 8 * * *', async () => {
    try {
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const memberships = await prisma.userMembership.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { expiryReminderSent7d: false },
            { expiryReminderSent3d: false },
            { expiryReminderSent1d: false }
          ]
        },
        include: { user: true }
      });

      for (const ms of memberships) {
        const expiry = new Date(ms.expiryDate);
        expiry.setHours(0, 0, 0, 0);
        
        const diffMs = expiry - now;
        const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const remainingSlots = ms.totalSlots - ms.usedSlots;

        let shouldSend = false;
        let updateField = null;

        if (daysLeft === 7 && !ms.expiryReminderSent7d) {
          shouldSend = true;
          updateField = 'expiryReminderSent7d';
        } else if (daysLeft === 3 && !ms.expiryReminderSent3d) {
          shouldSend = true;
          updateField = 'expiryReminderSent3d';
        } else if (daysLeft === 1 && !ms.expiryReminderSent1d) {
          shouldSend = true;
          updateField = 'expiryReminderSent1d';
        }

        if (shouldSend) {
          await sendEmail({
            to: ms.user.email,
            subject: "Membership Expiry Reminder",
            userId: ms.userId,
            template: "membershipExpiryDetailedReminder",
            html: templates.membershipExpiryDetailedReminder(
              ms.user.name,
              ms.tier,
              ms.expiryDate.toISOString().split('T')[0],
              remainingSlots,
              daysLeft
            )
          });

          await prisma.notification.create({
            data: {
              userId: ms.userId,
              title: "Membership Expiring",
              message: `Your ${ms.tier} membership expires in ${daysLeft} day(s).`,
              type: "MEMBERSHIP_EXPIRY"
            }
          });

          await prisma.userMembership.update({
            where: { id: ms.id },
            data: { [updateField]: true }
          });
          
          console.log(`[Cron] Sent ${daysLeft}d expiry reminder to ${ms.user.email}`);
        }
      }
    } catch (err) {
      console.error('[Cron Error - Membership Expiry]', err);
    }
  });

  // 3. Review Request Reminder Job (Runs every 30 minutes)
  cron.schedule('*/30 * * * *', async () => {
    try {
      const now = new Date();
      const bookings = await prisma.booking.findMany({
        where: {
          reviewGiven: false,
          reviewRequestSent: false,
          status: { in: ['CONFIRMED', 'COMPLETED'] }
        },
        include: {
          slot: { include: { branch: true } },
          user: true
        }
      });

      for (const booking of bookings) {
        const slotEndTime = parseSlotDateTime(booking.slot.date, booking.slot.endTime);
        
        if (slotEndTime < now) {
          await sendEmail({
            to: booking.user.email,
            subject: "Rate Your Experience - EagleBox",
            userId: booking.userId,
            template: "reviewRequest",
            html: templates.reviewRequest(
              booking.user.name,
              booking.slot.branch?.name || "EagleBox",
              booking.id
            )
          });

          await prisma.notification.create({
            data: {
              userId: booking.userId,
              title: "Rate Your Experience",
              message: `How was your game at ${booking.slot.branch?.name}? Leave a review!`,
              type: "REVIEW_REQUEST"
            }
          });

          await prisma.booking.update({
            where: { id: booking.id },
            data: { reviewRequestSent: true, status: 'COMPLETED' }
          });
          
          console.log(`[Cron] Sent review request for booking ${booking.id}`);
        }
      }
    } catch (err) {
      console.error('[Cron Error - Review Request]', err);
    }
  });
};

module.exports = { startCronJobs, parseSlotDateTime };
