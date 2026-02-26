import { NextResponse } from "next/server";

export async function GET(request) {
  const secure = process.env.NODE_ENV === "production";
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.set({
    name: "temp_app_access",
    value: "",
    path: "/",
    sameSite: "lax",
    secure,
    maxAge: 0,
  });
  response.cookies.set({
    name: "founder_session",
    value: "",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure,
    maxAge: 0,
  });
  return response;
}
