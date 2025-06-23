import { Router } from "express";
import bcrypt from "bcryptjs";
import { MongoDBUserRepository } from "@/infrastructure/repositories/mongodb-user.repository";
import { createAuthToken, verifyAuth } from "@/lib/auth";
import { connectDatabase } from "@/infrastructure/database/connection";

const router = Router();

// Sign up endpoint
router.post("/signup", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await connectDatabase();
    const userRepo = new MongoDBUserRepository();

    // Check if user already exists
    const existingUser = await userRepo.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Create user
    const user = await userRepo.createUser({
      name,
      email,
      role: "user"
    });

    // Hash password and create account
    const hashedPassword = await bcrypt.hash(password, 10);
    await userRepo.createAccount({
      userId: user.id,
      email,
      hashedPassword
    });

    // Create token
    const token = await createAuthToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      image: user.image
    });

    return res.json({
      user: user.toProfile(),
      token
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Sign in endpoint
router.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Missing credentials" });
    }

    await connectDatabase();
    const userRepo = new MongoDBUserRepository();

    // Find user
    const user = await userRepo.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check password
    const accounts = await userRepo.findAccountsByUserId(user.id);
    const credentialAccount = accounts.find(acc => acc.providerId === "credential");
    
    if (!credentialAccount || !credentialAccount.password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, credentialAccount.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Create token
    const token = await createAuthToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      image: user.image
    });

    return res.json({
      user: user.toProfile(),
      token
    });
  } catch (error) {
    console.error("Signin error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get session endpoint
router.get("/session", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.substring(7);
    const decoded = await verifyAuth(token);
    
    if (!decoded) {
      return res.status(401).json({ error: "Invalid token" });
    }

    await connectDatabase();
    const userRepo = new MongoDBUserRepository();
    const user = await userRepo.findUserById(decoded.id);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({
      user: user.toProfile(),
      expires: new Date(decoded.exp * 1000).toISOString()
    });
  } catch (error) {
    console.error("Session error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Sign out endpoint (client-side token removal)
router.post("/signout", (req, res) => {
  return res.json({ success: true });
});

export { router as authRoutes };
