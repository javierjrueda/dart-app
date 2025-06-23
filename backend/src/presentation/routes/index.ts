import { Router } from "express";
import { dreamshotRoutes } from "./dreamshot.routes";
import { userRoutes } from "./user.routes";
import { authRoutes } from "./auth.routes";
import projectRoutes from "./project.routes";
import { mediaRoutes } from "./media.routes";
import battleRoutes from "./battle.routes";

const router = Router();

// API versioning
const API_VERSION = "/v1";

// Health check for API
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "DART API is running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// Authentication routes (no versioning)
router.use("/auth", authRoutes);

// Route modules
router.use(`${API_VERSION}/dreamshots`, dreamshotRoutes);
router.use(`${API_VERSION}/users`, userRoutes);
router.use(`${API_VERSION}/projects`, projectRoutes);
router.use(`${API_VERSION}`, mediaRoutes);
router.use(`${API_VERSION}/battles`, battleRoutes);

export { router as routes };
