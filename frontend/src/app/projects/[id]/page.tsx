"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faUpload,
  faImage,
  faVideo,
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
  createdAt: string;
  updatedAt: string;
}

export default function ProjectDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const isPending = status === "loading";
  const [project, setProject] = useState<Project | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [error, setError] = useState("");
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/auth/signin");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session && projectId) {
      fetchProject();
      fetchMedia();
    }
  }, [session, projectId]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const accessToken = (session as any)?.accessToken;

      if (!accessToken) {
        setError("Authentication error: No access token found");
        return;
      }

      const response = await fetch(
        `http://localhost:3001/api/v1/projects/${projectId}`,
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

  const fetchMedia = async () => {
    try {
      setMediaLoading(true);
      const accessToken = (session as any)?.accessToken;

      if (!accessToken) {
        return;
      }

      const response = await fetch(
        `http://localhost:3001/api/v1/projects/${projectId}/media`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const mediaData = await response.json();
        setMedia(mediaData.media || []);
      } else {
        console.error("Failed to fetch media", response.status);
      }
    } catch (error) {
      console.error("Error fetching media:", error);
    } finally {
      setMediaLoading(false);
    }
  };

  const handleUploadSuccess = (newMedia: Media) => {
    setMedia((prevMedia) => [newMedia, ...prevMedia]);
    setShowUpload(false);
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              ← Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Upload Modal */}
        {showUpload && (
          <div className="fixed inset-0 bg-neutral-900 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
              <MediaUpload
                projectId={projectId}
                onUploadSuccess={handleUploadSuccess}
                onClose={() => setShowUpload(false)}
              />
            </div>
          </div>
        )}

        {/* Project Details Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>
              {project?.name || "Loading project information..."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {project && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700">
                    Project Name
                  </label>
                  <p className="mt-1 text-sm text-neutral-900">
                    {project.name}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700">
                    Created At
                  </label>
                  <p className="mt-1 text-sm text-neutral-900">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700">
                    Last Updated
                  </label>
                  <p className="mt-1 text-sm text-neutral-900">
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Media Gallery Card */}
        <Card>
          <CardHeader>
            <CardTitle>Media Gallery</CardTitle>
            <CardDescription>
              {media.length > 0
                ? `${media.length} ${
                    media.length === 1 ? "item" : "items"
                  } in this project`
                : "No media uploaded yet"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mediaLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
              </div>
            ) : media.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {media.map((item) => (
                  <div
                    key={item.id}
                    className="relative group aspect-square bg-neutral-100 rounded-lg overflow-hidden"
                  >
                    {item.mediaType === "image" ? (
                      <img
                        src={item.mediaUrl}
                        alt="Project media"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-neutral-200">
                        <FontAwesomeIcon
                          icon={faVideo}
                          className="text-2xl text-neutral-400"
                        />
                        <video
                          src={item.mediaUrl}
                          className="absolute inset-0 w-full h-full object-cover"
                          muted
                        />
                      </div>
                    )}

                    {/* Media Type Badge */}
                    <div className="absolute top-2 right-2 bg-neutral-900 bg-opacity-75 text-white px-2 py-1 rounded text-xs">
                      <FontAwesomeIcon
                        icon={item.mediaType === "image" ? faImage : faVideo}
                        className="mr-1"
                      />
                      {item.mediaType}
                    </div>

                    {/* ELO Badge */}
                    <div className="absolute bottom-2 left-2 bg-primary-500 text-white px-2 py-1 rounded text-xs font-medium">
                      ELO: {item.elo}
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
