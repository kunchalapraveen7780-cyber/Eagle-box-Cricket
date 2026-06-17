const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require('google-auth-library');
const { authenticateToken } = require("../middleware/auth.middleware");
const prisma = require("../lib/prisma");
const { z } = require("zod");

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email format" }),
  password: z.string().min(1, { message: "Password is required" })
});

const registerSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  email: z.string().email({ message: "Invalid email format" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
  phone: z.string().optional(),
  referralCode: z.string().optional()
});

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID"); // To be configured

router.post("/login", async (req, res) => {
  const validation = loginSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.errors[0].message });
  }
  const { email, password } = validation.data;
  
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    // If user registered via Google, they might not have a password
    if (!user.password) return res.status(401).json({ error: "Please login with Google" });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    
    // Omit password from response
    const { password: _, ...userData } = user;
    res.json({ token, user: userData });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/register", async (req, res) => {
  const validation = registerSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.errors[0].message });
  }
  const { name, email, password, phone, referralCode: incomingReferralCode } = validation.data;

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    let referrer = null;
    if (incomingReferralCode) {
      referrer = await prisma.user.findUnique({
        where: { referralCode: incomingReferralCode }
      });
      if (!referrer) {
        return res.status(400).json({ error: "Invalid referral code" });
      }
    }

    const hashed = await bcrypt.hash(password, 10);
    // basic referral code generation
    const referralCode = name.replace(/\s+/g, "").toUpperCase().substring(0, 4) + Math.floor(Math.random() * 10000);
    
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: { 
          name, 
          email, 
          password: hashed, 
          phone, 
          referralCode,
          pointsBalance: referrer ? 50 : 0
        }
      });

      if (referrer) {
        await tx.user.update({
          where: { id: referrer.id },
          data: { pointsBalance: { increment: 100 } }
        });

        await tx.referral.create({
          data: {
            referrerId: referrer.id,
            referredId: newUser.id,
            pointsAwarded: 100
          }
        });

        await tx.notification.create({
          data: {
            userId: referrer.id,
            message: `${name} registered using your referral code! You earned 100 points.`,
            type: "REFERRAL"
          }
        });

        await tx.notification.create({
          data: {
            userId: newUser.id,
            message: `Welcome to EagleBox! You earned 50 points using a referral code.`,
            type: "REFERRAL"
          }
        });
      }

      return newUser;
    });

    res.status(201).json({ message: "User created" });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ error: "Registration failed." });
  }
});

router.post("/google-login", async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: "No credential provided" });

  try {
    // Verify the Google token
    const verifyOptions = {
      idToken: credential
    };
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== "YOUR_GOOGLE_CLIENT_ID") {
      verifyOptions.audience = process.env.GOOGLE_CLIENT_ID;
    }
    const ticket = await googleClient.verifyIdToken(verifyOptions);
    
    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;

    // Check if user exists
    let user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // If user exists but doesn't have a googleId, update it (linking accounts)
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { email },
          data: { googleId }
        });
      }
    } else {
      // Create new user
      const referralCode = name.replace(/\s+/g, "").toUpperCase().substring(0, 4) + Math.floor(Math.random() * 10000);
      user = await prisma.user.create({
        data: {
          name,
          email,
          googleId,
          referralCode
        }
      });
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    
    const { password: _, ...userData } = user;
    res.json({ token, user: userData });

  } catch (err) {
    console.error("Google Auth Error:", err);
    res.status(401).json({ error: "Invalid Google token" });
  }
});

router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    const { password: _, ...userData } = user;
    res.json(userData);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/profile", authenticateToken, async (req, res) => {
  const { name, phone } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required" });

  try {
    const updated = await prisma.user.update({
      where: { id: req.user.userId },
      data: { name, phone }
    });
    
    await prisma.notification.create({
      data: {
        userId: req.user.userId,
        message: "Your profile details have been updated successfully.",
        type: "PROFILE"
      }
    });

    const { password: _, ...userData } = updated;
    res.json(userData);
  } catch (err) {
    console.error("Profile Update Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
