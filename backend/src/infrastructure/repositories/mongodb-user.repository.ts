import mongoose, { Schema, Document, Types } from "mongoose";
import { User, UserProfile } from "@/domain/entities/user.entity";
import { Session } from "@/domain/entities/session.entity";
import { Account } from "@/domain/entities/account.entity";

// MongoDB User Document Interface
interface UserDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

// MongoDB Session Document Interface
interface SessionDocument extends Document {
  _id: Types.ObjectId;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

// MongoDB Account Document Interface
interface AccountDocument extends Document {
  _id: Types.ObjectId;
  userId: string;
  accountId: string;
  providerId: string;
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  accessTokenExpiresAt?: Date;
  refreshTokenExpiresAt?: Date;
  scope?: string;
  password?: string;
  createdAt: Date;
  updatedAt: Date;
}

// MongoDB Schemas
const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    emailVerified: { type: Boolean, default: false },
    image: { type: String, default: null },
    role: { type: String, default: "user" },
  },
  {
    timestamps: true,
    collection: "user", // Better Auth expects "user" collection name
  }
);

const SessionSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: true },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  {
    timestamps: true,
    collection: "session", // Better Auth expects "session" collection name
  }
);

const AccountSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    accountId: { type: String, required: true },
    providerId: { type: String, required: true },
    accessToken: { type: String },
    refreshToken: { type: String },
    idToken: { type: String },
    accessTokenExpiresAt: { type: Date },
    refreshTokenExpiresAt: { type: Date },
    scope: { type: String },
    password: { type: String }, // Hashed password for credential provider
  },
  {
    timestamps: true,
    collection: "account", // Better Auth expects "account" collection name
  }
);

// Create compound index for account lookup
AccountSchema.index({ accountId: 1, providerId: 1 }, { unique: true });

// Models
export const UserModel = mongoose.model<UserDocument>("User", UserSchema);
export const SessionModel = mongoose.model<SessionDocument>(
  "Session",
  SessionSchema
);
export const AccountModel = mongoose.model<AccountDocument>(
  "Account",
  AccountSchema
);

// Repository Implementation
export class MongoDBUserRepository {
  // User operations
  async createUser(userData: {
    name: string;
    email: string;
    image?: string | null;
    role?: string;
  }): Promise<User> {
    const doc = new UserModel({
      name: userData.name,
      email: userData.email,
      emailVerified: false,
      image: userData.image || null,
      role: userData.role || "user",
    });

    const savedDoc = await doc.save();
    return this.userDocumentToDomain(savedDoc);
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const doc = await UserModel.findOne({ email });
    return doc ? this.userDocumentToDomain(doc) : null;
  }

  async findUserById(id: string): Promise<User | null> {
    try {
      const doc = await UserModel.findById(id);
      return doc ? this.userDocumentToDomain(doc) : null;
    } catch (error) {
      return null;
    }
  }

  async updateUser(
    id: string,
    updateData: Partial<UserProfile>
  ): Promise<User | null> {
    try {
      const doc = await UserModel.findByIdAndUpdate(
        id,
        { ...updateData, updatedAt: new Date() },
        { new: true }
      );
      return doc ? this.userDocumentToDomain(doc) : null;
    } catch (error) {
      return null;
    }
  }

  // Session operations
  async createSession(sessionData: {
    userId: string;
    expiresIn?: number;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<Session> {
    const session = Session.create(sessionData);
    const doc = new SessionModel({
      userId: session.userId,
      token: session.token,
      expiresAt: session.expiresAt,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
    });

    const savedDoc = await doc.save();
    return this.sessionDocumentToDomain(savedDoc);
  }

  async findSessionByToken(token: string): Promise<Session | null> {
    const doc = await SessionModel.findOne({ token });
    return doc ? this.sessionDocumentToDomain(doc) : null;
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const result = await SessionModel.deleteOne({ _id: sessionId });
      return result.deletedCount > 0;
    } catch (error) {
      return false;
    }
  }

  async deleteExpiredSessions(): Promise<number> {
    const result = await SessionModel.deleteMany({
      expiresAt: { $lt: new Date() },
    });
    return result.deletedCount || 0;
  }

  // Account operations
  async createAccount(accountData: {
    userId: string;
    email: string;
    hashedPassword: string;
  }): Promise<Account> {
    const doc = new AccountModel({
      userId: accountData.userId,
      accountId: accountData.email,
      providerId: "credential",
      password: accountData.hashedPassword,
    });

    const savedDoc = await doc.save();
    return this.accountDocumentToDomain(savedDoc);
  }

  async createOAuthAccount(accountData: {
    userId: string;
    accountId: string;
    providerId: string;
    accessToken?: string;
    refreshToken?: string;
    idToken?: string;
    scope?: string;
  }): Promise<Account> {
    const doc = new AccountModel({
      userId: accountData.userId,
      accountId: accountData.accountId,
      providerId: accountData.providerId,
      accessToken: accountData.accessToken,
      refreshToken: accountData.refreshToken,
      idToken: accountData.idToken,
      scope: accountData.scope,
    });

    const savedDoc = await doc.save();
    return this.accountDocumentToDomain(savedDoc);
  }

  async findAccountByEmail(email: string): Promise<Account | null> {
    const doc = await AccountModel.findOne({
      accountId: email,
      providerId: "credential",
    });
    return doc ? this.accountDocumentToDomain(doc) : null;
  }

  async findAccountsByUserId(userId: string): Promise<Account[]> {
    const docs = await AccountModel.find({ userId });
    return docs.map((doc) => this.accountDocumentToDomain(doc));
  }

  // Domain conversion methods
  private userDocumentToDomain(doc: UserDocument): User {
    return new User(
      doc._id.toString(),
      doc.name,
      doc.email,
      doc.emailVerified,
      doc.image,
      doc.role,
      doc.createdAt,
      doc.updatedAt
    );
  }

  private sessionDocumentToDomain(doc: SessionDocument): Session {
    return new Session(
      doc._id.toString(),
      doc.userId,
      doc.token,
      doc.expiresAt,
      doc.createdAt,
      doc.updatedAt,
      doc.ipAddress,
      doc.userAgent
    );
  }

  private accountDocumentToDomain(doc: AccountDocument): Account {
    return new Account(
      doc._id.toString(),
      doc.userId,
      doc.accountId,
      doc.providerId as any,
      doc.accessToken,
      doc.refreshToken,
      doc.idToken,
      doc.accessTokenExpiresAt,
      doc.refreshTokenExpiresAt,
      doc.scope,
      doc.password,
      doc.createdAt,
      doc.updatedAt
    );
  }
}
