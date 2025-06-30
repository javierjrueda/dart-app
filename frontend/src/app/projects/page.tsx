"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import DebugInfo from "@/components/DebugInfo";

interface Project {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProjectsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isPending = status === "loading";
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/auth/signin");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session) {
      fetchProjects();
    }
  }, [session]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const accessToken = (session as any)?.accessToken;

      console.log("=== DEBUG: Project fetch attempt ===");
      console.log("Session object:", session);
      console.log("Access token found:", !!accessToken);
      console.log("API URL:", process.env.NEXT_PUBLIC_API_URL);

      if (!accessToken) {
        console.error("No access token found in session:", session);
        setError(
          "Authentication error: No access token found. Please sign out and sign in again."
        );
        return;
      }

      console.log(
        "Making API request to:",
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/projects`
      );

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/projects`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      console.log("API Response status:", response.status);
      console.log(
        "API Response headers:",
        Object.fromEntries(response.headers.entries())
      );

      if (response.ok) {
        const projectsData = await response.json();
        console.log("Projects data received:", projectsData);
        // Handle paginated response structure
        setProjects(projectsData.projects || projectsData);
      } else {
        const errorText = await response.text();
        console.error("API Error response:", errorText);
        console.error(
          "Failed to fetch projects",
          response.status,
          response.statusText
        );
        if (response.status === 401) {
          setError("Authentication error: Please sign out and sign in again.");
        } else {
          setError(
            `Failed to fetch projects: ${response.status} ${response.statusText}`
          );
        }
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      setError(
        `Network error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      setError("Project name is required");
      return;
    }

    try {
      setCreating(true);
      setError("");

      const accessToken = (session as any)?.accessToken;

      if (!accessToken) {
        setError(
          "Authentication error: No access token found. Please sign out and sign in again."
        );
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/projects`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ name: newProjectName.trim() }),
        }
      );

      if (response.ok) {
        const newProject = await response.json();
        setProjects([newProject, ...(projects || [])]);
        setNewProjectName("");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to create project");
        if (response.status === 401) {
          setError("Authentication error: Please sign out and sign in again.");
        }
      }
    } catch (error) {
      console.error("Error creating project:", error);
      setError("Failed to create project");
    } finally {
      setCreating(false);
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-4">Projects</h1>
          <p className="text-neutral-600">
            Collaborate on all team projects. Create new projects or work on
            existing ones.
          </p>
        </div>

        {/* Temporary Debug Component for Production Issues */}
        {process.env.NODE_ENV === "production" && <DebugInfo />}

        {/* Create Project Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Create New Project</CardTitle>
            <CardDescription>
              Add a new project to get started with your work.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createProject} className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Enter project name"
                  disabled={creating}
                />
                {error && <p className="text-error-600 text-sm">{error}</p>}
              </div>
              <div className="flex items-end">
                <Button
                  type="submit"
                  disabled={creating || !newProjectName.trim()}
                  variant="default"
                  size="default"
                >
                  {creating ? "Creating..." : "Create Project"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Projects Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Projects</CardTitle>
            <CardDescription>
              All team projects available for collaboration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
              </div>
            ) : !projects || projects.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-neutral-600">
                  No projects available yet. Create the first team project
                  above!
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Last Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(projects || []).map((project) => (
                      <TableRow
                        key={project.id}
                        className="cursor-pointer hover:bg-neutral-50"
                        onClick={() => router.push(`/projects/${project.id}`)}
                      >
                        <TableCell className="font-medium">
                          {project.name}
                        </TableCell>
                        <TableCell className="text-sm text-neutral-600">
                          {project.userId === (session as any)?.user?.id
                            ? "You"
                            : `User ${project.userId.slice(-6)}`}
                        </TableCell>
                        <TableCell>
                          {new Date(project.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {new Date(project.updatedAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
