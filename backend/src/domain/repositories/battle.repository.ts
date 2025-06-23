import { Battle } from "../entities/battle.entity";

export interface BattleRepository {
  findAll(): Promise<Battle[]>;
  findById(id: string): Promise<Battle | null>;
  findByProjectId(projectId: string): Promise<Battle[]>;
  findByUserId(userId: string): Promise<Battle[]>;
  findByMediaId(mediaId: string): Promise<Battle[]>;
  create(battle: Battle): Promise<Battle>;
  delete(id: string): Promise<boolean>;

  // Analytics methods
  getBattleStats(projectId: string): Promise<{
    totalBattles: number;
    mediaParticipation: Record<string, number>;
    userParticipation: Record<string, number>;
  }>;
}
