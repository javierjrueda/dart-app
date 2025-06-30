import { Request, Response, NextFunction } from "express";
import { verifyAuth } from "@/lib/auth-utils";
import { MongoDBUserRepository } from "@/infrastructure/repositories/mongodb-user.repository";
import { ensureDatabaseConnection } from "@/infrastructure/database/connection";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
    image?: string | null;
    role: string;
  };
  session?: {
    id: string;
    userId: string;
    expiresAt: Date;
  };
}

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = await verifyAuth(token);

    if (!decoded) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Invalid or expired token",
      });
      return;
    }

    // Ensure database connection (safe to call multiple times)
    await ensureDatabaseConnection();
    const userRepo = new MongoDBUserRepository();
    const user = await userRepo.findUserById(decoded.id);

    if (!user) {
      res.status(401).json({
        error: "Unauthorized",
        message: "User not found",
      });
      return;
    }

    req.user = user.toProfile();
    req.session = {
      id: token.substring(0, 8), // Mock session ID from token
      userId: user.id,
      expiresAt: new Date(decoded.exp * 1000),
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({
      error: "Unauthorized",
      message: "Invalid or expired session",
    });
  }
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      next();
      return;
    }

    const token = authHeader.substring(7);
    const decoded = await verifyAuth(token);

    if (decoded) {
      // Ensure database connection (safe to call multiple times)
      await ensureDatabaseConnection();
      const userRepo = new MongoDBUserRepository();
      const user = await userRepo.findUserById(decoded.id);

      if (user) {
        req.user = user.toProfile();
        req.session = {
          id: token.substring(0, 8), // Mock session ID from token
          userId: user.id,
          expiresAt: new Date(decoded.exp * 1000),
        };
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};
