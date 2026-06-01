import type { Rarity } from "@/types";

const RARITY_COLORS: Record<Rarity, string> = {
  Select: "#5b87c4",
  Deluxe: "#3db468",
  Premium: "#c050e8",
  Ultra: "#e8a830",
  Exclusive: "#e85050",
  Edition: "#40c8a8",
};

export function rarityColor(rarity: Rarity): string {
  return RARITY_COLORS[rarity] ?? "#8080a0";
}

export function rarityLabel(rarity: Rarity): string {
  return rarity;
}

export const RARITY_ORDER: Rarity[] = [
  "Select",
  "Deluxe",
  "Premium",
  "Ultra",
  "Exclusive",
  "Edition",
];
