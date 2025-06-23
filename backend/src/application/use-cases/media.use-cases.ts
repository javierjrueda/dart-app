import { Media } from "@/domain/entities/media.entity";
import { MediaRepository } from "@/domain/repositories/media.repository";

export class MediaUseCases {
  constructor(private mediaRepository: MediaRepository) {}

  async getAllMedia(): Promise<Media[]> {
    return await this.mediaRepository.findAll();
  }

  async getMediaById(id: string): Promise<Media | null> {
    if (!id) {
      throw new Error("Media ID is required");
    }
    return await this.mediaRepository.findById(id);
  }

  async getMediaByProjectId(projectId: string): Promise<Media[]> {
    if (!projectId) {
      throw new Error("Project ID is required");
    }
    return await this.mediaRepository.findByProjectId(projectId);
  }

  async createMedia(data: {
    projectId: string;
    mediaUrl: string;
    mediaType: "image" | "video";
    elo?: number;
  }): Promise<Media> {
    // Validation
    if (!data.projectId || !data.mediaUrl || !data.mediaType) {
      throw new Error("Project ID, media URL, and media type are required");
    }

    if (!["image", "video"].includes(data.mediaType)) {
      throw new Error("Media type must be either 'image' or 'video'");
    }

    const media = Media.create({
      projectId: data.projectId,
      mediaUrl: data.mediaUrl,
      mediaType: data.mediaType,
      elo: data.elo || 1200,
    });

    return await this.mediaRepository.create(media);
  }

  async updateMedia(
    id: string,
    updateData: Partial<Media>
  ): Promise<Media | null> {
    if (!id) {
      throw new Error("Media ID is required");
    }

    const existingMedia = await this.mediaRepository.findById(id);
    if (!existingMedia) {
      throw new Error("Media not found");
    }

    return await this.mediaRepository.update(id, updateData);
  }

  async deleteMedia(id: string): Promise<boolean> {
    if (!id) {
      throw new Error("Media ID is required");
    }

    const existingMedia = await this.mediaRepository.findById(id);
    if (!existingMedia) {
      throw new Error("Media not found");
    }

    return await this.mediaRepository.delete(id);
  }

  async updateElo(id: string, newElo: number): Promise<Media | null> {
    if (!id) {
      throw new Error("Media ID is required");
    }

    if (typeof newElo !== "number" || newElo < 0) {
      throw new Error("ELO must be a non-negative number");
    }

    const media = await this.mediaRepository.findById(id);
    if (!media) {
      throw new Error("Media not found");
    }

    media.updateElo(newElo);
    return await this.mediaRepository.update(id, media);
  }

  async getMediaByType(mediaType: "image" | "video"): Promise<Media[]> {
    if (!["image", "video"].includes(mediaType)) {
      throw new Error("Media type must be either 'image' or 'video'");
    }
    return await this.mediaRepository.findByMediaType(mediaType);
  }

  async getMediaByEloRange(minElo: number, maxElo: number): Promise<Media[]> {
    if (typeof minElo !== "number" || typeof maxElo !== "number") {
      throw new Error("ELO range values must be numbers");
    }

    if (minElo > maxElo) {
      throw new Error("Minimum ELO cannot be greater than maximum ELO");
    }

    return await this.mediaRepository.findByEloRange(minElo, maxElo);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
