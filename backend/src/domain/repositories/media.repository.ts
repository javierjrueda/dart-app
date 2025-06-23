import { Media } from "../entities/media.entity";

export interface MediaRepository {
  findAll(): Promise<Media[]>;
  findById(id: string): Promise<Media | null>;
  findByProjectId(projectId: string): Promise<Media[]>;
  create(media: Media): Promise<Media>;
  update(id: string, media: Partial<Media>): Promise<Media | null>;
  delete(id: string): Promise<boolean>;
  findByMediaType(mediaType: "image" | "video"): Promise<Media[]>;
  findByEloRange(minElo: number, maxElo: number): Promise<Media[]>;
}
