"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";

export default function Header() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isPending = status === "loading";

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo and Title */}
          <Link href="/" className="flex items-center">
            <div className="p-2 rounded-lg flex items-center justify-center">
              <span className="text-4xl">🎯</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">DART</h1>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a
              href="#features"
              className="text-neutral-600 hover:text-neutral-900 font-medium transition-colors"
            >
              Features
            </a>
            <a
              href="#about"
              className="text-neutral-600 hover:text-neutral-900 font-medium transition-colors"
            >
              About
            </a>
            <a
              href="#contact"
              className="text-neutral-600 hover:text-neutral-900 font-medium transition-colors"
            >
              Contact
            </a>
          </nav>

          {/* Auth Buttons */}
          <div className="flex items-center space-x-3">
            {isPending ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
            ) : session ? (
              <div className="flex items-center space-x-3">
                <Avatar
                  src={session.user?.image}
                  name={session.user?.name}
                  alt={session.user?.name || "User"}
                  size="md"
                />
                <span className="text-sm text-neutral-700 hidden sm:block">
                  {session.user?.name}
                </span>
                <Link href="/dashboard" className="btn-secondary">
                  Dashboard
                </Link>
                <button onClick={handleSignOut} className="btn-primary">
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <Link href="/auth/signin" className="btn-secondary">
                  Sign In
                </Link>
                <Link href="/auth/signin" className="btn-accent">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
