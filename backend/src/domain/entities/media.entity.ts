export interface MediaProfile {
  id: string;
  projectId: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  elo: number;
  createdAt: Date;
  updatedAt: Date;
}

export class Media {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public mediaUrl: string,
    public mediaType: "image" | "video",
    public elo: number = 1200,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}

  static create(data: {
    projectId: string;
    mediaUrl: string;
    mediaType: "image" | "video";
    elo?: number;
  }): Media {
    return new Media(
      Media.generateId(),
      data.projectId,
      data.mediaUrl,
      data.mediaType,
      data.elo || 1200
    );
  }

  updateElo(newElo: number): void {
    this.elo = newElo;
    this.updatedAt = new Date();
  }

  updateMediaUrl(newUrl: string): void {
    this.mediaUrl = newUrl;
    this.updatedAt = new Date();
  }

  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  toProfile(): MediaProfile {
    return {
      id: this.id,
      projectId: this.projectId,
      mediaUrl: this.mediaUrl,
      mediaType: this.mediaType,
      elo: this.elo,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  toJSON() {
    return this.toProfile();
  }
}
