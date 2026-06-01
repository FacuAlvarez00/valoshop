const BUNDLE_DATES: Record<string, string> = {
  "Prime": "2020-06-02",
  "Sovereign": "2020-06-09",
  "Prism": "2020-06-23",
  "Elderflame": "2020-07-07",
  "Oni": "2020-07-21",
  "Glitchpop": "2020-08-04",
  "Nebula": "2020-08-20",
  "Spline": "2020-09-01",
  "Ego": "2020-09-15",
  "Smite": "2020-09-15",
  "Gravitational Uranium Neuroblaster": "2020-09-29",
  "Singularity": "2020-10-13",
  "Reaver": "2020-10-27",
  "Ion": "2020-11-10",
  "Wasteland": "2020-11-10",
  "Sensation": "2020-11-10",
  "Winterwunderland": "2020-12-08",
  "BlastX": "2020-12-08",
  "Run It Back": "2021-01-12",
  "Prism II": "2021-01-20",
  "Horizon": "2021-01-20",
  "Glitchpop, EP 2": "2021-02-02",
  "Glitchpop Episode 2": "2021-02-02",
  "Celestial": "2021-02-17",
  "VALORANT GO! Vol. 1": "2021-02-17",
  "Prime//2.0": "2021-03-02",
  "Infantry": "2021-03-16",
  "Magepunk": "2021-03-30",
  "Silvanus": "2021-04-13",
  "Forsaken": "2021-04-27",
  "Minima": "2021-05-11",
  "Tethered Realms": "2021-05-11",
  "Origin": "2021-06-08",
  "Give Back": "2021-06-22",
  "Ruination": "2021-07-07",
  "Sentinels of Light": "2021-07-20",
  "Sakura": "2021-08-10",
  "Recon": "2021-08-24",
  "Spectrum": "2021-09-08",
  "VALORANT GO! Vol. 2": "2021-09-21",
  "RGX 11z Pro": "2021-10-05",
  "Nunca Olvidados": "2021-10-19",
  "Radiant Crisis 001": "2021-11-02",
  "Arcane": "2021-11-02",
  "Magepunk, EP 3": "2021-11-16",
  "Magepunk Episode 3": "2021-11-16",
  "Champions 2021": "2021-11-16",
  "Snowfall": "2021-12-07",
  "Run It Back, EP 3": "2021-12-07",
  "Protocol 781-A": "2022-01-11",
  "Tigris": "2022-02-01",
  "Undercity": "2022-02-15",
  "Gaia's Vengeance": "2022-03-01",
  "Team Ace": "2022-03-01",
  "Endeavour": "2022-03-22",
  "Doodle Buds": "2022-04-12",
  "RGX 11z Pro, EP 4": "2022-04-27",
  "Titanmail": "2022-05-10",
  "Neptune": "2022-05-24",
  "Xenohunter": "2022-06-07",
  "Prelude to Chaos": "2022-06-22",
  "Sarmad": "2022-07-12",
  "Run It Back, EP 5": "2022-07-12",
  "Reaver, EP 5": "2022-08-09",
  "Champions 2022": "2022-08-23",
  "Kohaku & Matsuba": "2022-09-07",
  "ChronoVoid": "2022-09-20",
  "Crimsonbeast": "2022-10-04",
  "Ion, EP 5": "2022-10-18",
  "Soulstrife": "2022-11-01",
  "Give Back // 2022": "2022-11-15",
  "Abyssal": "2022-11-15",
  "Cryostasis": "2022-12-06",
  "Araxys": "2023-01-10",
  "Luna": "2023-01-18",
  "VCT LOCK//IN": "2023-02-07",
  "Reverie": "2023-02-14",
  "Oni, EP 6": "2023-03-07",
  "Altitude": "2023-03-28",
  "Black.Market": "2023-04-11",
  "Radiant Entertainment System": "2023-04-25",
  "Run It Back, EP 6": "2023-04-25",
  "Magepunk, EP 6": "2023-05-23",
  "NO LIMITS": "2023-06-06",
  "Neo Frontier": "2023-06-27",
  "Ignite": "2023-07-11",
  "Give Back // 2023": "2023-07-11",
  "Champions 2023": "2023-08-01",
  "Daydreams": "2023-08-08",
  "Imperium": "2023-08-29",
  "Intergrade": "2023-09-19",
  "Gaia's Vengeance, EP 7": "2023-10-03",
  "Orion": "2023-10-17",
  "Valiant Hero": "2023-10-31",
  "Sentinels of Light, EP 7": "2023-11-14",
  "Chromedek": "2023-11-14",
  "Overdrive": "2023-12-05",
  "Run It Back, EP 7": "2023-12-05",
  "Kuronami": "2024-01-09",
  "Throwback Pack: Outlaw": "2024-01-09",
  "Emberclad": "2024-01-23",
  "XERØFANG": "2024-02-06",
  "VCT Team Capsules": "2024-02-21",
  "MK.VII Liberty": "2024-02-21",
  "Primordium": "2024-03-05",
  "Fortune's Hand": "2024-03-05",
  "Sovereign, EP 8": "2024-03-26",
  "Switchback": "2024-04-16",
  "Mystbloom": "2024-04-30",
  "VCT CN Team Capsules": "2024-05-14",
  "Holomoku": "2024-05-14",
  "Give Back // 2024": "2024-05-29",
  "Aemondir": "2024-06-11",
  "Evori Dreamwings": "2024-06-25",
  "RGX 11z Pro, EP 9": "2024-07-16",
  "Champions 2024": "2024-07-30",
  "Wonderstallion": "2024-08-13",
  "Nocturnum": "2024-08-27",
  "Aperture": "2024-09-10",
  "Singularity, EP 9": "2024-09-24",
  "Run It Back: Singularity": "2024-09-24",
  "Doombringer": "2024-10-22",
  "Arcane, EP 9": "2024-11-05",
  "Combat Crafts": "2024-11-19",
  "Araxys (EP 9)": "2024-12-10",
  "VCT26 Team Capsules": "2025-01-07",
  "EX.O": "2025-01-07",
  "Helix": "2025-01-22",
  "VCT 2025 Season": "2025-02-04",
  "Neptune (V25)": "2025-02-19",
  "CYRAX": "2025-03-04",
  "Storm Maw": "2025-03-18",
  "Bolt": "2025-04-01",
  "VCT25 Team Capsules": "2025-04-01",
  "Minima (V25)": "2025-04-15",
  "Divergence": "2025-04-29",
  "Give Back // V25": "2025-05-13",
  "5 Years Beta Remastered": "2025-05-28",
  "5 Years // Beta Remastered": "2025-05-28",
  "VALORANT GO! Vol. 3": "2025-06-10",
  "Phaseguard": "2025-06-24",
  "Rupture": "2025-06-24",
  "SplashX": "2025-07-29",
  "Bubblegum Deathwish": "2025-08-19",
  "Champions 2025": "2025-09-03",
  "Prelude to Chaos (V25)": "2025-09-16",
  "Wasteland (V25)": "2025-09-30",
  "Dolmir's Revenge": "2025-10-14",
  "Nanomight": "2025-10-28",
  "ORA by OneTap": "2025-11-11",
  "Mystbloom (V25)": "2025-12-02",
  "Run It Back // V25": "2025-12-02",
  "Ayakashi": "2026-01-06",
  "Reaver (V26)": "2026-01-21",
  "Run It Back: Reaver": "2026-01-21",
  "Solarstride": "2026-02-03",
  "Run It Back: Lunar 26": "2026-02-03",
  "VCT 2026 Season": "2026-02-18",
  "SilkLeaf": "2026-03-03",
  "Blackthorn": "2026-03-17",
  "Jellybeam": "2026-03-31",
  "Holo Meridian": "2026-04-14",
  "Kuronami (V26)": "2026-04-28",
};

// Per-UUID overrides for re-releases that share a displayName with their original in the API.
// displayName: shown in the picker UI instead of the raw API displayName
// accessoryPrefix: prefix used to match buddies/sprays/cards (they follow "Name, VXX " convention)
interface BundleOverride {
  displayName: string;
  accessoryPrefix: string;
}

const BUNDLE_UUID_OVERRIDES: Record<string, BundleOverride> = {
  "69d9b2be-4439-0785-780b-ba8951053683": {
    displayName: "Kuronami (V26)",
    accessoryPrefix: "Kuronami, V26 ",
  },
};

export function getBundleDisplayName(uuid: string, fallback: string): string {
  return BUNDLE_UUID_OVERRIDES[uuid]?.displayName ?? fallback;
}

export function getBundleAccessoryPrefix(uuid: string, defaultPrefix: string): string {
  return BUNDLE_UUID_OVERRIDES[uuid]?.accessoryPrefix ?? defaultPrefix;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function getBundleDate(displayName: string, uuid?: string): string | null {
  // If the bundle has a UUID override, resolve the date against its override name first
  if (uuid) {
    const overrideName = BUNDLE_UUID_OVERRIDES[uuid]?.displayName;
    if (overrideName) {
      if (BUNDLE_DATES[overrideName]) return BUNDLE_DATES[overrideName];
      const t = norm(overrideName);
      for (const [key, date] of Object.entries(BUNDLE_DATES)) {
        if (norm(key) === t) return date;
      }
    }
  }
  if (BUNDLE_DATES[displayName]) return BUNDLE_DATES[displayName];
  const target = norm(displayName);
  for (const [key, date] of Object.entries(BUNDLE_DATES)) {
    if (norm(key) === target) return date;
  }
  return null;
}

export function formatBundleDate(iso: string, short = false): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (short) return date.toLocaleDateString("es-AR", { month: "short", year: "numeric" });
  return date.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}
