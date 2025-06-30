import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectDatabase } from "@/infrastructure/database/connection";
import { MongoDBUserRepository } from "@/infrastructure/repositories/mongodb-user.repository";

// Define custom user type
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  role: string;
}

// Helper functions for backend auth
export async function verifyAuth(token: string) {
  try {
    const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET!;
    const decoded = jwt.verify(token, secret) as any;
    return decoded;
  } catch (error) {
    return null;
  }
}

export async function createAuthToken(user: AuthUser) {
  const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET!;
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    secret,
    { expiresIn: "30d" }
  );
}

// Credential authentication function for backend use
export async function authenticateCredentials(
  email: string,
  password: string
): Promise<AuthUser | null> {
  if (!email || !password) {
    return null;
  }

  // Connect to MongoDB using existing connection
  await connectDatabase();

  const userRepo = new MongoDBUserRepository();
  const user = await userRepo.findUserByEmail(email);

  if (!user) {
    return null;
  }

  // Check password from account
  const accounts = await userRepo.findAccountsByUserId(user.id);
  const credentialAccount = accounts.find(
    (acc) => acc.providerId === "credential"
  );

  if (!credentialAccount || !credentialAccount.password) {
    return null;
  }

  const isPasswordValid = await bcrypt.compare(
    password,
    credentialAccount.password
  );

  if (!isPasswordValid) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    role: user.role,
  };
}
