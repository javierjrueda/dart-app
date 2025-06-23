import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/auth/signin",
  },
});

export const config = {
  matcher: [
    /*
     * Match all request paths that need authentication:
     * - dashboard pages
     * - any future protected routes
     * Exclude:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth pages (signin/signup)
     * - public pages (home)
     */
    "/dashboard/:path*",
  ],
};
