import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { ValoAccount, AccountsData } from "@/types";

const DATA_PATH = path.join(process.cwd(), "src", "data", "accounts.json");

function readData(): AccountsData {
  return JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
}

function writeData(data: AccountsData) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), "utf-8");
}

function devOnly() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const guard = devOnly();
  if (guard) return guard;
  const data = readData();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const guard = devOnly();
  if (guard) return guard;

  const body = await req.json();

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Título requerido" }, { status: 400 });
  }

  const data = readData();
  const now = new Date().toISOString();
  const account: ValoAccount = {
    id: randomUUID(),
    title: body.title.trim(),
    description: body.description?.trim() || undefined,
    price: Number(body.price) || 0,
    currency: body.currency ?? "USD",
    status: body.status ?? "available",
    region: body.region ?? "LATAM",
    rank: body.rank || undefined,
    featured: Boolean(body.featured),
    skins: body.skins ?? [],
    agents: body.agents ?? [],
    buddies: body.buddies ?? [],
    sprays: body.sprays ?? [],
    cards: body.cards ?? [],
    titles: body.titles ?? [],
    createdAt: now,
    updatedAt: now,
  };

  data.accounts.push(account);
  data.lastUpdated = now;
  writeData(data);

  return NextResponse.json(account, { status: 201 });
}
