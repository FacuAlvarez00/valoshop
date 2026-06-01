export interface VinfoSkin {
  name: string;
  price?: Record<string, string | number>;
}

const CHAMPIONS_MELEE = [
  "Champions 2021 Karambit",
  "Champions 2022 Butterfly Knife",
  "Champions 2023 Kunai",
  "Champions 2024 Blade",
  "Champions 2025 Butterfly Knife",
];

export function isHardcodedExclusive(skinName: string): boolean {
  return getSkinVPPrice(skinName, []) !== null;
}

export function getSkinVPPrice(skinName: string, weaponSkins: VinfoSkin[]): number | null {
  if (skinName === "VCT LOCK//IN Misericórdia") return 5440;
  if (skinName === "VCT 2026 Sigil") return 5350;
  if (skinName === "VCT 2025 Karambit") return 5350;
  if (skinName === "XERØFANG Vandal") return 1775;
  if (skinName === "Arcane Vandal") return 2175;
  if (skinName === "Arcane Sheriff") return 2380;
  if (skinName === "Arcane Gauntlets") return 4350;
  if (skinName === "Ignite Fan") return 4350;
  if (skinName === "5 Years // Beta Remastered Knife") return 4350;
  if (CHAMPIONS_MELEE.includes(skinName)) return 5350;
  if (skinName.startsWith("Champions 202")) return 2675;
  if (/vct\d*\s+x\b/i.test(skinName)) return 2340;

  const found = weaponSkins.find((s) => s.name === skinName);
  if (found?.price) {
    const p = Object.values(found.price)[0];
    if (p) return parseInt(String(p), 10);
  }
  return null;
}
