import { Router } from "express";
import {
  requireAuth,
  optionalAuth,
  AuthenticatedRequest,
} from "@/middleware/auth.middleware";

const router = Router();

// Get current user profile (protected)
router.get("/profile", requireAuth, (req: AuthenticatedRequest, res) => {
  res.json({
    success: true,
    user: req.user,
    session: {
      id: req.session?.id,
      expiresAt: req.session?.expiresAt,
    },
  });
});

// Get user stats (optional auth - different response based on auth status)
router.get("/stats", optionalAuth, (req: AuthenticatedRequest, res) => {
  if (req.user) {
    res.json({
      success: true,
      authenticated: true,
      user: {
        id: req.user.id,
        name: req.user.name,
      },
      stats: {
        dreamshotsCount: 0, // This would come from database
        annotationsCount: 0,
        rankingsCount: 0,
      },
    });
  } else {
    res.json({
      success: true,
      authenticated: false,
      message: "Sign in to view your personalized stats",
      publicStats: {
        totalUsers: 500,
        totalDreamshots: 10000,
        totalAnnotations: 50000,
      },
    });
  }
});

export { router as userRoutes };
