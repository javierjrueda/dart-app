"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
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
  faArrowLeft,
  faArrowRight,
  faStepForward,
  faTrophy,
  faChartLine,
  faRefresh,
} from "@fortawesome/free-solid-svg-icons";

interface Media {
  id: string;
  projectId: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  elo: number;
  quality?: number; // Quality rating: -1 (bad), 0 (unrated), 1 (good)
  prompt?: number; // Prompt number for grouping tests
  loraTraining?: string;
  promptDescription?: string;
  generationParams?: Record<string, any>;
  extractionMethod: "filename" | "metadata" | "manual";
  createdAt: string;
  updatedAt: string;
}

interface BattlePair {
  mediaA: Media;
  mediaB: Media;
}

interface BattleArenaProps {
  projectId: string;
}

export default function BattleArena({ projectId }: BattleArenaProps) {
  const { data: session } = useSession();
  const [battlePair, setBattlePair] = useState<BattlePair | null>(null);
  const [loading, setLoading] = useState(false);
  const [conducting, setConducting] = useState(false);
  const [error, setError] = useState("");
  const [battlesCount, setBattlesCount] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  const fetchBattlePair = async () => {
    try {
      setLoading(true);
      setError("");
      const accessToken = (session as any)?.accessToken;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/battles/projects/${projectId}/pair`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setBattlePair(data);
      } else if (response.status === 404) {
        setError(
          "Not enough 'Good' quality images for battle (minimum 2 required within the same prompt group). Please rate some images as 'Good' in the Gallery first, ensuring you have at least 2 good images with the same prompt number."
        );
      } else {
        setError("Failed to load battle pair");
      }
    } catch (error) {
      console.error("Error fetching battle pair:", error);
      setError("Failed to load battle pair");
    } finally {
      setLoading(false);
    }
  };

  const conductBattle = async (result: "A" | "B" | "skip") => {
    if (!battlePair) return;

    try {
      setConducting(true);
      const accessToken = (session as any)?.accessToken;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/battles/projects/${projectId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            mediaAId: battlePair.mediaA.id,
            mediaBId: battlePair.mediaB.id,
            result,
          }),
        }
      );

      if (response.ok) {
        setBattlesCount((prev) => prev + 1);
        setShowSuccess(true);

        // Show success briefly, then load next pair
        setTimeout(() => {
          setShowSuccess(false);
          fetchBattlePair();
        }, 800);
      } else {
        setError("Failed to record battle");
      }
    } catch (error) {
      console.error("Error conducting battle:", error);
      setError("Failed to record battle");
    } finally {
      setConducting(false);
    }
  };

  const applyEloPenalty = async (penaltyType: "left" | "right" | "both") => {
    if (!battlePair) return;

    try {
      setConducting(true);
      const accessToken = (session as any)?.accessToken;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/battles/projects/${projectId}/penalties`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            mediaAId: battlePair.mediaA.id,
            mediaBId: battlePair.mediaB.id,
            penaltyType,
          }),
        }
      );

      if (response.ok) {
        setShowSuccess(true);

        // Show success briefly, then load next pair
        setTimeout(() => {
          setShowSuccess(false);
          fetchBattlePair();
        }, 800);
      } else {
        setError("Failed to apply ELO penalty");
      }
    } catch (error) {
      console.error("Error applying ELO penalty:", error);
      setError("Failed to apply ELO penalty");
    } finally {
      setConducting(false);
    }
  };

  // Keyboard controls
  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (conducting || loading || !battlePair) return;

      switch (event.key) {
        case "1":
          event.preventDefault();
          conductBattle("A");
          break;
        case "2":
          event.preventDefault();
          conductBattle("B");
          break;
        case "3":
          event.preventDefault();
          conductBattle("skip");
          break;
        case "4":
          event.preventDefault();
          applyEloPenalty("left");
          break;
        case "5":
          event.preventDefault();
          applyEloPenalty("right");
          break;
        case "6":
          event.preventDefault();
          applyEloPenalty("both");
          break;
      }
    },
    [conducting, loading, battlePair, conductBattle, applyEloPenalty]
  );

  useEffect(() => {
    if (session && projectId) {
      fetchBattlePair();
    }
  }, [session, projectId]);

  // Add keyboard event listeners
  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [handleKeyPress]);

  if (loading) {
    return (
      <Card className="border-neutral-200">
        <CardHeader>
          <CardTitle className="text-primary-700">Battle Arena</CardTitle>
          <CardDescription className="text-neutral-500">
            Loading battle pair...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-neutral-200">
        <CardHeader>
          <CardTitle className="text-primary-700">Battle Arena</CardTitle>
          <CardDescription className="text-neutral-500">
            Compare and rate your AI images
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-error-600 mb-4">{error}</p>
            <Button
              onClick={fetchBattlePair}
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

  if (showSuccess) {
    return (
      <Card className="border-success-200 bg-success-50">
        <CardContent className="pt-6">
          <div className="text-center py-20">
            <div className="mb-4">
              <FontAwesomeIcon
                icon={faTrophy}
                className="text-success-600 text-4xl animate-bounce"
              />
            </div>
            <p className="text-success-700 text-xl font-medium">
              Battle Recorded!
            </p>
            <p className="text-success-600 text-sm mt-2">
              Loading next battle...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!battlePair) {
    return (
      <Card className="border-neutral-200">
        <CardHeader>
          <CardTitle className="text-primary-700">Battle Arena</CardTitle>
          <CardDescription className="text-neutral-500">
            No battle pair available
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-neutral-600 mb-4">
              You need at least 2 images rated as "Good" to start battles. Go to
              the Gallery tab and rate some images first.
            </p>
            <Button
              onClick={fetchBattlePair}
              className="bg-primary-500 hover:bg-primary-600 text-white"
            >
              <FontAwesomeIcon icon={faRefresh} className="mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-neutral-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-primary-700">Battle Arena</CardTitle>
            <CardDescription className="text-neutral-500">
              Only comparing "Good" quality images • Use keys 1, 2, 3 to choose
              • Apply penalties with keys 4, 5, 6
              {battlePair && battlePair.mediaA.prompt !== undefined && (
                <span className="text-blue-600 font-medium">
                  {" "}
                  • Prompt {battlePair.mediaA.prompt}
                </span>
              )}
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-sm text-neutral-500">Battles Completed</p>
            <p className="text-2xl font-bold text-primary-600">
              {battlesCount}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image A */}
          <div className="space-y-4">
            <div className="relative group">
              <img
                src={battlePair.mediaA.mediaUrl}
                alt="Option A"
                className="w-full min-w-[40vw] max-h-[70vh] object-contain rounded-lg border-2 border-neutral-200 hover:border-primary-300 transition-colors cursor-pointer"
                onClick={() => conductBattle("A")}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-white bg-opacity-90 rounded-full p-3">
                    <FontAwesomeIcon
                      icon={faArrowLeft}
                      className="text-primary-600 text-xl"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-primary-700">Option A</h3>
                <span className="text-sm bg-primary-100 text-primary-700 px-2 py-1 rounded">
                  ELO: {battlePair.mediaA.elo}
                </span>
              </div>

              {battlePair.mediaA.generationParams && (
                <div className="text-xs text-neutral-500 space-y-1">
                  {Object.entries(battlePair.mediaA.generationParams)
                    .slice(0, 3)
                    .map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="capitalize">{key}:</span>
                        <span>{String(value)}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <Button
              onClick={() => conductBattle("A")}
              disabled={conducting}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
              Choose A (Key: 1)
            </Button>
          </div>

          {/* VS Divider */}
          <div className="lg:hidden flex items-center justify-center py-4">
            <div className="bg-neutral-200 h-px flex-1"></div>
            <span className="px-4 text-neutral-500 font-bold">VS</span>
            <div className="bg-neutral-200 h-px flex-1"></div>
          </div>

          {/* Image B */}
          <div className="space-y-4">
            <div className="relative group">
              <img
                src={battlePair.mediaB.mediaUrl}
                alt="Option B"
                className="w-full min-w-[40vw] max-h-[70vh] object-contain rounded-lg border-2 border-neutral-200 hover:border-primary-300 transition-colors cursor-pointer"
                onClick={() => conductBattle("B")}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-white bg-opacity-90 rounded-full p-3">
                    <FontAwesomeIcon
                      icon={faArrowRight}
                      className="text-primary-600 text-xl"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-primary-700">Option B</h3>
                <span className="text-sm bg-primary-100 text-primary-700 px-2 py-1 rounded">
                  ELO: {battlePair.mediaB.elo}
                </span>
              </div>

              {battlePair.mediaB.generationParams && (
                <div className="text-xs text-neutral-500 space-y-1">
                  {Object.entries(battlePair.mediaB.generationParams)
                    .slice(0, 3)
                    .map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="capitalize">{key}:</span>
                        <span>{String(value)}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <Button
              onClick={() => conductBattle("B")}
              disabled={conducting}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white"
            >
              Choose B (Key: 2)
              <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
            </Button>
          </div>
        </div>

        {/* VS Divider for desktop */}
        <div className="hidden lg:flex absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white border-2 border-neutral-200 rounded-full w-16 h-16 items-center justify-center z-10">
          <span className="text-neutral-600 font-bold text-xl">VS</span>
        </div>

        {/* Skip Button */}
        <div className="mt-8 text-center">
          <Button
            onClick={() => conductBattle("skip")}
            disabled={conducting}
            variant="outline"
            className="border-neutral-300 text-neutral-600 hover:bg-neutral-50"
          >
            <FontAwesomeIcon icon={faStepForward} className="mr-2" />
            Skip This Battle (Key: 3)
          </Button>
        </div>

        {/* ELO Penalty Buttons */}
        <div className="mt-6 space-y-3">
          <div className="text-center text-sm text-neutral-500 font-medium">
            ELO Penalties (-500 ELO)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              onClick={() => applyEloPenalty("left")}
              disabled={conducting}
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              Penalize Left (Key: 4)
            </Button>
            <Button
              onClick={() => applyEloPenalty("right")}
              disabled={conducting}
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              Penalize Right (Key: 5)
            </Button>
            <Button
              onClick={() => applyEloPenalty("both")}
              disabled={conducting}
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              Penalize Both (Key: 6)
            </Button>
          </div>
        </div>

        {/* Battle Status */}
        {conducting && (
          <div className="mt-4 text-center">
            <div className="inline-flex items-center px-4 py-2 bg-secondary-100 text-secondary-700 rounded-lg">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-secondary-500 mr-2"></div>
              Recording battle...
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
