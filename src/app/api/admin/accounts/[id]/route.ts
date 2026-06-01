import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { AccountsData } from "@/types";

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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = devOnly();
  if (guard) return guard;

  const { id } = await params;
  const body = await req.json();
  const data = readData();

  const idx = data.accounts.findIndex((a) => a.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  const now = new Date().toISOString();
  data.accounts[idx] = {
    ...data.accounts[idx],
    title: body.title?.trim() ?? data.accounts[idx].title,
    description: body.description?.trim() || undefined,
    price: body.price !== undefined ? Number(body.price) : data.accounts[idx].price,
    currency: body.currency ?? data.accounts[idx].currency,
    status: body.status ?? data.accounts[idx].status,
    region: body.region ?? data.accounts[idx].region,
    rank: body.rank || undefined,
    featured: body.featured !== undefined ? Boolean(body.featured) : data.accounts[idx].featured,
    skins: body.skins ?? data.accounts[idx].skins,
    agents: body.agents ?? data.accounts[idx].agents,
    buddies: body.buddies ?? data.accounts[idx].buddies,
    sprays: body.sprays ?? data.accounts[idx].sprays,
    cards: body.cards ?? data.accounts[idx].cards,
    titles: body.titles ?? data.accounts[idx].titles,
    updatedAt: now,
  };
  data.lastUpdated = now;
  writeData(data);

  return NextResponse.json(data.accounts[idx]);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = devOnly();
  if (guard) return guard;

  const { id } = await params;
  const data = readData();

  const before = data.accounts.length;
  data.accounts = data.accounts.filter((a) => a.id !== id);

  if (data.accounts.length === before) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  data.lastUpdated = new Date().toISOString();
  writeData(data);

  return NextResponse.json({ ok: true });
}
