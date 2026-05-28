import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  // Password correct — set a secure httpOnly session cookie
  const response = NextResponse.json({ success: true });
  response.cookies.set("admin_session", process.env.ADMIN_TOKEN!, {
    httpOnly: true,     // JS cannot read this cookie
    secure: true,       // HTTPS only (Vercel enforces this in prod)
    sameSite: "lax",    // CSRF protection
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return response;
}