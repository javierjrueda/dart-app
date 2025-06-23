"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTrophy,
  faMedal,
  faAward,
  faRefresh,
  faChartLine,
} from "@fortawesome/free-solid-svg-icons";

interface Media {
  id: string;
  projectId: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  elo: number;
  loraTraining?: string;
  promptDescription?: string;
  generationParams?: Record<string, any>;
  extractionMethod: "filename" | "metadata" | "manual";
  createdAt: string;
  updatedAt: string;
}

interface LeaderboardEntry {
  media: Media;
  rank: number;
  battlesWon: number;
  battlesLost: number;
  totalBattles: number;
  winRate: string;
}

interface LeaderboardProps {
  projectId: string;
}

export default function Leaderboard({ projectId }: LeaderboardProps) {
  const { data: session } = useSession();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError("");
      const accessToken = (session as any)?.accessToken;

      const response = await fetch(
        `http://localhost:3001/api/v1/battles/projects/${projectId}/leaderboard?limit=10`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
      } else {
        setError("Failed to load leaderboard");
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      setError("Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session && projectId) {
      fetchLeaderboard();
    }
  }, [session, projectId]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <FontAwesomeIcon icon={faTrophy} className="text-yellow-500" />;
      case 2:
        return <FontAwesomeIcon icon={faMedal} className="text-gray-400" />;
      case 3:
        return <FontAwesomeIcon icon={faAward} className="text-amber-600" />;
      default:
        return <span className="text-neutral-500 font-bold">#{rank}</span>;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-yellow-50 border-yellow-200";
      case 2:
        return "bg-gray-50 border-gray-200";
      case 3:
        return "bg-amber-50 border-amber-200";
      default:
        return "bg-neutral-50 border-neutral-200";
    }
  };

  if (loading) {
    return (
      <Card className="border-neutral-200">
        <CardHeader>
          <CardTitle className="text-primary-700">Leaderboard</CardTitle>
          <CardDescription className="text-neutral-500">
            Loading top-rated images...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-neutral-200">
        <CardHeader>
          <CardTitle className="text-primary-700">Leaderboard</CardTitle>
          <CardDescription className="text-neutral-500">
            Top-rated images by ELO
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-error-600 mb-4">{error}</p>
            <Button
              onClick={fetchLeaderboard}
              className="bg-primary-500 hover:bg-primary-600 text-white"
            >
              <FontAwesomeIcon icon={faRefresh} className="mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <Card className="border-neutral-200">
        <CardHeader>
          <CardTitle className="text-primary-700">Leaderboard</CardTitle>
          <CardDescription className="text-neutral-500">
            Top-rated images by ELO
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FontAwesomeIcon
              icon={faChartLine}
              className="text-neutral-400 text-3xl mb-4"
            />
            <p className="text-neutral-600 mb-4">
              No battles yet! Start rating images to see the leaderboard.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-neutral-200">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-primary-700">Leaderboard</CardTitle>
          <CardDescription className="text-neutral-500">
            Top-rated images by ELO rating
          </CardDescription>
        </div>
        <Button
          onClick={fetchLeaderboard}
          variant="outline"
          size="sm"
          className="border-neutral-300"
        >
          <FontAwesomeIcon icon={faRefresh} className="mr-2" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {leaderboard.map((entry) => (
            <div
              key={entry.media.id}
              className={`p-4 rounded-lg border-2 ${getRankColor(
                entry.rank
              )} transition-all hover:shadow-sm`}
            >
              <div className="flex items-center gap-4">
                {/* Rank */}
                <div className="flex-shrink-0 w-8 text-center">
                  {getRankIcon(entry.rank)}
                </div>

                {/* Image */}
                <div className="flex-shrink-0">
                  <img
                    src={entry.media.mediaUrl}
                    alt={`Rank ${entry.rank}`}
                    className="w-24 h-24 object-cover rounded-md border border-neutral-200"
                  />
                </div>

                {/* Stats */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-primary-700 truncate">
                      Image #{entry.media.id.slice(-6)}
                    </h3>
                    <span className="text-lg font-bold text-primary-600">
                      {entry.media.elo}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-neutral-500">
                    <span>
                      {entry.battlesWon}W - {entry.battlesLost}L
                    </span>
                    <span>{entry.winRate}% win rate</span>
                    <span>{entry.totalBattles} battles</span>
                  </div>

                  {entry.media.generationParams && (
                    <div className="mt-2 text-xs text-neutral-400">
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {Object.entries(entry.media.generationParams).map(
                          ([key, value]) => (
                            <span key={key} className="font-mono">
                              {key}: {String(value)}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {leaderboard.length === 10 && (
          <div className="mt-4 text-center">
            <p className="text-sm text-neutral-500">Showing top 10 results</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
