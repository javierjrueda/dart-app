export type AccountProvider =
  | "credential"
  | "google"
  | "github"
  | "discord"
  | "apple";
export type AccountType = "oauth" | "email";

export class Account {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly accountId: string, // provider account ID or email
    public readonly providerId: AccountProvider,
    public readonly accessToken?: string,
    public readonly refreshToken?: string,
    public readonly idToken?: string,
    public readonly accessTokenExpiresAt?: Date,
    public readonly refreshTokenExpiresAt?: Date,
    public readonly scope?: string,
    public readonly password?: string, // For credential provider (hashed)
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date()
  ) {}

  static createEmailAccount(data: {
    userId: string;
    email: string;
    hashedPassword: string;
  }): Account {
    return new Account(
      Account.generateId(),
      data.userId,
      data.email,
      "credential",
      undefined, // accessToken
      undefined, // refreshToken
      undefined, // idToken
      undefined, // accessTokenExpiresAt
      undefined, // refreshTokenExpiresAt
      undefined, // scope
      data.hashedPassword
    );
  }

  static createSocialAccount(data: {
    userId: string;
    accountId: string;
    providerId: Exclude<AccountProvider, "credential">;
    accessToken?: string;
    refreshToken?: string;
    idToken?: string;
    accessTokenExpiresAt?: Date;
    refreshTokenExpiresAt?: Date;
    scope?: string;
  }): Account {
    return new Account(
      Account.generateId(),
      data.userId,
      data.accountId,
      data.providerId,
      data.accessToken,
      data.refreshToken,
      data.idToken,
      data.accessTokenExpiresAt,
      data.refreshTokenExpiresAt,
      data.scope
    );
  }

  isEmailAccount(): boolean {
    return this.providerId === "credential";
  }

  isSocialAccount(): boolean {
    return this.providerId !== "credential";
  }

  isTokenExpired(): boolean {
    if (!this.accessTokenExpiresAt) return false;
    return new Date() > this.accessTokenExpiresAt;
  }

  updatePassword(hashedPassword: string): Account {
    if (!this.isEmailAccount()) {
      throw new Error("Cannot update password for non-credential account");
    }

    return new Account(
      this.id,
      this.userId,
      this.accountId,
      this.providerId,
      this.accessToken,
      this.refreshToken,
      this.idToken,
      this.accessTokenExpiresAt,
      this.refreshTokenExpiresAt,
      this.scope,
      hashedPassword,
      this.createdAt,
      new Date()
    );
  }

  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      accountId: this.accountId,
      providerId: this.providerId,
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      idToken: this.idToken,
      accessTokenExpiresAt: this.accessTokenExpiresAt,
      refreshTokenExpiresAt: this.refreshTokenExpiresAt,
      scope: this.scope,
      // Note: password is intentionally excluded from JSON output for security
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      isEmailAccount: this.isEmailAccount(),
      isSocialAccount: this.isSocialAccount(),
      isTokenExpired: this.isTokenExpired(),
    };
  }
}
