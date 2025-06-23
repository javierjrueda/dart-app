import { Battle } from "@/domain/entities/battle.entity";
import { BattleRepository } from "@/domain/repositories/battle.repository";
import { MediaRepository } from "@/domain/repositories/media.repository";
import { Media } from "@/domain/entities/media.entity";

export class BattleUseCases {
  constructor(
    private battleRepository: BattleRepository,
    private mediaRepository: MediaRepository
  ) {}

  /**
   * Get two random media items from a project for battle
   */
  async getRandomBattlePair(projectId: string): Promise<{
    mediaA: Media;
    mediaB: Media;
  } | null> {
    if (!projectId) {
      throw new Error("Project ID is required");
    }

    const mediaList = await this.mediaRepository.findByProjectId(projectId);

    if (mediaList.length < 2) {
      return null; // Not enough media for a battle
    }

    // Randomly select two different media items
    const shuffled = [...mediaList].sort(() => Math.random() - 0.5);
    const mediaA = shuffled[0];
    const mediaB = shuffled[1];

    return { mediaA, mediaB };
  }

  /**
   * Conduct a battle between two media items
   */
  async conductBattle(data: {
    projectId: string;
    mediaAId: string;
    mediaBId: string;
    result: "A" | "B" | "skip";
    userId: string;
  }): Promise<{
    battle: Battle;
    updatedMediaA: Media;
    updatedMediaB: Media;
  }> {
    // Validation
    if (
      !data.projectId ||
      !data.mediaAId ||
      !data.mediaBId ||
      !data.result ||
      !data.userId
    ) {
      throw new Error("All battle data is required");
    }

    if (data.mediaAId === data.mediaBId) {
      throw new Error("Cannot battle the same media item against itself");
    }

    if (!["A", "B", "skip"].includes(data.result)) {
      throw new Error("Invalid battle result");
    }

    // Get current media items
    const [mediaA, mediaB] = await Promise.all([
      this.mediaRepository.findById(data.mediaAId),
      this.mediaRepository.findById(data.mediaBId),
    ]);

    if (!mediaA || !mediaB) {
      throw new Error("One or both media items not found");
    }

    // Ensure both media belong to the same project
    if (
      mediaA.projectId !== data.projectId ||
      mediaB.projectId !== data.projectId
    ) {
      throw new Error("Media items must belong to the specified project");
    }

    // Create battle with ELO calculations
    const battle = Battle.create({
      projectId: data.projectId,
      mediaAId: data.mediaAId,
      mediaBId: data.mediaBId,
      result: data.result,
      userId: data.userId,
      mediaAEloBefore: mediaA.elo,
      mediaBEloBefore: mediaB.elo,
    });

    // Update media ELO ratings (only if not a skip)
    if (data.result !== "skip") {
      mediaA.updateElo(battle.mediaAEloAfter);
      mediaB.updateElo(battle.mediaBEloAfter);
    }

    // Save to database
    const [savedBattle, updatedMediaA, updatedMediaB] = await Promise.all([
      this.battleRepository.create(battle),
      this.mediaRepository.update(data.mediaAId, mediaA),
      this.mediaRepository.update(data.mediaBId, mediaB),
    ]);

    if (!updatedMediaA || !updatedMediaB) {
      throw new Error("Failed to update media ELO ratings");
    }

    return {
      battle: savedBattle,
      updatedMediaA,
      updatedMediaB,
    };
  }

  /**
   * Get battle history for a project
   */
  async getBattleHistory(projectId: string, limit?: number): Promise<Battle[]> {
    if (!projectId) {
      throw new Error("Project ID is required");
    }

    const battles = await this.battleRepository.findByProjectId(projectId);

    // Sort by creation date (most recent first)
    const sorted = battles.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Get battle statistics for a project
   */
  async getBattleStats(projectId: string): Promise<{
    totalBattles: number;
    mediaParticipation: Record<string, number>;
    userParticipation: Record<string, number>;
    topRatedMedia: Array<{ mediaId: string; elo: number }>;
  }> {
    if (!projectId) {
      throw new Error("Project ID is required");
    }

    const [battleStats, mediaList] = await Promise.all([
      this.battleRepository.getBattleStats(projectId),
      this.mediaRepository.findByProjectId(projectId),
    ]);

    // Get top rated media (top 10)
    const topRatedMedia = mediaList
      .sort((a, b) => b.elo - a.elo)
      .slice(0, 10)
      .map((media) => ({
        mediaId: media.id,
        elo: media.elo,
      }));

    return {
      ...battleStats,
      topRatedMedia,
    };
  }

  /**
   * Get leaderboard for a project (media ranked by ELO)
   */
  async getLeaderboard(
    projectId: string,
    limit: number = 50
  ): Promise<
    Array<{
      media: Media;
      rank: number;
      battlesWon?: number;
      battlesLost?: number;
      totalBattles?: number;
    }>
  > {
    if (!projectId) {
      throw new Error("Project ID is required");
    }

    const [mediaList, battles] = await Promise.all([
      this.mediaRepository.findByProjectId(projectId),
      this.battleRepository.findByProjectId(projectId),
    ]);

    // Calculate battle statistics for each media
    const mediaStats = new Map<
      string,
      { won: number; lost: number; total: number }
    >();

    battles.forEach((battle) => {
      if (battle.result !== "skip") {
        // Initialize stats if not exists
        if (!mediaStats.has(battle.mediaAId)) {
          mediaStats.set(battle.mediaAId, { won: 0, lost: 0, total: 0 });
        }
        if (!mediaStats.has(battle.mediaBId)) {
          mediaStats.set(battle.mediaBId, { won: 0, lost: 0, total: 0 });
        }

        const statsA = mediaStats.get(battle.mediaAId)!;
        const statsB = mediaStats.get(battle.mediaBId)!;

        // Update stats based on result
        if (battle.result === "A") {
          statsA.won++;
          statsB.lost++;
        } else if (battle.result === "B") {
          statsB.won++;
          statsA.lost++;
        }

        statsA.total++;
        statsB.total++;
      }
    });

    // Sort by ELO and add rank
    const leaderboard = mediaList
      .sort((a, b) => b.elo - a.elo)
      .slice(0, limit)
      .map((media, index) => {
        const stats = mediaStats.get(media.id);
        return {
          media,
          rank: index + 1,
          battlesWon: stats?.won || 0,
          battlesLost: stats?.lost || 0,
          totalBattles: stats?.total || 0,
        };
      });

    return leaderboard;
  }

  /**
   * Apply ELO penalties to media items
   */
  async applyEloPenalties(data: {
    projectId: string;
    mediaAId: string;
    mediaBId: string;
    penaltyType: "left" | "right" | "both";
    userId: string;
  }): Promise<{
    updatedMediaA: Media;
    updatedMediaB: Media;
  }> {
    // Validation
    if (
      !data.projectId ||
      !data.mediaAId ||
      !data.mediaBId ||
      !data.penaltyType ||
      !data.userId
    ) {
      throw new Error("All penalty data is required");
    }

    if (!["left", "right", "both"].includes(data.penaltyType)) {
      throw new Error("Invalid penalty type");
    }

    // Get current media items
    const [mediaA, mediaB] = await Promise.all([
      this.mediaRepository.findById(data.mediaAId),
      this.mediaRepository.findById(data.mediaBId),
    ]);

    if (!mediaA || !mediaB) {
      throw new Error("One or both media items not found");
    }

    // Ensure both media belong to the same project
    if (
      mediaA.projectId !== data.projectId ||
      mediaB.projectId !== data.projectId
    ) {
      throw new Error("Media items must belong to the specified project");
    }

    const PENALTY_AMOUNT = 500;

    // Apply penalties based on type
    switch (data.penaltyType) {
      case "left":
        mediaA.updateElo(Math.max(0, mediaA.elo - PENALTY_AMOUNT));
        break;
      case "right":
        mediaB.updateElo(Math.max(0, mediaB.elo - PENALTY_AMOUNT));
        break;
      case "both":
        mediaA.updateElo(Math.max(0, mediaA.elo - PENALTY_AMOUNT));
        mediaB.updateElo(Math.max(0, mediaB.elo - PENALTY_AMOUNT));
        break;
    }

    // Save to database
    const [updatedMediaA, updatedMediaB] = await Promise.all([
      this.mediaRepository.update(data.mediaAId, mediaA),
      this.mediaRepository.update(data.mediaBId, mediaB),
    ]);

    if (!updatedMediaA || !updatedMediaB) {
      throw new Error("Failed to update media ELO ratings");
    }

    return {
      updatedMediaA,
      updatedMediaB,
    };
  }
}
