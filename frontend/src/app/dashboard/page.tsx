"use client";

import { useSession } from "next-auth/react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Header from "@/components/Header";
import Avatar from "@/components/Avatar";
import {
  faCamera,
  faEdit,
  faChartBar,
  faUser,
  faSignOutAlt,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isPending = status === "loading";

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/auth/signin");
    }
  }, [session, isPending, router]);

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect to signin
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-neutral-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Avatar
                src={session.user?.image}
                name={session.user?.name}
                alt={session.user?.name || "User"}
                size="lg"
              />
              <div>
                <h1 className="text-3xl font-bold text-neutral-900">
                  Welcome back, {session.user?.name}!
                </h1>
                <p className="text-neutral-600 mt-1">{session.user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="btn-ghost flex items-center space-x-2"
            >
              <FontAwesomeIcon icon={faSignOutAlt} className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Dreamshots Card */}
          <div className="card hover:border-primary-300 transition-colors duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-neutral-900">
                Dreamshots
              </h3>
              <div className="p-3 bg-primary-100 rounded-lg">
                <FontAwesomeIcon
                  icon={faCamera}
                  className="w-6 h-6 text-primary-600"
                />
              </div>
            </div>
            <p className="text-neutral-600 mb-6">
              Manage and annotate your dreamshots
            </p>
            <button className="btn-primary w-full">View Dreamshots</button>
          </div>

          {/* Annotations Card */}
          <div className="card hover:border-secondary-300 transition-colors duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-neutral-900">
                Annotations
              </h3>
              <div className="p-3 bg-secondary-100 rounded-lg">
                <FontAwesomeIcon
                  icon={faEdit}
                  className="w-6 h-6 text-secondary-600"
                />
              </div>
            </div>
            <p className="text-neutral-600 mb-6">
              Review and manage annotations
            </p>
            <button className="btn-secondary w-full">View Annotations</button>
          </div>

          {/* Rankings Card */}
          <div className="card hover:border-accent-300 transition-colors duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-neutral-900">
                Rankings
              </h3>
              <div className="p-3 bg-accent-100 rounded-lg">
                <FontAwesomeIcon
                  icon={faChartBar}
                  className="w-6 h-6 text-accent-600"
                />
              </div>
            </div>
            <p className="text-neutral-600 mb-6">View ranking statistics</p>
            <button className="btn-accent w-full">View Rankings</button>
          </div>
        </div>

        {/* User Info */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg border border-neutral-200 p-6">
          <h3 className="text-xl font-semibold text-neutral-900 mb-6">
            Account Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-neutral-700">
                Full Name
              </label>
              <p className="text-neutral-900 bg-neutral-50 px-3 py-2 rounded-md border border-neutral-200">
                {session.user?.name || "Not provided"}
              </p>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-neutral-700">
                Email Address
              </label>
              <p className="text-neutral-900 bg-neutral-50 px-3 py-2 rounded-md border border-neutral-200">
                {session.user?.email || "Not provided"}
              </p>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-neutral-700">
                User ID
              </label>
              <p className="text-neutral-900 bg-neutral-50 px-3 py-2 rounded-md border border-neutral-200 font-mono text-sm">
                {(session.user as any)?.id || "Not available"}
              </p>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-neutral-700">
                Account Role
              </label>
              <p className="text-neutral-900 bg-neutral-50 px-3 py-2 rounded-md border border-neutral-200 capitalize">
                {(session.user as any)?.role || "User"}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-lg border border-neutral-200 p-6 text-center">
            <div className="text-3xl font-bold text-primary-500 mb-2">0</div>
            <div className="text-neutral-600">Dreamshots</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg border border-neutral-200 p-6 text-center">
            <div className="text-3xl font-bold text-secondary-500 mb-2">0</div>
            <div className="text-neutral-600">Annotations</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg border border-neutral-200 p-6 text-center">
            <div className="text-3xl font-bold text-accent-500 mb-2">0</div>
            <div className="text-neutral-600">Rankings</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg border border-neutral-200 p-6 text-center">
            <div className="text-3xl font-bold text-neutral-500 mb-2">100%</div>
            <div className="text-neutral-600">Completion</div>
          </div>
        </div>
      </div>
    </div>
  );
}
