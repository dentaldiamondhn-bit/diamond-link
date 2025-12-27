import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function middleware(request) {
  const { userId } = auth();
  const isPublicRoute = ["/", "/sign-in", "/sign-up"].includes(request.nextUrl.pathname);

  if (!userId && !isPublicRoute) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};