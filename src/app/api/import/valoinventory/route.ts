import { NextRequest, NextResponse } from "next/server";

const VALO_INVENTORY_API = "https://valoinventory-1.onrender.com";

function extractToken(input: string): string | null {
  input = input.trim();
  const urlMatch = input.match(/\/share\/([a-f0-9-]{36})/i);
  if (urlMatch) return urlMatch[1];
  if (/^[a-f0-9-]{36}$/i.test(input)) return input;
  return null;
}

function withTimeout(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token requerido" }, { status: 400 });
  }

  const puuid = extractToken(token);
  if (!puuid) {
    return NextResponse.json({ error: "URL o token inválido" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${VALO_INVENTORY_API}/api/auth/public/account/${puuid}`,
      {
        headers: { Accept: "application/json" },
        signal: withTimeout(30000), // 30s — Render free tier puede tardar en despertar
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `Error del servidor: ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();

    if (!data.success) {
      return NextResponse.json(
        { error: data.message ?? "Link inválido o cuenta no compartida" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    const isTimeout =
      err instanceof Error &&
      (err.name === "AbortError" || err.message.includes("abort"));

    return NextResponse.json(
      {
        error: isTimeout
          ? "Timeout: el servidor ValoInventory tardó demasiado (puede estar durmiendo en Render, intentá de nuevo en unos segundos)"
          : `Error de red: ${err instanceof Error ? err.message : "desconocido"}`,
      },
      { status: 504 }
    );
  }
}
