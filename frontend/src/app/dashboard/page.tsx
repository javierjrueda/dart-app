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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface Project {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isPending = status === "loading";
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProjects, setTotalProjects] = useState(0);
  const projectsPerPage = 10;

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/auth/signin");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session) {
      fetchProjects();
    }
  }, [session, currentPage]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError("");
      const accessToken = (session as any)?.accessToken;

      // Debug logs only in development
      if (process.env.NODE_ENV === "development") {
        console.log("=== DEBUG: Dashboard project fetch ===");
        console.log("Session object:", session);
        console.log("Access token found:", !!accessToken);
        console.log("API URL:", process.env.NEXT_PUBLIC_API_URL);
      }

      if (!accessToken) {
        console.error("No access token found in session:", session);
        setError("Authentication error: No access token found");
        return;
      }

      if (process.env.NODE_ENV === "development") {
        console.log(
          "Making API request to:",
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/projects?page=${currentPage}&limit=${projectsPerPage}`
        );
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/projects?page=${currentPage}&limit=${projectsPerPage}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (process.env.NODE_ENV === "development") {
        console.log("API Response status:", response.status);
        console.log(
          "API Response headers:",
          Object.fromEntries(response.headers.entries())
        );
      }

      if (response.ok) {
        const data = await response.json();
        if (process.env.NODE_ENV === "development") {
          console.log("Projects data received:", data);
        }

        if (data.projects && Array.isArray(data.projects)) {
          setProjects(data.projects);
          setTotalProjects(data.total || data.projects.length);
        } else if (Array.isArray(data)) {
          // Fallback for non-paginated response
          setProjects(data);
          setTotalProjects(data.length);
        } else {
          setProjects([]);
          setTotalProjects(0);
        }
      } else {
        const errorText = await response.text();
        if (process.env.NODE_ENV === "development") {
          console.error("API Error response:", errorText);
          console.error("Failed to fetch projects", response.status);
        }
        if (response.status === 401) {
          setError("Authentication error: Please sign out and sign in again");
        } else {
          setError(
            `Failed to load projects: ${response.status} ${response.statusText}`
          );
        }
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      setError("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalProjects / projectsPerPage);

  const handleProjectClick = (projectId: string) => {
    router.push(`/projects/${projectId}`);
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-4">
            Welcome to your Dashboard, {session.user?.name}!
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Projects</CardTitle>
            <CardDescription>
              Collaborate on projects from all team members
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={fetchProjects} variant="outline">
                  Try Again
                </Button>
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-neutral-600 mb-4">No projects found.</p>
                <Button onClick={() => router.push("/projects")}>
                  Create Your First Project
                </Button>
              </div>
            ) : (
              <>
                <div className="w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[300px]">
                          Project Name
                        </TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projects.map((project) => (
                        <TableRow
                          key={project.id}
                          className="cursor-pointer hover:bg-neutral-50 transition-colors"
                          onClick={() => handleProjectClick(project.id)}
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
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleProjectClick(project.id);
                              }}
                            >
                              View →
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-neutral-600">
                      Showing {(currentPage - 1) * projectsPerPage + 1} to{" "}
                      {Math.min(currentPage * projectsPerPage, totalProjects)}{" "}
                      of {totalProjects} projects
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>

                      {[...Array(totalPages)].map((_, index) => {
                        const page = index + 1;
                        if (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        ) {
                          return (
                            <Button
                              key={page}
                              variant={
                                currentPage === page ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => goToPage(page)}
                            >
                              {page}
                            </Button>
                          );
                        } else if (
                          page === currentPage - 2 ||
                          page === currentPage + 2
                        ) {
                          return (
                            <span key={page} className="px-2">
                              ...
                            </span>
                          );
                        }
                        return null;
                      })}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Button onClick={() => router.push("/projects")}>
            Manage All Projects
          </Button>
        </div>
      </div>
    </div>
  );
}
