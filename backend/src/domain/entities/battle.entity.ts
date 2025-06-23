export interface BattleProfile {
  id: string;
  projectId: string;
  mediaAId: string;
  mediaBId: string;
  result: "A" | "B" | "skip";
  userId: string;
  mediaAEloBefore: number;
  mediaBEloBefore: number;
  mediaAEloAfter: number;
  mediaBEloAfter: number;
  createdAt: Date;
}

export class Battle {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public readonly mediaAId: string,
    public readonly mediaBId: string,
    public readonly result: "A" | "B" | "skip",
    public readonly userId: string,
    public readonly mediaAEloBefore: number,
    public readonly mediaBEloBefore: number,
    public readonly mediaAEloAfter: number,
    public readonly mediaBEloAfter: number,
    public readonly createdAt: Date = new Date()
  ) {}

  static create(data: {
    projectId: string;
    mediaAId: string;
    mediaBId: string;
    result: "A" | "B" | "skip";
    userId: string;
    mediaAEloBefore: number;
    mediaBEloBefore: number;
  }): Battle {
    // Calculate new ELO ratings
    const { mediaAEloAfter, mediaBEloAfter } = Battle.calculateEloRatings(
      data.mediaAEloBefore,
      data.mediaBEloBefore,
      data.result
    );

    return new Battle(
      Battle.generateId(),
      data.projectId,
      data.mediaAId,
      data.mediaBId,
      data.result,
      data.userId,
      data.mediaAEloBefore,
      data.mediaBEloBefore,
      mediaAEloAfter,
      mediaBEloAfter
    );
  }

  /**
   * Calculate new ELO ratings based on battle result
   * Uses standard ELO formula with K-factor of 32
   */
  static calculateEloRatings(
    eloA: number,
    eloB: number,
    result: "A" | "B" | "skip"
  ): { mediaAEloAfter: number; mediaBEloAfter: number } {
    const K_FACTOR = 32; // Can be adjusted for more/less dramatic rating changes

    // Skip means no change to either rating
    if (result === "skip") {
      return {
        mediaAEloAfter: eloA,
        mediaBEloAfter: eloB,
      };
    }

    // Calculate expected scores
    const expectedA = 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
    const expectedB = 1 / (1 + Math.pow(10, (eloA - eloB) / 400));

    // Determine actual scores
    const actualA = result === "A" ? 1 : 0;
    const actualB = result === "B" ? 1 : 0;

    // Calculate new ratings
    const newEloA = Math.round(eloA + K_FACTOR * (actualA - expectedA));
    const newEloB = Math.round(eloB + K_FACTOR * (actualB - expectedB));

    return {
      mediaAEloAfter: newEloA,
      mediaBEloAfter: newEloB,
    };
  }

  /**
   * Get the expected probability of Media A winning against Media B
   */
  static getWinProbability(eloA: number, eloB: number): number {
    return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
  }

  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  toProfile(): BattleProfile {
    return {
      id: this.id,
      projectId: this.projectId,
      mediaAId: this.mediaAId,
      mediaBId: this.mediaBId,
      result: this.result,
      userId: this.userId,
      mediaAEloBefore: this.mediaAEloBefore,
      mediaBEloBefore: this.mediaBEloBefore,
      mediaAEloAfter: this.mediaAEloAfter,
      mediaBEloAfter: this.mediaBEloAfter,
      createdAt: this.createdAt,
    };
  }

  toJSON() {
    return this.toProfile();
  }
}
