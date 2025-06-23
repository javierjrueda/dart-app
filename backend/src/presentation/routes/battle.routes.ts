import { Router } from "express";
import { BattleController } from "../controllers/battle.controller";
import { BattleUseCases } from "@/application/use-cases/battle.use-cases";
import { MongoDBBattleRepository } from "@/infrastructure/repositories/mongodb-battle.repository";
import { MongoDBMediaRepository } from "@/infrastructure/repositories/mongodb-media.repository";
import { requireAuth } from "@/middleware/auth.middleware";

const router = Router();

// Initialize repositories, use cases, and controller
const battleRepository = new MongoDBBattleRepository();
const mediaRepository = new MongoDBMediaRepository();
const battleUseCases = new BattleUseCases(battleRepository, mediaRepository);
const battleController = new BattleController(battleUseCases);

// Apply auth middleware to all routes
router.use(requireAuth);

// GET /api/battles/projects/:projectId/pair - Get random battle pair
router.get("/projects/:projectId/pair", (req, res) =>
  battleController.getRandomBattlePair(req, res)
);

// POST /api/battles/projects/:projectId - Conduct a battle
router.post("/projects/:projectId", (req, res) =>
  battleController.conductBattle(req, res)
);

// POST /api/battles/projects/:projectId/penalties - Apply ELO penalties
router.post("/projects/:projectId/penalties", (req, res) =>
  battleController.applyEloPenalties(req, res)
);

// GET /api/battles/projects/:projectId/history - Get battle history
router.get("/projects/:projectId/history", (req, res) =>
  battleController.getBattleHistory(req, res)
);

// GET /api/battles/projects/:projectId/stats - Get battle statistics
router.get("/projects/:projectId/stats", (req, res) =>
  battleController.getBattleStats(req, res)
);

// GET /api/battles/projects/:projectId/leaderboard - Get media leaderboard
router.get("/projects/:projectId/leaderboard", (req, res) =>
  battleController.getLeaderboard(req, res)
);

export default router;
