export class Session {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly token: string,
    public expiresAt: Date,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
    public ipAddress?: string,
    public userAgent?: string
  ) {}

  static create(data: {
    userId: string;
    expiresIn?: number; // seconds, defaults to 7 days
    ipAddress?: string;
    userAgent?: string;
  }): Session {
    const expiresIn = data.expiresIn || 60 * 60 * 24 * 7; // 7 days default
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return new Session(
      Session.generateId(),
      data.userId,
      Session.generateToken(),
      expiresAt,
      new Date(),
      new Date(),
      data.ipAddress,
      data.userAgent
    );
  }

  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  extend(additionalSeconds: number = 60 * 60 * 24): void {
    this.expiresAt = new Date(
      this.expiresAt.getTime() + additionalSeconds * 1000
    );
    this.updatedAt = new Date();
  }

  refresh(): void {
    // Extend session by 7 days
    this.extend(60 * 60 * 24 * 7);
  }

  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private static generateToken(): string {
    // Generate a secure random token
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      token: this.token,
      expiresAt: this.expiresAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      isExpired: this.isExpired(),
    };
  }
}
