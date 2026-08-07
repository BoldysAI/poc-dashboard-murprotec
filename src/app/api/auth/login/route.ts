import { NextResponse } from "next/server";
import { verifyCredentials } from "@/lib/auth/credentials";
import {
  applySessionCookie,
  encryptSession,
} from "@/lib/auth/session";

export const runtime = "nodejs";

type LoginBody = {
  username?: unknown;
  password?: unknown;
};

export async function POST(request: Request) {
  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json(
      { error: "Requête invalide." },
      { status: 400 },
    );
  }

  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";

  const result = verifyCredentials(username, password);
  if (!result.ok) {
    if (result.reason === "missing_config") {
      return NextResponse.json(
        { error: "Authentification non configurée." },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Identifiant ou mot de passe incorrect." },
      { status: 401 },
    );
  }

  const token = await encryptSession({ sub: username.trim() });
  if (!token) {
    return NextResponse.json(
      { error: "Authentification non configurée." },
      { status: 503 },
    );
  }

  const response = NextResponse.json({ ok: true });
  applySessionCookie(response, token);
  return response;
}
