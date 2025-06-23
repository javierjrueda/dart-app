import { Request, Response } from "express";
import { BattleUseCases } from "@/application/use-cases/battle.use-cases";

export class BattleController {
  constructor(private battleUseCases: BattleUseCases) {}

  async getRandomBattlePair(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      if (!projectId) {
        res.status(400).json({ error: "Project ID is required" });
        return;
      }

      const battlePair = await this.battleUseCases.getRandomBattlePair(
        projectId
      );

      if (!battlePair) {
        res.status(404).json({
          error: "Not enough media items for battle (minimum 2 required)",
        });
        return;
      }

      res.json({
        mediaA: battlePair.mediaA.toJSON(),
        mediaB: battlePair.mediaB.toJSON(),
      });
    } catch (error) {
      console.error("Error getting battle pair:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async conductBattle(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const { mediaAId, mediaBId, result } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      if (!projectId || !mediaAId || !mediaBId || !result) {
        res.status(400).json({
          error: "Project ID, media IDs, and result are required",
        });
        return;
      }

      if (!["A", "B", "skip"].includes(result)) {
        res.status(400).json({
          error: "Result must be 'A', 'B', or 'skip'",
        });
        return;
      }

      const battleResult = await this.battleUseCases.conductBattle({
        projectId,
        mediaAId,
        mediaBId,
        result,
        userId,
      });

      res.status(201).json({
        battle: battleResult.battle.toJSON(),
        updatedMediaA: battleResult.updatedMediaA.toJSON(),
        updatedMediaB: battleResult.updatedMediaB.toJSON(),
      });
    } catch (error) {
      console.error("Error conducting battle:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async getBattleHistory(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const userId = (req as any).user?.id;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string)
        : undefined;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      if (!projectId) {
        res.status(400).json({ error: "Project ID is required" });
        return;
      }

      const battles = await this.battleUseCases.getBattleHistory(
        projectId,
        limit
      );

      res.json({
        battles: battles.map((battle) => battle.toJSON()),
        total: battles.length,
      });
    } catch (error) {
      console.error("Error getting battle history:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async getBattleStats(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      if (!projectId) {
        res.status(400).json({ error: "Project ID is required" });
        return;
      }

      const stats = await this.battleUseCases.getBattleStats(projectId);

      res.json(stats);
    } catch (error) {
      console.error("Error getting battle stats:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async getLeaderboard(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const userId = (req as any).user?.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      if (!projectId) {
        res.status(400).json({ error: "Project ID is required" });
        return;
      }

      const leaderboard = await this.battleUseCases.getLeaderboard(
        projectId,
        limit
      );

      res.json({
        leaderboard: leaderboard.map((entry) => ({
          media: entry.media.toJSON(),
          rank: entry.rank,
          battlesWon: entry.battlesWon,
          battlesLost: entry.battlesLost,
          totalBattles: entry.totalBattles,
          winRate:
            (entry.totalBattles || 0) > 0
              ? (
                  ((entry.battlesWon || 0) / (entry.totalBattles || 1)) *
                  100
                ).toFixed(1)
              : "0.0",
        })),
        total: leaderboard.length,
      });
    } catch (error) {
      console.error("Error getting leaderboard:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async applyEloPenalties(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const { mediaAId, mediaBId, penaltyType } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      if (!projectId || !mediaAId || !mediaBId || !penaltyType) {
        res.status(400).json({
          error: "Project ID, media IDs, and penalty type are required",
        });
        return;
      }

      if (!["left", "right", "both"].includes(penaltyType)) {
        res.status(400).json({
          error: "Penalty type must be 'left', 'right', or 'both'",
        });
        return;
      }

      const result = await this.battleUseCases.applyEloPenalties({
        projectId,
        mediaAId,
        mediaBId,
        penaltyType,
        userId,
      });

      res.json({
        updatedMediaA: result.updatedMediaA.toJSON(),
        updatedMediaB: result.updatedMediaB.toJSON(),
      });
    } catch (error) {
      console.error("Error applying ELO penalties:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }
}
