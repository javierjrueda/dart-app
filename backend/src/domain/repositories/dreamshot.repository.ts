import { Dreamshot } from "../entities/dreamshot.entity";

export interface DreamshotRepository {
  findAll(): Promise<Dreamshot[]>;
  findById(id: string): Promise<Dreamshot | null>;
  findByAuthor(author: string): Promise<Dreamshot[]>;
  findByTags(tags: string[]): Promise<Dreamshot[]>;
  create(dreamshot: Dreamshot): Promise<Dreamshot>;
  update(id: string, dreamshot: Partial<Dreamshot>): Promise<Dreamshot | null>;
  delete(id: string): Promise<boolean>;
  findPublic(): Promise<Dreamshot[]>;
  findByRankingRange(
    minRating: number,
    maxRating: number
  ): Promise<Dreamshot[]>;
}
