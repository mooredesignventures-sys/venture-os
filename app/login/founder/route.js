import { NextResponse } from "next/server";

export async function GET(request) {
  const response = NextResponse.redirect(new URL("/app", request.url));
  response.cookies.set({
    name: "temp_app_access",
    value: "1",
    path: "/",
    sameSite: "lax",
    secure: false,
    maxAge: 60 * 60 * 24,
  });
  response.cookies.set({
    name: "founder_session",
    value: "1",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: false,
    maxAge: 60 * 60 * 24,
  });
  return response;
}
