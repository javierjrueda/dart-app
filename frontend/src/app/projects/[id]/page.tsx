"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MediaUpload from "@/components/MediaUpload";
import BulkUploadModal from "@/components/BulkUploadModal";
import OptimizedBulkUpload from "@/components/OptimizedBulkUpload";
import BattleArena from "@/components/BattleArena";
import Leaderboard from "@/components/Leaderboard";
import { ToastProvider, useToast } from "@/components/ToastContainer";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faUpload,
  faImage,
  faVideo,
  faFolderOpen,
  faBolt,
  faImages,
  faTrophy,
  faThumbsUp,
  faThumbsDown,
  faChevronLeft,
  faChevronRight,
  faFilter,
  faCheckSquare,
  faSquare,
  faCheck,
  faTimes,
  faSliders,
  faChevronDown,
  faChevronUp,
  faChartBar,
  faDownload,
} from "@fortawesome/free-solid-svg-icons";

interface Project {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface Media {
  id: string;
  projectId: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  elo: number;
  quality?: number; // New field for quick filtering: -1 (bad), 0 (unrated), 1 (good)
  loraTraining?: string;
  promptDescription?: string;
  generationParams?: Record<string, any>;
  extractionMethod: "filename" | "metadata" | "manual";
  filename?: string; // Added filename property for export functionality
  createdAt: string;
  updatedAt: string;
}

function ProjectDetailPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const isPending = status === "loading";
  const [project, setProject] = useState<Project | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [allMedia, setAllMedia] = useState<Media[]>([]); // Store all media for filtering
  const [loading, setLoading] = useState(true);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [error, setError] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showOptimizedUpload, setShowOptimizedUpload] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "gallery" | "battle" | "leaderboard" | "analytics"
  >("gallery");

  // Pagination states - Initialize from URL parameter
  const [currentPage, setCurrentPage] = useState(() => {
    const pageParam = searchParams.get("page");
    return pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
  });
  const [totalPages, setTotalPages] = useState(1);
  const [totalMedia, setTotalMedia] = useState(0);
  const [hoveredMediaId, setHoveredMediaId] = useState<string | null>(null);
  const itemsPerPage = 50;
  const [qualityFilter, setQualityFilter] = useState<
    "all" | "good" | "bad" | "unrated"
  >("all");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
  const [generationParams, setGenerationParams] = useState<
    Array<{
      paramName: string;
      values: Array<{
        value: any;
        count: number;
        goodCount: number;
        badCount: number;
      }>;
    }>
  >([]);
  const [paramFilters, setParamFilters] = useState<Record<string, any>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [battleStats, setBattleStats] = useState<{
    totalBattles: number;
  } | null>(null);
  const [goodImagesCount, setGoodImagesCount] = useState(0);
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [viewColumns, setViewColumns] = useState(3); // New state for dynamic view

  const { addToast } = useToast();

  // Function to update URL with current page
  const updatePageInURL = (page: number) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    if (page === 1) {
      current.delete("page");
    } else {
      current.set("page", page.toString());
    }
    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.replace(`${window.location.pathname}${query}`, { scroll: false });
  };

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/auth/signin");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session && projectId) {
      fetchProject();
      fetchMedia();
      fetchGenerationParams(); // Fetch available params for filtering
      fetchBattleStats(); // Fetch battle statistics
    }
  }, [session, projectId]);

  // Refetch when quality filter changes
  useEffect(() => {
    if (session && projectId) {
      setCurrentPage(1); // Reset to first page
      fetchMedia();
    }
  }, [qualityFilter]);

  // Refetch when parameter filters change
  useEffect(() => {
    if (session && projectId) {
      setCurrentPage(1); // Reset to first page
      fetchMedia();
    }
  }, [paramFilters]);

  // Re-apply filters when page changes and update URL
  useEffect(() => {
    if (allMedia.length > 0) {
      applyFiltersAndPagination(allMedia);
    }
    updatePageInURL(currentPage);
  }, [currentPage]);

  // Re-apply filters when allMedia, qualityFilter, or paramFilters change
  useEffect(() => {
    if (allMedia.length > 0) {
      applyFiltersAndPagination(allMedia);
      // Count good quality images
      const goodCount = allMedia.filter((item) => item.quality === 1).length;
      setGoodImagesCount(goodCount);
    }
  }, [allMedia, qualityFilter, paramFilters]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const accessToken = (session as any)?.accessToken;

      if (!accessToken) {
        setError("Authentication error: No access token found");
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/projects/${projectId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const projectData = await response.json();
        setProject(projectData);
      } else {
        console.error("Failed to fetch project", response.status);
        if (response.status === 404) {
          setError("Project not found");
        } else if (response.status === 401) {
          setError("Authentication error: Please sign out and sign in again");
        } else {
          setError("Failed to load project");
        }
      }
    } catch (error) {
      console.error("Error fetching project:", error);
      setError("Failed to load project");
    } finally {
      setLoading(false);
    }
  };

  const fetchGenerationParams = async () => {
    try {
      const accessToken = (session as any)?.accessToken;

      if (!accessToken) {
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/projects/${projectId}/media/generation-params`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setGenerationParams(data.params || []);
      }
    } catch (error) {
      console.error("Error fetching generation params:", error);
    }
  };

  const fetchBattleStats = async () => {
    try {
      const accessToken = (session as any)?.accessToken;

      if (!accessToken) {
        return;
      }

      console.log(`Fetching battle stats for project: ${projectId}`);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/battles/projects/${projectId}/stats`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      console.log(`Battle stats response status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        console.log("Battle stats data:", data);
        setBattleStats({ totalBattles: data.totalBattles || 0 });
      } else {
        console.error(
          `Battle stats fetch failed: ${response.status} ${response.statusText}`
        );
        const errorText = await response.text();
        console.error("Error response:", errorText);
      }
    } catch (error) {
      console.error("Error fetching battle stats:", error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const accessToken = (session as any)?.accessToken;

      if (!accessToken) {
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/projects/${projectId}/analytics`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      } else {
        console.error("Failed to fetch analytics", response.status);
        addToast({
          type: "error",
          title: "Analytics Error",
          description: "Failed to load analytics data",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
      addToast({
        type: "error",
        title: "Analytics Error",
        description: "Failed to load analytics data",
        duration: 3000,
      });
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchMedia = async () => {
    try {
      setMediaLoading(true);
      const accessToken = (session as any)?.accessToken;

      if (!accessToken) {
        return;
      }

      // Fetch all media at once (no pagination on server)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/projects/${projectId}/media?page=1&limit=10000`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const mediaData = await response.json();
        const allMediaItems = mediaData.media || [];
        setAllMedia(allMediaItems);
        applyFiltersAndPagination(allMediaItems);
      } else {
        console.error("Failed to fetch media", response.status);
      }
    } catch (error) {
      console.error("Error fetching media:", error);
    } finally {
      setMediaLoading(false);
    }
  };

  const applyFiltersAndPagination = (mediaItems: Media[]) => {
    let filteredMedia = [...mediaItems];

    // Apply quality filter
    if (qualityFilter !== "all") {
      filteredMedia = filteredMedia.filter((item: Media) => {
        switch (qualityFilter) {
          case "good":
            return item.quality === 1;
          case "bad":
            return item.quality === -1;
          case "unrated":
            return item.quality === 0 || item.quality === undefined;
          default:
            return true;
        }
      });
    }

    // Apply parameter filters
    if (Object.keys(paramFilters).length > 0) {
      filteredMedia = filteredMedia.filter((item: Media) => {
        if (!item.generationParams) return false;

        // Check if all filter conditions are met
        return Object.entries(paramFilters).every(
          ([paramName, filterValue]) => {
            return item.generationParams?.[paramName] === filterValue;
          }
        );
      });
    }

    // Update total count and pages based on filtered results
    setTotalMedia(filteredMedia.length);
    const newTotalPages = Math.ceil(filteredMedia.length / itemsPerPage);
    setTotalPages(newTotalPages);

    // Validate current page against new total pages
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(newTotalPages);
      return; // Exit early, will re-run when currentPage updates
    }

    // Apply pagination to filtered results
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedMedia = filteredMedia.slice(startIndex, endIndex);

    setMedia(paginatedMedia);
  };

  const handleQualityUpdate = async (mediaId: string, quality: number) => {
    try {
      const accessToken = (session as any)?.accessToken;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/media/${mediaId}/quality`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ quality }),
        }
      );

      if (response.ok) {
        // Update local state
        setMedia((prevMedia) =>
          prevMedia.map((item) =>
            item.id === mediaId ? { ...item, quality } : item
          )
        );

        addToast({
          type: "success",
          title: quality === 1 ? "Marked as Good" : "Marked as Bad",
          description: `Image quality rating updated`,
          duration: 2000,
        });
      }
    } catch (error) {
      console.error("Error updating quality:", error);
      addToast({
        type: "error",
        title: "Update Failed",
        description: "Failed to update image quality rating",
        duration: 3000,
      });
    }
  };

  const handleBulkQualityUpdate = async (quality: number) => {
    if (selectedMedia.size === 0) return;

    try {
      const accessToken = (session as any)?.accessToken;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/media/bulk-quality`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mediaIds: Array.from(selectedMedia),
            quality,
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();

        // Update local state
        setMedia((prevMedia) =>
          prevMedia.map((item) =>
            selectedMedia.has(item.id) ? { ...item, quality } : item
          )
        );

        // Clear selection
        setSelectedMedia(new Set());
        setSelectionMode(false);

        addToast({
          type: "success",
          title: "Bulk Update Successful",
          description: `Updated ${result.updated} images to ${
            quality === 1 ? "Good" : quality === -1 ? "Bad" : "Unrated"
          }`,
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Error bulk updating quality:", error);
      addToast({
        type: "error",
        title: "Bulk Update Failed",
        description: "Failed to update image quality ratings",
        duration: 3000,
      });
    }
  };

  const toggleMediaSelection = (mediaId: string) => {
    setSelectedMedia((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(mediaId)) {
        newSet.delete(mediaId);
      } else {
        newSet.add(mediaId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    const allIds = media.map((m) => m.id);
    setSelectedMedia(new Set(allIds));
  };

  const selectAllVisible = () => {
    // Select only items visible on current page
    const visibleIds = media.map((m) => m.id);
    setSelectedMedia(new Set(visibleIds));
  };

  const clearSelection = () => {
    setSelectedMedia(new Set());
  };

  const exportGoodImageFilenames = () => {
    // Filter for good quality images (quality === 1) and extract filenames
    const goodImages = allMedia.filter((item) => item.quality === 1);
    const filenames = goodImages
      .map((item) => item.filename)
      .filter((filename) => filename) // Remove any undefined filenames
      .sort(); // Sort alphabetically for better organization

    if (filenames.length === 0) {
      addToast({
        type: "warning",
        title: "No Good Images Found",
        description: "No images with 'good' quality rating found to export.",
        duration: 3000,
      });
      return;
    }

    // Create the content as a simple text list
    const content = filenames.join("\n");

    // Create and download the file
    const blob = new Blob([content], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `good-images-${project?.name || "project"}-${
      new Date().toISOString().split("T")[0]
    }.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    addToast({
      type: "success",
      title: "Export Successful",
      description: `Exported ${filenames.length} good image filenames to ${link.download}`,
      duration: 3000,
    });
  };

  // Keyboard shortcuts for quality rating
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only work in gallery tab and when not showing modals
      if (activeTab !== "gallery" || showUpload || showOptimizedUpload) return;

      // Handle selection mode shortcuts
      if (selectionMode) {
        if (event.key === "Escape") {
          event.preventDefault();
          setSelectionMode(false);
          clearSelection();
        } else if ((event.ctrlKey || event.metaKey) && event.key === "a") {
          event.preventDefault();
          selectAllVisible();
        }
        return;
      }

      // Get the media item currently being hovered
      if (hoveredMediaId) {
        switch (event.key) {
          case "1":
            event.preventDefault();
            handleQualityUpdate(hoveredMediaId, 1);
            break;
          case "2":
            event.preventDefault();
            handleQualityUpdate(hoveredMediaId, -1);
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [
    hoveredMediaId,
    activeTab,
    showUpload,
    showOptimizedUpload,
    selectionMode,
  ]);

  const handleUploadSuccess = (newMedia: Media) => {
    setMedia((prevMedia) => [newMedia, ...prevMedia]);
    setShowUpload(false);
  };

  const handleOptimizedUploadComplete = async (results?: any) => {
    if (results) {
      const { totalFiles, successful, failed, skippedDuplicates, duration } =
        results;

      // Show success toast with detailed results
      if (successful > 0) {
        addToast({
          type: "success",
          title: "Bulk Upload Completed!",
          description: `Uploaded ${successful}/${totalFiles} files in ${duration.toFixed(
            1
          )}s${
            skippedDuplicates > 0
              ? `, skipped ${skippedDuplicates} duplicates`
              : ""
          }`,
          duration: 8000,
        });
      }

      // Show info toast for duplicates (even if no new uploads)
      if (skippedDuplicates > 0 && successful === 0) {
        addToast({
          type: "info",
          title: "Duplicates Detected",
          description: `${skippedDuplicates} files were skipped because they already exist in your project.`,
          duration: 6000,
        });
      }

      // Show warning toast if there were failures
      if (failed > 0) {
        addToast({
          type: "warning",
          title: "Some uploads failed",
          description: `${failed} files failed to upload. Check the console for details.`,
          duration: 10000,
        });
      }

      // Enhanced console logging
      console.log("📊 Upload Results Summary:");
      console.log(`  ✅ Successful: ${successful}/${totalFiles}`);
      console.log(`  ❌ Failed: ${failed}`);
      console.log(`  🔄 Skipped duplicates: ${skippedDuplicates}`);
      console.log(`  ⏱️ Duration: ${duration.toFixed(1)} seconds`);
      if (successful > 0) {
        console.log(
          `  🚀 Average speed: ${(successful / duration).toFixed(1)} files/sec`
        );
      }

      // Refresh media on the current page
      fetchMedia();
    }

    setShowOptimizedUpload(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-error-600 mb-4">{error}</p>
                <Button onClick={() => router.push("/dashboard")}>
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-neutral-900">
            {project?.name || "Project"}
          </h1>
          <div className="flex space-x-3">
            <Button
              onClick={() => setShowUpload(true)}
              className="bg-accent-400 hover:bg-accent-500 text-white"
            >
              <FontAwesomeIcon icon={faUpload} className="mr-2" />
              Upload Media
            </Button>
            {/* Optimized Bulk Upload button */}
            <Button
              onClick={() => setShowOptimizedUpload(true)}
              variant="outline"
              className="border-accent-300 text-accent-600 hover:bg-accent-50"
            >
              <FontAwesomeIcon icon={faFolderOpen} className="mr-2" />
              Bulk Upload
            </Button>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              ← Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Upload Modal */}
        {showUpload && (
          <div className="fixed inset-0 backdrop-blur-sm bg-black/10 flex items-center justify-center z-50">
            <div className="bg-white/95 backdrop-blur-md rounded-lg p-6 max-w-lg w-full mx-4 shadow-2xl border border-white/20">
              <MediaUpload
                projectId={projectId}
                onUploadSuccess={handleUploadSuccess}
                onClose={() => setShowUpload(false)}
              />
            </div>
          </div>
        )}

        {/* Project Details Card - Compact */}
        <Card className="mb-4">
          <CardContent className="pt-4 pb-3">
            {project && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-2">
                <div>
                  <span className="text-xs font-medium text-neutral-600">
                    Project:
                  </span>
                  <p
                    className="text-sm text-neutral-900 truncate"
                    title={project.name}
                  >
                    {project.name}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-medium text-neutral-600">
                    Created:
                  </span>
                  <p className="text-sm text-neutral-900">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-medium text-neutral-600">
                    Updated:
                  </span>
                  <p className="text-sm text-neutral-900">
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-medium text-neutral-600">
                    Battles:
                  </span>
                  <p className="text-sm text-neutral-900 font-medium">
                    {battleStats
                      ? battleStats.totalBattles.toLocaleString()
                      : "0"}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-medium text-neutral-600">
                    Good Images:
                  </span>
                  <p className="text-sm text-neutral-900 font-medium">
                    {goodImagesCount.toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Optimized Bulk Upload Modal */}
        {showOptimizedUpload && (
          <OptimizedBulkUpload
            projectId={projectId}
            onClose={handleOptimizedUploadComplete}
            onUploadComplete={() => {
              fetchMedia();
            }}
          />
        )}

        {/* Old Bulk Upload Modal (kept for reference) */}
        {showBulkUpload && (
          <BulkUploadModal
            projectId={projectId}
            onClose={() => setShowBulkUpload(false)}
            onUploadComplete={() => {
              fetchMedia();
              setShowBulkUpload(false);
            }}
          />
        )}

        {/* Tabbed Content */}
        <Card>
          <CardHeader>
            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-neutral-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab("gallery")}
                className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "gallery"
                    ? "bg-white text-primary-700 shadow-sm"
                    : "text-neutral-600 hover:text-primary-600"
                }`}
              >
                <FontAwesomeIcon icon={faImages} className="mr-2" />
                Gallery ({media.length})
              </button>
              <button
                onClick={() => setActiveTab("battle")}
                className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "battle"
                    ? "bg-white text-primary-700 shadow-sm"
                    : "text-neutral-600 hover:text-primary-600"
                }`}
              >
                <FontAwesomeIcon icon={faBolt} className="mr-2" />
                Battle Arena
              </button>
              <button
                onClick={() => setActiveTab("leaderboard")}
                className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "leaderboard"
                    ? "bg-white text-primary-700 shadow-sm"
                    : "text-neutral-600 hover:text-primary-600"
                }`}
              >
                <FontAwesomeIcon icon={faTrophy} className="mr-2" />
                Leaderboard
              </button>
              <button
                onClick={() => {
                  setActiveTab("analytics");
                  if (!analytics) {
                    fetchAnalytics();
                  }
                }}
                className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "analytics"
                    ? "bg-white text-primary-700 shadow-sm"
                    : "text-neutral-600 hover:text-primary-600"
                }`}
              >
                <FontAwesomeIcon icon={faChartBar} className="mr-2" />
                Analytics
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Tab Content */}
            {activeTab === "gallery" && (
              <>
                {/* Bulk Action Bar - Shows when in selection mode */}
                {selectionMode && selectedMedia.size > 0 && (
                  <div className="mb-4 p-4 bg-primary-50 border border-primary-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <span className="text-primary-700 font-medium">
                        {selectedMedia.size} image
                        {selectedMedia.size !== 1 ? "s" : ""} selected
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={selectAllVisible}
                        className="border-primary-300 text-primary-600"
                      >
                        Select All Visible
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={clearSelection}
                        className="border-neutral-300"
                      >
                        Clear
                      </Button>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Button
                        size="sm"
                        onClick={() => handleBulkQualityUpdate(1)}
                        className="bg-success-500 hover:bg-success-600 text-white"
                      >
                        <FontAwesomeIcon icon={faThumbsUp} className="mr-2" />
                        Mark as Good ({selectedMedia.size})
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleBulkQualityUpdate(-1)}
                        className="bg-error-500 hover:bg-error-600 text-white"
                      >
                        <FontAwesomeIcon icon={faThumbsDown} className="mr-2" />
                        Mark as Bad ({selectedMedia.size})
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectionMode(false);
                          clearSelection();
                        }}
                        className="border-neutral-300"
                      >
                        <FontAwesomeIcon icon={faTimes} className="mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <p className="text-sm text-neutral-600">
                      Showing {(currentPage - 1) * itemsPerPage + 1} -{" "}
                      {Math.min(currentPage * itemsPerPage, totalMedia)} of{" "}
                      {totalMedia} images
                    </p>

                    {/* View Columns Selector */}
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-neutral-600">View:</span>
                      <div className="flex border border-neutral-300 rounded-md overflow-hidden">
                        {[1, 2, 3, 4, 5].map((cols) => (
                          <button
                            key={cols}
                            onClick={() => setViewColumns(cols)}
                            className={`px-2 py-1 text-sm font-medium transition-colors ${
                              viewColumns === cols
                                ? "bg-primary-500 text-white"
                                : "bg-white text-neutral-600 hover:bg-neutral-50"
                            }`}
                            title={`${cols} column${
                              cols !== 1 ? "s" : ""
                            } per row`}
                          >
                            <div className="flex items-center space-x-1">
                              <span className="text-xs">{cols}</span>
                              <div className="flex space-x-0.5">
                                {Array.from({ length: cols }, (_, i) => (
                                  <div
                                    key={i}
                                    className={`w-0.5 h-0.5 rounded-full ${
                                      viewColumns === cols
                                        ? "bg-white"
                                        : "bg-neutral-400"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quality Filter */}
                    <div className="flex items-center space-x-2">
                      <FontAwesomeIcon
                        icon={faFilter}
                        className="text-neutral-400"
                      />
                      <select
                        value={qualityFilter}
                        onChange={(e) =>
                          setQualityFilter(e.target.value as any)
                        }
                        className="text-sm border border-neutral-300 rounded-md px-3 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="all">All Images</option>
                        <option value="good">Good Only</option>
                        <option value="bad">Bad Only</option>
                        <option value="unrated">Unrated Only</option>
                      </select>
                    </div>

                    {/* Selection Mode Toggle */}
                    <Button
                      size="sm"
                      variant={selectionMode ? "default" : "outline"}
                      onClick={() => {
                        setSelectionMode(!selectionMode);
                        if (selectionMode) {
                          clearSelection();
                        }
                      }}
                      className={
                        selectionMode
                          ? "bg-primary-500 hover:bg-primary-600 text-white"
                          : "border-neutral-300"
                      }
                    >
                      <FontAwesomeIcon icon={faCheckSquare} className="mr-2" />
                      {selectionMode ? "Exit Selection" : "Multi-Select"}
                    </Button>

                    {/* Parameter Filters Toggle */}
                    {generationParams.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowFilters(!showFilters)}
                        className="border-neutral-300"
                      >
                        <FontAwesomeIcon icon={faSliders} className="mr-2" />
                        Filters
                        {Object.keys(paramFilters).length > 0 && (
                          <span className="ml-2 bg-primary-500 text-white text-xs rounded-full px-2">
                            {Object.keys(paramFilters).length}
                          </span>
                        )}
                        <FontAwesomeIcon
                          icon={showFilters ? faChevronUp : faChevronDown}
                          className="ml-2 text-xs"
                        />
                      </Button>
                    )}

                    {/* Export Good Images Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={exportGoodImageFilenames}
                      className="border-neutral-300 text-primary-600 hover:text-primary-700 hover:border-primary-400"
                      disabled={goodImagesCount === 0}
                    >
                      <FontAwesomeIcon icon={faDownload} className="mr-2" />
                      Export Good ({goodImagesCount})
                    </Button>
                  </div>

                  {/* Pagination controls */}
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1}
                    >
                      <FontAwesomeIcon icon={faChevronLeft} className="mr-1" />
                      Previous
                    </Button>

                    <span className="text-sm text-neutral-600 px-3">
                      Page {currentPage} of {totalPages}
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <FontAwesomeIcon icon={faChevronRight} className="ml-1" />
                    </Button>
                  </div>
                </div>

                {/* Parameter Filters Panel */}
                {showFilters && generationParams.length > 0 && (
                  <div className="mb-4 p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-medium text-neutral-700">
                        Generation Parameter Filters
                      </h3>
                      {Object.keys(paramFilters).length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setParamFilters({});
                          }}
                          className="text-xs border-neutral-300"
                        >
                          Clear All Filters
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {generationParams.map((param) => (
                        <div key={param.paramName} className="space-y-2">
                          <label className="block text-xs font-medium text-neutral-600 capitalize">
                            {param.paramName}
                          </label>
                          <select
                            value={paramFilters[param.paramName] || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              setParamFilters((prev) => {
                                const newFilters = { ...prev };
                                if (value === "") {
                                  delete newFilters[param.paramName];
                                } else {
                                  // Parse value back to original type
                                  try {
                                    newFilters[param.paramName] =
                                      JSON.parse(value);
                                  } catch {
                                    newFilters[param.paramName] = value;
                                  }
                                }
                                return newFilters;
                              });
                            }}
                            className="w-full text-sm border border-neutral-300 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          >
                            <option value="">
                              All (
                              {param.values.reduce(
                                (sum, v) => sum + v.count,
                                0
                              )}
                              )
                            </option>
                            {param.values.map((valueData) => (
                              <option
                                key={JSON.stringify(valueData.value)}
                                value={JSON.stringify(valueData.value)}
                              >
                                {String(valueData.value)} ({valueData.count})
                                {valueData.goodCount > 0 && (
                                  <>
                                    {" "}
                                    •{" "}
                                    {(
                                      (valueData.goodCount / valueData.count) *
                                      100
                                    ).toFixed(0)}
                                    % good
                                  </>
                                )}
                              </option>
                            ))}
                          </select>
                          {paramFilters[param.paramName] !== undefined && (
                            <div className="text-xs text-neutral-500">
                              {(() => {
                                const selectedValue = param.values.find(
                                  (v) =>
                                    JSON.stringify(v.value) ===
                                    JSON.stringify(
                                      paramFilters[param.paramName]
                                    )
                                );
                                if (selectedValue) {
                                  return (
                                    <div className="flex items-center space-x-2">
                                      <span className="text-success-600">
                                        Good: {selectedValue.goodCount}
                                      </span>
                                      <span className="text-error-600">
                                        Bad: {selectedValue.badCount}
                                      </span>
                                      <span className="text-neutral-600">
                                        Unrated:{" "}
                                        {selectedValue.count -
                                          selectedValue.goodCount -
                                          selectedValue.badCount}
                                      </span>
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {Object.keys(paramFilters).length > 0 && (
                      <div className="mt-4 p-3 bg-primary-50 border border-primary-200 rounded">
                        <p className="text-sm text-primary-700">
                          Active filters:{" "}
                          {Object.entries(paramFilters)
                            .map(([key, value]) => (
                              <span key={key} className="font-medium">
                                {key}={String(value)}
                              </span>
                            ))
                            .reduce(
                              (prev, curr, i) =>
                                [prev, i > 0 && ", ", curr] as any
                            )}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {mediaLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                  </div>
                ) : media.length > 0 ? (
                  <div
                    className={`grid gap-6 ${
                      viewColumns === 1
                        ? "grid-cols-1"
                        : viewColumns === 2
                        ? "grid-cols-1 md:grid-cols-2"
                        : viewColumns === 3
                        ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                        : viewColumns === 4
                        ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                        : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                    }`}
                  >
                    {media.map((item) => (
                      <div
                        key={item.id}
                        className={`relative group bg-neutral-100 rounded-lg overflow-hidden ${
                          selectionMode && selectedMedia.has(item.id)
                            ? "ring-4 ring-primary-500"
                            : ""
                        }`}
                        onMouseEnter={() =>
                          !selectionMode && setHoveredMediaId(item.id)
                        }
                        onMouseLeave={() =>
                          !selectionMode && setHoveredMediaId(null)
                        }
                        onClick={() =>
                          selectionMode && toggleMediaSelection(item.id)
                        }
                        style={{
                          cursor: selectionMode ? "pointer" : "default",
                        }}
                      >
                        <div className="w-full">
                          {item.mediaType === "image" ? (
                            <img
                              src={item.mediaUrl}
                              alt="Project media"
                              className="w-full h-auto object-contain"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full relative">
                              <video
                                src={item.mediaUrl}
                                className="w-full h-auto object-contain"
                                muted
                                loop
                                playsInline
                              />
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <FontAwesomeIcon
                                  icon={faVideo}
                                  className="text-4xl text-white/50"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Selection Checkbox */}
                        {selectionMode && (
                          <div className="absolute top-4 left-4">
                            <div
                              className={`w-8 h-8 rounded-md flex items-center justify-center ${
                                selectedMedia.has(item.id)
                                  ? "bg-primary-500 text-white"
                                  : "bg-white/90 border-2 border-neutral-300"
                              }`}
                            >
                              <FontAwesomeIcon
                                icon={
                                  selectedMedia.has(item.id)
                                    ? faCheck
                                    : faSquare
                                }
                                className={
                                  selectedMedia.has(item.id)
                                    ? "text-sm"
                                    : "text-xs text-neutral-400"
                                }
                              />
                            </div>
                          </div>
                        )}

                        {/* Quality rating overlay - shows on hover only when not in selection mode */}
                        {!selectionMode && hoveredMediaId === item.id && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity duration-200">
                            <div className="flex flex-col items-center space-y-4">
                              <p className="text-white text-sm font-medium mb-2">
                                Rate this image
                              </p>
                              <div className="flex space-x-6">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQualityUpdate(item.id, 1);
                                  }}
                                  className={`p-4 rounded-full transition-all ${
                                    item.quality === 1
                                      ? "bg-success-500 text-white"
                                      : "bg-white/90 text-success-600 hover:bg-success-500 hover:text-white"
                                  }`}
                                  title="Good"
                                >
                                  <FontAwesomeIcon
                                    icon={faThumbsUp}
                                    className="text-2xl"
                                  />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQualityUpdate(item.id, -1);
                                  }}
                                  className={`p-4 rounded-full transition-all ${
                                    item.quality === -1
                                      ? "bg-error-500 text-white"
                                      : "bg-white/90 text-error-600 hover:bg-error-500 hover:text-white"
                                  }`}
                                  title="Bad"
                                >
                                  <FontAwesomeIcon
                                    icon={faThumbsDown}
                                    className="text-2xl"
                                  />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Status indicators */}
                        <div className="absolute top-2 left-2 flex flex-col space-y-2">
                          {/* Quality indicator */}
                          {item.quality !== undefined && item.quality !== 0 && (
                            <div
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                item.quality === 1
                                  ? "bg-success-500 text-white"
                                  : "bg-error-500 text-white"
                              }`}
                            >
                              {item.quality === 1 ? "Good" : "Bad"}
                            </div>
                          )}

                          {/* ELO Badge - only show for good images */}
                          {item.quality === 1 && (
                            <div className="bg-primary-500 text-white px-2 py-1 rounded text-xs font-medium">
                              ELO: {item.elo}
                            </div>
                          )}
                        </div>

                        {/* Media info */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                          <div className="text-white">
                            {item.promptDescription && (
                              <p
                                className="text-sm truncate mb-1"
                                title={item.promptDescription}
                              >
                                {item.promptDescription}
                              </p>
                            )}
                            {item.generationParams &&
                              Object.keys(item.generationParams).length > 0 && (
                                <p className="text-xs opacity-75">
                                  {Object.keys(item.generationParams).length}{" "}
                                  parameters
                                </p>
                              )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div
                      className="w-24 h-24 border-2 border-dashed border-neutral-300 rounded-full flex items-center justify-center mb-4 cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors"
                      onClick={() => setShowUpload(true)}
                    >
                      <FontAwesomeIcon
                        icon={faPlus}
                        className="text-2xl text-neutral-400 hover:text-primary-500"
                      />
                    </div>
                    <h3 className="text-lg font-medium text-neutral-900 mb-2">
                      Add Media
                    </h3>
                    <p className="text-neutral-500 text-center max-w-sm">
                      Upload your first image or video to get started with your
                      project gallery.
                    </p>
                    <Button
                      onClick={() => setShowUpload(true)}
                      className="mt-4 bg-accent-400 hover:bg-accent-500 text-white"
                    >
                      <FontAwesomeIcon icon={faPlus} className="mr-2" />
                      Add Media
                    </Button>
                  </div>
                )}
              </>
            )}

            {activeTab === "battle" && <BattleArena projectId={projectId} />}

            {activeTab === "leaderboard" && (
              <Leaderboard projectId={projectId} />
            )}

            {activeTab === "analytics" && (
              <div className="space-y-6">
                {analyticsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                  </div>
                ) : analytics ? (
                  <>
                    {/* Overview Section */}
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                        Project Overview
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div className="bg-neutral-50 p-4 rounded-lg">
                          <p className="text-sm text-neutral-600">
                            Total Images
                          </p>
                          <p className="text-2xl font-bold text-primary-600">
                            {analytics.overview.totalImages}
                          </p>
                        </div>
                        <div className="bg-success-50 p-4 rounded-lg">
                          <p className="text-sm text-neutral-600">
                            Good Images
                          </p>
                          <p className="text-2xl font-bold text-success-600">
                            {analytics.overview.goodImages}
                          </p>
                        </div>
                        <div className="bg-error-50 p-4 rounded-lg">
                          <p className="text-sm text-neutral-600">Bad Images</p>
                          <p className="text-2xl font-bold text-error-600">
                            {analytics.overview.badImages}
                          </p>
                        </div>
                        <div className="bg-warning-50 p-4 rounded-lg">
                          <p className="text-sm text-neutral-600">Unrated</p>
                          <p className="text-2xl font-bold text-warning-600">
                            {analytics.overview.unratedImages}
                          </p>
                        </div>
                        <div className="bg-primary-50 p-4 rounded-lg">
                          <p className="text-sm text-neutral-600">Avg ELO</p>
                          <p className="text-2xl font-bold text-primary-600">
                            {Math.round(analytics.overview.averageElo)}
                          </p>
                        </div>
                        <div className="bg-secondary-50 p-4 rounded-lg">
                          <p className="text-sm text-neutral-600">
                            Est. Battles
                          </p>
                          <p className="text-2xl font-bold text-secondary-600">
                            {analytics.overview.totalBattles}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Parameter Analysis Section */}
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                        Parameter Performance Analysis
                      </h3>
                      <div className="space-y-6">
                        {analytics.parameterAnalysis.map((param: any) => (
                          <div
                            key={param.paramName}
                            className="bg-white border border-neutral-200 rounded-lg p-6"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-md font-medium text-neutral-900 capitalize">
                                {param.paramName}
                              </h4>
                              {param.correlation !== 0 && (
                                <div className="text-sm text-neutral-600">
                                  Correlation:{" "}
                                  {param.correlation > 0 ? "+" : ""}
                                  {param.correlation.toFixed(3)}
                                  {Math.abs(param.correlation) > 0.3 && (
                                    <span
                                      className={`ml-2 px-2 py-1 rounded text-xs ${
                                        Math.abs(param.correlation) > 0.5
                                          ? "bg-success-100 text-success-700"
                                          : "bg-warning-100 text-warning-700"
                                      }`}
                                    >
                                      {Math.abs(param.correlation) > 0.5
                                        ? "Strong"
                                        : "Moderate"}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-neutral-200">
                                    <th className="text-left py-2 font-medium text-neutral-700">
                                      Value
                                    </th>
                                    <th className="text-right py-2 font-medium text-neutral-700">
                                      Total
                                    </th>
                                    <th className="text-right py-2 font-medium text-neutral-700">
                                      Good
                                    </th>
                                    <th className="text-right py-2 font-medium text-neutral-700">
                                      Good Rate
                                    </th>
                                    <th className="text-right py-2 font-medium text-neutral-700">
                                      Avg ELO
                                    </th>
                                    <th className="text-right py-2 font-medium text-neutral-700">
                                      ELO (Good Only)
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {param.values.map(
                                    (valueData: any, index: number) => (
                                      <tr
                                        key={index}
                                        className="border-b border-neutral-100"
                                      >
                                        <td className="py-2 font-mono text-neutral-900">
                                          {String(valueData.value)}
                                        </td>
                                        <td className="text-right py-2 text-neutral-600">
                                          {valueData.totalCount}
                                        </td>
                                        <td className="text-right py-2">
                                          <span className="text-success-600 font-medium">
                                            {valueData.goodCount}
                                          </span>
                                        </td>
                                        <td className="text-right py-2">
                                          <span
                                            className={`px-2 py-1 rounded text-xs font-medium ${
                                              valueData.goodRate >= 0.6
                                                ? "bg-success-100 text-success-700"
                                                : valueData.goodRate >= 0.4
                                                ? "bg-warning-100 text-warning-700"
                                                : "bg-error-100 text-error-700"
                                            }`}
                                          >
                                            {(valueData.goodRate * 100).toFixed(
                                              0
                                            )}
                                            %
                                          </span>
                                        </td>
                                        <td className="text-right py-2 text-neutral-600">
                                          {Math.round(valueData.averageElo)}
                                        </td>
                                        <td className="text-right py-2 text-neutral-600">
                                          {valueData.averageEloGoodOnly > 0
                                            ? Math.round(
                                                valueData.averageEloGoodOnly
                                              )
                                            : "-"}
                                        </td>
                                      </tr>
                                    )
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Top Combinations Section */}
                    {analytics.topCombinations.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                          🏆 Top Parameter Combinations
                        </h3>
                        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-neutral-50">
                                <tr>
                                  <th className="text-left py-3 px-4 font-medium text-neutral-700">
                                    Parameters
                                  </th>
                                  <th className="text-right py-3 px-4 font-medium text-neutral-700">
                                    Total
                                  </th>
                                  <th className="text-right py-3 px-4 font-medium text-neutral-700">
                                    Good
                                  </th>
                                  <th className="text-right py-3 px-4 font-medium text-neutral-700">
                                    Good Rate
                                  </th>
                                  <th className="text-right py-3 px-4 font-medium text-neutral-700">
                                    ELO (Good Only)
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {analytics.topCombinations.map(
                                  (combo: any, index: number) => (
                                    <tr
                                      key={index}
                                      className="border-b border-neutral-100"
                                    >
                                      <td className="py-3 px-4">
                                        <div className="flex flex-wrap gap-1">
                                          {Object.entries(
                                            combo.combination
                                          ).map(([key, value]) => (
                                            <span
                                              key={key}
                                              className="bg-primary-100 text-primary-700 px-2 py-1 rounded text-xs font-mono"
                                            >
                                              {key}={String(value)}
                                            </span>
                                          ))}
                                        </div>
                                      </td>
                                      <td className="text-right py-3 px-4 text-neutral-600">
                                        {combo.totalCount}
                                      </td>
                                      <td className="text-right py-3 px-4">
                                        <span className="text-success-600 font-medium">
                                          {combo.goodCount}
                                        </span>
                                      </td>
                                      <td className="text-right py-3 px-4">
                                        <span
                                          className={`px-2 py-1 rounded text-xs font-medium ${
                                            combo.goodRate >= 0.6
                                              ? "bg-success-100 text-success-700"
                                              : combo.goodRate >= 0.4
                                              ? "bg-warning-100 text-warning-700"
                                              : "bg-error-100 text-error-700"
                                          }`}
                                        >
                                          {(combo.goodRate * 100).toFixed(0)}%
                                        </span>
                                      </td>
                                      <td className="text-right py-3 px-4 text-neutral-600">
                                        {combo.averageEloGoodOnly > 0
                                          ? Math.round(combo.averageEloGoodOnly)
                                          : "-"}
                                      </td>
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Worst Individual Parameters Section */}
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                        ⚠️ Worst Individual Parameters (Avoid These)
                      </h3>
                      <div className="space-y-6">
                        {analytics.parameterAnalysis.map((param: any) => {
                          // Filter to only show parameters with significant bad rates
                          const badParameters = param.values
                            .filter(
                              (valueData: any) =>
                                valueData.badCount > 0 &&
                                valueData.totalCount >= 2
                            )
                            .sort((a: any, b: any) => {
                              // Sort by bad rate descending, then by bad count
                              if (
                                b.badCount / b.totalCount !==
                                a.badCount / a.totalCount
                              ) {
                                return (
                                  b.badCount / b.totalCount -
                                  a.badCount / a.totalCount
                                );
                              }
                              return b.badCount - a.badCount;
                            });

                          if (badParameters.length === 0) return null;

                          return (
                            <div
                              key={param.paramName}
                              className="bg-white border border-error-200 rounded-lg p-6"
                            >
                              <h4 className="text-md font-medium text-neutral-900 capitalize mb-4">
                                {param.paramName} - Bad Performance
                              </h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-neutral-200">
                                      <th className="text-left py-2 font-medium text-neutral-700">
                                        Value
                                      </th>
                                      <th className="text-right py-2 font-medium text-neutral-700">
                                        Total
                                      </th>
                                      <th className="text-right py-2 font-medium text-neutral-700">
                                        Bad
                                      </th>
                                      <th className="text-right py-2 font-medium text-neutral-700">
                                        Bad Rate
                                      </th>
                                      <th className="text-right py-2 font-medium text-neutral-700">
                                        Good Rate
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {badParameters.map(
                                      (valueData: any, index: number) => (
                                        <tr
                                          key={index}
                                          className="border-b border-neutral-100"
                                        >
                                          <td className="py-2 font-mono text-neutral-900">
                                            {String(valueData.value)}
                                          </td>
                                          <td className="text-right py-2 text-neutral-600">
                                            {valueData.totalCount}
                                          </td>
                                          <td className="text-right py-2">
                                            <span className="text-error-600 font-medium">
                                              {valueData.badCount}
                                            </span>
                                          </td>
                                          <td className="text-right py-2">
                                            <span className="px-2 py-1 rounded text-xs font-medium bg-error-100 text-error-700">
                                              {(
                                                (valueData.badCount /
                                                  valueData.totalCount) *
                                                100
                                              ).toFixed(0)}
                                              %
                                            </span>
                                          </td>
                                          <td className="text-right py-2">
                                            <span
                                              className={`px-2 py-1 rounded text-xs font-medium ${
                                                valueData.goodRate >= 0.3
                                                  ? "bg-success-100 text-success-700"
                                                  : "bg-neutral-100 text-neutral-500"
                                              }`}
                                            >
                                              {(
                                                valueData.goodRate * 100
                                              ).toFixed(0)}
                                              %
                                            </span>
                                          </td>
                                        </tr>
                                      )
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Most Unrated Parameters Section */}
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                        🔍 Most Unrated Parameters (Need More Testing)
                      </h3>
                      <div className="space-y-6">
                        {analytics.parameterAnalysis.map((param: any) => {
                          // Filter to only show parameters with significant unrated counts
                          const unratedParameters = param.values
                            .filter(
                              (valueData: any) =>
                                valueData.unratedCount > 0 &&
                                valueData.totalCount >= 2
                            )
                            .sort((a: any, b: any) => {
                              // Sort by unrated count descending, then by unrated rate
                              if (b.unratedCount !== a.unratedCount) {
                                return b.unratedCount - a.unratedCount;
                              }
                              return (
                                b.unratedCount / b.totalCount -
                                a.unratedCount / a.totalCount
                              );
                            });

                          if (unratedParameters.length === 0) return null;

                          return (
                            <div
                              key={param.paramName}
                              className="bg-white border border-warning-200 rounded-lg p-6"
                            >
                              <h4 className="text-md font-medium text-neutral-900 capitalize mb-4">
                                {param.paramName} - Unrated Images
                              </h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-neutral-200">
                                      <th className="text-left py-2 font-medium text-neutral-700">
                                        Value
                                      </th>
                                      <th className="text-right py-2 font-medium text-neutral-700">
                                        Total
                                      </th>
                                      <th className="text-right py-2 font-medium text-neutral-700">
                                        Unrated
                                      </th>
                                      <th className="text-right py-2 font-medium text-neutral-700">
                                        Unrated Rate
                                      </th>
                                      <th className="text-right py-2 font-medium text-neutral-700">
                                        Priority
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {unratedParameters.map(
                                      (valueData: any, index: number) => (
                                        <tr
                                          key={index}
                                          className="border-b border-neutral-100"
                                        >
                                          <td className="py-2 font-mono text-neutral-900">
                                            {String(valueData.value)}
                                          </td>
                                          <td className="text-right py-2 text-neutral-600">
                                            {valueData.totalCount}
                                          </td>
                                          <td className="text-right py-2">
                                            <span className="text-warning-600 font-medium">
                                              {valueData.unratedCount}
                                            </span>
                                          </td>
                                          <td className="text-right py-2">
                                            <span className="px-2 py-1 rounded text-xs font-medium bg-warning-100 text-warning-700">
                                              {(
                                                (valueData.unratedCount /
                                                  valueData.totalCount) *
                                                100
                                              ).toFixed(0)}
                                              %
                                            </span>
                                          </td>
                                          <td className="text-right py-2">
                                            <span
                                              className={`px-2 py-1 rounded text-xs font-medium ${
                                                valueData.unratedCount >= 10
                                                  ? "bg-error-100 text-error-700"
                                                  : valueData.unratedCount >= 5
                                                  ? "bg-warning-100 text-warning-700"
                                                  : "bg-neutral-100 text-neutral-500"
                                              }`}
                                            >
                                              {valueData.unratedCount >= 10
                                                ? "High"
                                                : valueData.unratedCount >= 5
                                                ? "Medium"
                                                : "Low"}
                                            </span>
                                          </td>
                                        </tr>
                                      )
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Worst Combinations Section */}
                    {analytics.worstCombinations &&
                      analytics.worstCombinations.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                            ⚠️ Worst Parameter Combinations (Avoid These)
                          </h3>
                          <div className="bg-white border border-error-200 rounded-lg overflow-hidden">
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-error-50">
                                  <tr>
                                    <th className="text-left py-3 px-4 font-medium text-neutral-700">
                                      Parameters
                                    </th>
                                    <th className="text-right py-3 px-4 font-medium text-neutral-700">
                                      Total
                                    </th>
                                    <th className="text-right py-3 px-4 font-medium text-neutral-700">
                                      Bad
                                    </th>
                                    <th className="text-right py-3 px-4 font-medium text-neutral-700">
                                      Bad Rate
                                    </th>
                                    <th className="text-right py-3 px-4 font-medium text-neutral-700">
                                      Good Rate
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {analytics.worstCombinations.map(
                                    (combo: any, index: number) => (
                                      <tr
                                        key={index}
                                        className="border-b border-neutral-100"
                                      >
                                        <td className="py-3 px-4">
                                          <div className="flex flex-wrap gap-1">
                                            {Object.entries(
                                              combo.combination
                                            ).map(([key, value]) => (
                                              <span
                                                key={key}
                                                className="bg-error-100 text-error-700 px-2 py-1 rounded text-xs font-mono"
                                              >
                                                {key}={String(value)}
                                              </span>
                                            ))}
                                          </div>
                                        </td>
                                        <td className="text-right py-3 px-4 text-neutral-600">
                                          {combo.totalCount}
                                        </td>
                                        <td className="text-right py-3 px-4">
                                          <span className="text-error-600 font-medium">
                                            {combo.badCount}
                                          </span>
                                        </td>
                                        <td className="text-right py-3 px-4">
                                          <span className="px-2 py-1 rounded text-xs font-medium bg-error-100 text-error-700">
                                            {(combo.badRate * 100).toFixed(0)}%
                                          </span>
                                        </td>
                                        <td className="text-right py-3 px-4">
                                          <span
                                            className={`px-2 py-1 rounded text-xs font-medium ${
                                              combo.goodRate > 0
                                                ? "bg-success-100 text-success-700"
                                                : "bg-neutral-100 text-neutral-500"
                                            }`}
                                          >
                                            {(combo.goodRate * 100).toFixed(0)}%
                                          </span>
                                        </td>
                                      </tr>
                                    )
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}

                    {/* Unrated Combinations Section */}
                    {analytics.unratedCombinations &&
                      analytics.unratedCombinations.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                            🔍 Most Unrated Combinations (Need More Testing)
                          </h3>
                          <div className="bg-white border border-warning-200 rounded-lg overflow-hidden">
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-warning-50">
                                  <tr>
                                    <th className="text-left py-3 px-4 font-medium text-neutral-700">
                                      Parameters
                                    </th>
                                    <th className="text-right py-3 px-4 font-medium text-neutral-700">
                                      Total
                                    </th>
                                    <th className="text-right py-3 px-4 font-medium text-neutral-700">
                                      Unrated
                                    </th>
                                    <th className="text-right py-3 px-4 font-medium text-neutral-700">
                                      Unrated Rate
                                    </th>
                                    <th className="text-right py-3 px-4 font-medium text-neutral-700">
                                      Priority
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {analytics.unratedCombinations.map(
                                    (combo: any, index: number) => (
                                      <tr
                                        key={index}
                                        className="border-b border-neutral-100"
                                      >
                                        <td className="py-3 px-4">
                                          <div className="flex flex-wrap gap-1">
                                            {Object.entries(
                                              combo.combination
                                            ).map(([key, value]) => (
                                              <span
                                                key={key}
                                                className="bg-warning-100 text-warning-700 px-2 py-1 rounded text-xs font-mono"
                                              >
                                                {key}={String(value)}
                                              </span>
                                            ))}
                                          </div>
                                        </td>
                                        <td className="text-right py-3 px-4 text-neutral-600">
                                          {combo.totalCount}
                                        </td>
                                        <td className="text-right py-3 px-4">
                                          <span className="text-warning-600 font-medium">
                                            {combo.unratedCount}
                                          </span>
                                        </td>
                                        <td className="text-right py-3 px-4">
                                          <span className="px-2 py-1 rounded text-xs font-medium bg-warning-100 text-warning-700">
                                            {(combo.unratedRate * 100).toFixed(
                                              0
                                            )}
                                            %
                                          </span>
                                        </td>
                                        <td className="text-right py-3 px-4">
                                          <span
                                            className={`px-2 py-1 rounded text-xs font-medium ${
                                              combo.unratedCount >= 5
                                                ? "bg-error-100 text-error-700"
                                                : combo.unratedCount >= 3
                                                ? "bg-warning-100 text-warning-700"
                                                : "bg-neutral-100 text-neutral-500"
                                            }`}
                                          >
                                            {combo.unratedCount >= 5
                                              ? "High"
                                              : combo.unratedCount >= 3
                                              ? "Medium"
                                              : "Low"}
                                          </span>
                                        </td>
                                      </tr>
                                    )
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}

                    {/* Data Quality Section */}
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                        Data Quality Indicators
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-neutral-50 p-4 rounded-lg">
                          <p className="text-sm text-neutral-600 mb-1">
                            Avg Battles per Image
                          </p>
                          <p className="text-xl font-bold text-neutral-900">
                            {analytics.dataQuality.averageBattlesPerImage.toFixed(
                              1
                            )}
                          </p>
                          <p className="text-xs text-neutral-500 mt-1">
                            Target: 5+ for reliability
                          </p>
                        </div>
                        <div className="bg-neutral-50 p-4 rounded-lg">
                          <p className="text-sm text-neutral-600 mb-1">
                            Images with Min Battles
                          </p>
                          <p className="text-xl font-bold text-neutral-900">
                            {analytics.dataQuality.imagesWithMinimumBattles}
                          </p>
                          <p className="text-xs text-neutral-500 mt-1">
                            Images with 2+ estimated battles
                          </p>
                        </div>
                        <div className="bg-neutral-50 p-4 rounded-lg">
                          <p className="text-sm text-neutral-600 mb-1">
                            Parameter Coverage
                          </p>
                          <p className="text-xl font-bold text-neutral-900">
                            {(
                              analytics.dataQuality.parameterCoverage * 100
                            ).toFixed(1)}
                            %
                          </p>
                          <p className="text-xs text-neutral-500 mt-1">
                            Tested parameter combinations
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-neutral-600 mb-4">
                      No analytics data available
                    </p>
                    <Button
                      onClick={fetchAnalytics}
                      className="bg-primary-500 hover:bg-primary-600 text-white"
                    >
                      Load Analytics
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  return (
    <ToastProvider>
      <ProjectDetailPageContent />
    </ToastProvider>
  );
}
