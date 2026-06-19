const nodemailer = require('nodemailer');
const prisma = require('./prisma');

// Configure Nodemailer for Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || ''
  }
});

const sendEmail = async ({ to, subject, html, userId = null, template = "default" }) => {
  try {
    // Console log the email so it can be previewed during local development
    console.log(`\n📧 --- EMAIL DISPATCH PIPELINE --- 📧`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content:\n${html.replace(/<[^>]*>?/gm, '')}`);
    console.log(`---------------------------------------\n`);

    // If environment variables are missing, simulate success (development fallback)
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('⚠️ EMAIL_USER or EMAIL_PASS not configured in .env. Skipping actual dispatch.');
      return { simulated: true, to, subject };
    }

    const info = await transporter.sendMail({
      from: `"EagleBox Cricket" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });

    await prisma.emailLog.create({
      data: {
        toEmail: to,
        subject,
        status: 'SENT',
        userId,
        template
      }
    });

    return info;
  } catch (error) {
    console.error('Failed to send email:', error);

    await prisma.emailLog.create({
      data: {
        toEmail: to,
        subject,
        status: 'FAILED',
        errorMsg: error.message,
        userId,
        template
      }
    });

    return null;
  }
};

const emailWrapper = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f0fdf4; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
    <div style="background-color: #22c55e; padding: 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 900; letter-spacing: -1px;">EagleBox Cricket</h1>
    </div>
    <div style="padding: 40px 30px;">
      ${content}
    </div>
    <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0; color: #475569; font-size: 14px; font-weight: 500;">Need support? Reply to this email or visit our help center.</p>
      <p style="margin: 12px 0 0 0; color: #94a3b8; font-size: 12px;">&copy; ${new Date().getFullYear()} EagleBox Cricket. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

const templates = {
  bookingConfirmation: (userName, bookingId, groundName, branchLocation, date, time, amount, discount, tier) => emailWrapper(`
    <h2 style="color: #0f172a; margin-top: 0; font-size: 24px;">Booking Confirmed! 🎉</h2>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Hi <strong>${userName}</strong>,</p>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Your turf reservation is locked in and ready to go.</p>
    
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 30px 0;">
      <div style="margin-bottom: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px;">
        <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">Booking ID</p>
        <p style="margin: 4px 0 0 0; color: #0f172a; font-size: 16px; font-weight: 600;">${bookingId}</p>
      </div>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding-bottom: 12px; width: 50%;">
            <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: bold;">Ground</p>
            <p style="margin: 4px 0 0 0; color: #0f172a; font-size: 15px; font-weight: 500;">${groundName}</p>
          </td>
          <td style="padding-bottom: 12px; width: 50%;">
            <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: bold;">Location</p>
            <p style="margin: 4px 0 0 0; color: #0f172a; font-size: 15px; font-weight: 500;">${branchLocation}</p>
          </td>
        </tr>
        <tr>
          <td style="padding-bottom: 12px;">
            <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: bold;">Date</p>
            <p style="margin: 4px 0 0 0; color: #0f172a; font-size: 15px; font-weight: 500;">${date}</p>
          </td>
          <td>
            <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: bold;">Time Slot</p>
            <p style="margin: 4px 0 0 0; color: #0f172a; font-size: 15px; font-weight: 500;">${time}</p>
          </td>
        </tr>
        <tr>
          <td style="padding-top: 12px; border-top: 1px dashed #cbd5e1;">
            <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: bold;">Amount Paid</p>
            <p style="margin: 4px 0 0 0; color: #22c55e; font-size: 18px; font-weight: 700;">₹${amount}</p>
          </td>
          <td style="padding-top: 12px; border-top: 1px dashed #cbd5e1;">
            <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: bold;">Membership / Discount</p>
            <p style="margin: 4px 0 0 0; color: #3b82f6; font-size: 14px; font-weight: 600;">${tier} (Saved ₹${discount})</p>
          </td>
        </tr>
      </table>
    </div>
    
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Please arrive at least 10 minutes prior to your slot time. Don't forget your gear!</p>
    <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-top: 30px;">Cheers,<br/><strong>The EagleBox Team</strong></p>
  `),

  membershipPurchase: (userName, tier, amountPaid) => emailWrapper(`
    <h2 style="color: #0f172a; margin-top: 0; font-size: 24px;">Welcome to the ${tier} Club! 🏆</h2>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Hi <strong>${userName}</strong>,</p>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Your <strong>${tier} Membership</strong> is now officially active!</p>
    <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0;">
      <p style="margin: 0; color: #1e3a8a; font-size: 15px;">You can now use your prepaid slots to book arenas with zero additional cost! Your dashboard has been updated with your new slot balance and priority booking access.</p>
    </div>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Cheers,<br/><strong>The EagleBox Team</strong></p>
  `),

  couponGenerated: (userName, code, amount) => emailWrapper(`
    <h2 style="color: #0f172a; margin-top: 0; font-size: 24px;">You've Unlocked a Reward! 🎉</h2>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Hi <strong>${userName}</strong>,</p>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Congratulations on redeeming your loyalty points! Here is your exclusive coupon code worth ₹${amount}:</p>
    <div style="background-color: #ecfdf5; border: 2px dashed #10b981; padding: 24px; border-radius: 12px; margin: 32px 0; text-align: center;">
      <div style="font-size: 28px; font-weight: 900; color: #059669; letter-spacing: 2px;">${code}</div>
    </div>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Enter this code during checkout on your next turf booking to apply the discount. See you on the pitch!</p>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Cheers,<br/><strong>The EagleBox Team</strong></p>
  `),

  couponRedeemed: (userName, code, amount) => emailWrapper(`
    <h2 style="color: #0f172a; margin-top: 0; font-size: 24px;">Coupon Redeemed Successfully! ✅</h2>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Hi <strong>${userName}</strong>,</p>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Your coupon <strong>${code}</strong> for ₹${amount} has been successfully applied to your recent booking.</p>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Thanks for playing with us!</p>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Cheers,<br/><strong>The EagleBox Team</strong></p>
  `),

  membershipUpgrade: (userName, tier) => emailWrapper(`
    <h2 style="color: #0f172a; margin-top: 0; font-size: 24px;">You've Leveled Up! ⭐</h2>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Hi <strong>${userName}</strong>,</p>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Your loyalty has paid off. You've been automatically upgraded to <strong>${tier}</strong> status!</p>
    <div style="background-color: #fefce8; border-left: 4px solid #eab308; padding: 16px; margin: 24px 0;">
      <p style="margin: 0; color: #854d0e; font-size: 15px;">Log in to your dashboard to see your new permanent booking discounts and upgraded perks.</p>
    </div>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Cheers,<br/><strong>The EagleBox Team</strong></p>
  `),

  membershipRenewal: (userName, tier) => emailWrapper(`
    <h2 style="color: #0f172a; margin-top: 0; font-size: 24px;">Membership Renewed! 🔄</h2>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Hi <strong>${userName}</strong>,</p>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Your <strong>${tier} Membership</strong> has been successfully renewed. Thank you for continuing your journey with us!</p>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Cheers,<br/><strong>The EagleBox Team</strong></p>
  `),

  membershipExpiryReminder: (userName, tier) => emailWrapper(`
    <h2 style="color: #0f172a; margin-top: 0; font-size: 24px;">Membership Expiring Soon ⏰</h2>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Hi <strong>${userName}</strong>,</p>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Your <strong>${tier} Membership</strong> is about to expire. Don't lose your exclusive booking discounts!</p>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Log in to your account today to renew and keep your perks active.</p>
    <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-top: 30px;">Cheers,<br/><strong>The EagleBox Team</strong></p>
  `),

  referralInvitation: (referrerName, referralCode) => emailWrapper(`
    <h2 style="color: #0f172a; margin-top: 0; font-size: 24px;">You've been invited! 🏏</h2>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Hi there,</p>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;"><strong>${referrerName}</strong> has invited you to join EagleBox Cricket, the premier turf booking platform.</p>
    <div style="background-color: #f8fafc; border: 2px dashed #22c55e; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
      <p style="margin: 0; color: #64748b; font-size: 14px; text-transform: uppercase;">Use Referral Code</p>
      <h3 style="margin: 8px 0 0 0; color: #22c55e; font-size: 28px; letter-spacing: 2px;">${referralCode}</h3>
    </div>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Sign up with this code to get an instant bonus on your first booking!</p>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Cheers,<br/><strong>The EagleBox Team</strong></p>
  `),

  referralRewardEarned: (userName, points) => emailWrapper(`
    <h2 style="color: #0f172a; margin-top: 0; font-size: 24px;">Reward Unlocked! 🎁</h2>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Hi <strong>${userName}</strong>,</p>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Someone just signed up using your referral code!</p>
    <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 24px 0;">
      <p style="margin: 0; color: #166534; font-size: 16px; font-weight: 600;">We've credited ${points} Loyalty Points to your account.</p>
    </div>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Keep sharing your code to earn more free turf time.</p>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Cheers,<br/><strong>The EagleBox Team</strong></p>
  `),

  successfulReferralNotification: (userName, friendName) => emailWrapper(`
    <h2 style="color: #0f172a; margin-top: 0; font-size: 24px;">Your squad is growing! 🤝</h2>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Hi <strong>${userName}</strong>,</p>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Great news—<strong>${friendName}</strong> has just joined EagleBox Cricket using your referral code!</p>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Time to book a slot and play a match together.</p>
    <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-top: 30px;">Cheers,<br/><strong>The EagleBox Team</strong></p>
  `),

  bookingReminder2h: (userName, venueName, bookingDate, slotTime, bookingId) => emailWrapper(`
    <h2 style="color: #0f172a; margin-top: 0; font-size: 24px;">Upcoming Booking Reminder</h2>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Hello <strong>${userName}</strong>,</p>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Your booking starts in 2 hours.</p>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 30px 0;">
      <p style="margin: 0 0 10px 0; color: #334155;"><strong>Venue:</strong> ${venueName}</p>
      <p style="margin: 0 0 10px 0; color: #334155;"><strong>Date:</strong> ${bookingDate}</p>
      <p style="margin: 0 0 10px 0; color: #334155;"><strong>Time:</strong> ${slotTime}</p>
      <p style="margin: 0; color: #334155;"><strong>Booking ID:</strong> ${bookingId}</p>
    </div>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Please arrive 10 minutes before your game.</p>
    <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-top: 30px;">Thank you,<br/><strong>EagleBox Team</strong></p>
  `),

  bookingReminder30m: (userName, venueName, slotTime) => emailWrapper(`
    <h2 style="color: #0f172a; margin-top: 0; font-size: 24px;">Match Starting Soon! 🏏</h2>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Hello <strong>${userName}</strong>,</p>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Your EagleBox match starts in 30 minutes.</p>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 30px 0;">
      <p style="margin: 0 0 10px 0; color: #334155;"><strong>Venue:</strong> ${venueName}</p>
      <p style="margin: 0; color: #334155;"><strong>Time:</strong> ${slotTime}</p>
    </div>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">See you on the ground.</p>
  `),

  membershipExpiryDetailedReminder: (userName, membershipName, expiryDate, remainingSlots, daysLeft) => emailWrapper(`
    <h2 style="color: #0f172a; margin-top: 0; font-size: 24px;">Membership Expiry Reminder</h2>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Hello <strong>${userName}</strong>,</p>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Your <strong>${membershipName}</strong> Membership will expire in <strong>${daysLeft} day(s)</strong>.</p>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 30px 0;">
      <p style="margin: 0 0 10px 0; color: #334155;"><strong>Expiry Date:</strong> ${expiryDate}</p>
      <p style="margin: 0; color: #334155;"><strong>Remaining Slots:</strong> ${remainingSlots}</p>
    </div>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Renew now to continue enjoying membership benefits.</p>
    <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-top: 30px;">Thank you,<br/><strong>EagleBox Team</strong></p>
  `),

  supportTicketUpdate: (userName, ticketId, status, adminResponse) => emailWrapper(`
    <h2 style="color: #0f172a; margin-top: 0; font-size: 24px;">Support Ticket Update</h2>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Hello <strong>${userName}</strong>,</p>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Your ticket has been updated.</p>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 30px 0;">
      <p style="margin: 0 0 10px 0; color: #334155;"><strong>Ticket ID:</strong> ${ticketId}</p>
      <p style="margin: 0 0 10px 0; color: #334155;"><strong>Status:</strong> <span style="font-weight: bold;">${status}</span></p>
      <div style="margin-top: 15px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
        <p style="margin: 0 0 5px 0; color: #64748b; font-size: 14px;"><strong>Admin Response:</strong></p>
        <p style="margin: 0; color: #0f172a; font-style: italic;">"${adminResponse}"</p>
      </div>
    </div>
    <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-top: 30px;">Thank you,<br/><strong>EagleBox Support Team</strong></p>
  `),

  reviewRequest: (userName, venueName, bookingId) => emailWrapper(`
    <h2 style="color: #0f172a; margin-top: 0; font-size: 24px;">⭐ Rate Your Experience</h2>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Hello <strong>${userName}</strong>,</p>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">How was your EagleBox experience at <strong>${venueName}</strong>?</p>
    <p style="color: #334155; font-size: 16px; line-height: 1.6;">Leave a review and help other players discover great venues.</p>
    <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-top: 30px;">Thank you,<br/><strong>EagleBox Team</strong></p>
  `)
};

module.exports = { sendEmail, templates };
