"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type {
  ValoAccount,
  AccountSkin,
  AccountAgent,
  AccountBuddy,
  AccountSpray,
  AccountCard,
  AccountTitle,
  AccountFlex,
  ValoApiWeapon,
  ValoApiAgent,
  ValoApiBuddy,
  ValoApiSpray,
  ValoApiCard,
  ValoApiTitle,
  ValoApiContentTier,
  Rarity,
} from "@/types";
import { getSkinVPPrice, isHardcodedExclusive, type VinfoSkin } from "@/lib/skinPrice";
import { getBundleDate, formatBundleDate, getBundleDisplayName, getBundleAccessoryPrefix } from "@/lib/bundle-dates";

const RANKS = [
  "",
  "Unranked",
  "Iron 1","Iron 2","Iron 3",
  "Bronze 1","Bronze 2","Bronze 3",
  "Silver 1","Silver 2","Silver 3",
  "Gold 1","Gold 2","Gold 3",
  "Platinum 1","Platinum 2","Platinum 3",
  "Diamond 1","Diamond 2","Diamond 3",
  "Ascendant 1","Ascendant 2","Ascendant 3",
  "Immortal 1","Immortal 2","Immortal 3",
  "Radiant",
];

const RANK_TIERS = ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Ascendant", "Immortal", "Radiant"] as const;

function romanToInt(s: string): number {
  const vals: Record<string, number> = { I: 1, V: 5, X: 10 };
  let n = 0, prev = 0;
  for (const ch of [...s.toUpperCase()].reverse()) {
    const v = vals[ch] ?? 0;
    n += v < prev ? -v : v;
    prev = v;
  }
  return n;
}

// Returns a numeric sort key: 4-digit year contracts (2026×10+act) always beat 2-digit era ones (25×10+act)
function contractSortKey(displayName: string): number {
  const m = displayName.match(/Season\s+(\d+)\s*\/\/\s*Act\s+([IVX]+)/i);
  if (!m) return 0;
  return parseInt(m[1]) * 10 + romanToInt(m[2]);
}

// "Season 2026 // Act III" → "V26A3"
function getSeasonCode(contractName: string): string {
  const m = contractName.match(/Season\s+(\d+)\s*\/\/\s*Act\s+([IVX]+)/i);
  if (!m) return "";
  return `V${m[1].slice(-2)}A${romanToInt(m[2])}`;
}

// Find the best rank buddy for a tier: prefer matching the current season code, fall back to highest EP#
function findBestRankBuddy(
  tier: string,
  seasonCode: string,
  allBuddies: ValoApiBuddy[]
): AccountBuddy | null {
  const tierRe = new RegExp(`\\b${tier}\\b`, "i");
  const candidates = allBuddies.filter(
    (b) => tierRe.test(b.displayName) && /buddy/i.test(b.displayName)
  );
  if (candidates.length === 0) return null;
  const scored = candidates
    .map((b) => {
      const n = b.displayName.toUpperCase();
      let score = 0;
      if (seasonCode && n.includes(seasonCode.toUpperCase())) score += 10000;
      const epM = n.match(/EP(\d+)/);
      if (epM) score += parseInt(epM[1]);
      return { b, score };
    })
    .sort((a, b) => b.score - a.score);
  const best = scored[0].b;
  return {
    uuid: best.uuid,
    displayName: best.displayName,
    displayIcon: (best.levels?.[0]?.displayIcon ?? best.displayIcon) as string,
  };
}

const REGIONS = ["NA", "LATAM", "EU", "AP", "BR", "KR"];
const CURRENCIES = ["USD", "ARS", "EUR"];
const VALO_API = "https://valorant-api.com/v1";

const DEFAULT_AGENT_NAMES = ["Brimstone", "Jett", "Phoenix", "Sage", "Sova"];


type ContentTierMap = Record<string, { name: Rarity; color: string }>;

interface AddBatch {
  id: string;
  label: string;
  bpCount: number;
  skins: Set<string>;
  buddies: Set<string>;
  sprays: Set<string>;
  cards: Set<string>;
  titles: Set<string>;
  flex: Set<string>;
}

async function fetchContentTiers(): Promise<ContentTierMap> {
  const res = await fetch(`${VALO_API}/contenttiers`);
  const json = await res.json();
  const map: ContentTierMap = {};
  for (const tier of json.data as ValoApiContentTier[]) {
    map[tier.uuid] = {
      name: tier.devName as Rarity,
      color: `#${tier.highlightColor.slice(0, 6)}`,
    };
  }
  return map;
}

type PickerType = "skins" | "agents" | "buddies" | "sprays" | "cards" | "titles" | null;
type PickerMode = "browse" | "bulk";

interface BulkMatch {
  input: string;
  found: boolean;
  label: string;
  icon?: string;
  data?: AccountSkin | AccountAgent | AccountBuddy | AccountSpray | AccountCard | AccountTitle;
}

interface FormState {
  title: string;
  description: string;
  price: string;
  currency: string;
  status: "available" | "sold";
  region: string;
  rank: string;
  featured: boolean;
  skins: AccountSkin[];
  agents: AccountAgent[];
  buddies: AccountBuddy[];
  sprays: AccountSpray[];
  cards: AccountCard[];
  titles: AccountTitle[];
  flex: AccountFlex[];
  battlePassCount: number;
}

function initForm(account?: ValoAccount): FormState {
  return {
    title: account?.title ?? "",
    description: account?.description ?? "",
    price: account?.price.toString() ?? "",
    currency: account?.currency ?? "USD",
    status: account?.status ?? "available",
    region: account?.region ?? "LATAM",
    rank: account?.rank ?? "",
    featured: account?.featured ?? false,
    skins: account?.skins ?? [],
    agents: account?.agents ?? [],
    buddies: account?.buddies ?? [],
    sprays: account?.sprays ?? [],
    cards: account?.cards ?? [],
    titles: account?.titles ?? [],
    flex: account?.flex ?? [],
    battlePassCount: account?.battlePassCount ?? 0,
  };
}

// Generates N realistic completion percentages spread across [15, 100] —
// each value falls in its own equal bucket so they can't all cluster at the same end.
function bpRealisticPercentages(count: number): number[] {
  return Array.from({ length: count }, (_, i) => {
    const lo = 15 + (i / count) * 85;
    const hi = 15 + ((i + 1) / count) * 85;
    return Math.round(lo + Math.random() * (hi - lo));
  }).sort((a, b) => b - a); // highest first
}

export default function AdminAccountForm({ account }: { account?: ValoAccount }) {
  const router = useRouter();
  const isEdit = !!account;
  const [form, setForm] = useState<FormState>(() => initForm(account));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // API data cache
  const [contentTiers, setContentTiers] = useState<ContentTierMap>({});
  const [weapons, setWeapons] = useState<ValoApiWeapon[]>([]);
  const [weaponSkinsData, setWeaponSkinsData] = useState<VinfoSkin[]>([]);
  const [agentsData, setAgentsData] = useState<ValoApiAgent[]>([]);
  const [buddiesData, setBuddiesData] = useState<ValoApiBuddy[]>([]);
  const [spraysData, setSpraysData] = useState<ValoApiSpray[]>([]);
  const [cardsData, setCardsData] = useState<ValoApiCard[]>([]);
  const [titlesData, setTitlesData] = useState<ValoApiTitle[]>([]);

  // Picker UI state
  const [picker, setPicker] = useState<PickerType>(null);
  const [pickerMode, setPickerMode] = useState<PickerMode>("browse");
  const [pickerLoading, setPickerLoading] = useState(false);
  const [selectedWeapon, setSelectedWeapon] = useState<string>("");
  const [pickerSearch, setPickerSearch] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [bulkMatches, setBulkMatches] = useState<BulkMatch[]>([]);
  const [bulkSearched, setBulkSearched] = useState(false);

  // Import state
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Battle pass picker state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [contractsData, setContractsData] = useState<any[]>([]);
  const [showBPPicker, setShowBPPicker] = useState(false);
  const [bpLoading, setBpLoading] = useState(false);
  const [bpSearch, setBpSearch] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedBP, setSelectedBP] = useState<any>(null);
  const [bpProgress, setBpProgress] = useState(100);
  const [bpRandomizeMode, setBpRandomizeMode] = useState(false);
  const [bpSelections, setBpSelections] = useState<{ uuid: string; pct: number }[]>([]);
  const [bpAutoCount, setBpAutoCount] = useState(3);
  // BP auto-suggest: set when a skin added through the picker is detected inside a BP
  const [bpSuggestion, setBpSuggestion] = useState<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contract: any;
    pct: number;
    skinName: string;
  } | null>(null);
  const [bpSuggestionLoading, setBpSuggestionLoading] = useState(false);
  const [addBatches, setAddBatches] = useState<AddBatch[]>([]);
  const seasonBuddyPromiseRef = useRef<Promise<Record<string, AccountBuddy>> | null>(null);

  // Bundle picker state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [bundlesData, setBundlesData] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [themesData, setThemesData] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [flexData, setFlexData] = useState<any[]>([]);
  const [showBundlePicker, setShowBundlePicker] = useState(false);
  const [bundleLoading, setBundleLoading] = useState(false);
  const [bundleSearch, setBundleSearch] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedBundle, setSelectedBundle] = useState<any>(null);
  // "type:uuid" keys for items the user has toggled ON in the detail view
  const [bundleSelection, setBundleSelection] = useState<Set<string>>(new Set());
  // Bundle list filters
  const [bundleVPFilter, setBundleVPFilter] = useState("");
  const [bundleYearFilter, setBundleYearFilter] = useState("");
  const [bundleItemsFilter, setBundleItemsFilter] = useState("");
  const [bundleSortOrder, setBundleSortOrder] = useState<"newest" | "oldest" | "az">("newest");

  const set = (key: keyof FormState, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Auto-load default agents for new accounts
  useEffect(() => {
    if (isEdit) return;
    (async () => {
      try {
        const res = await fetch(`${VALO_API}/agents?isPlayableCharacter=true`);
        const json = await res.json();
        const all: ValoApiAgent[] = json.data;
        setAgentsData(all);
        const defaults = all.filter((a) =>
          DEFAULT_AGENT_NAMES.some(
            (name) => a.displayName.toLowerCase() === name.toLowerCase()
          )
        );
        setForm((f) => ({
          ...f,
          agents: defaults.map((a) => ({
            uuid: a.uuid,
            displayName: a.displayName,
            displayIcon: a.displayIcon,
            fullPortrait: a.fullPortrait,
            role: a.role?.displayName ?? "",
            roleIcon: a.role?.displayIcon,
          })),
        }));
      } catch {
        // silently fail — user can add agents manually
      }
    })();
  }, [isEdit]);

  // Flat skin list across all weapons (for bulk search)
  const allSkins = useMemo(
    () =>
      weapons.flatMap((w) =>
        w.skins
          .filter(
            (s) =>
              s.contentTierUuid &&
              (s.chromas?.[0]?.fullRender || s.levels?.[0]?.displayIcon)
          )
          .map((s) => ({ skin: s, weapon: w }))
      ),
    [weapons]
  );

  // ─── ValoInventory Import ────────────────────────────────────────────────────
  async function handleImport() {
    if (!importUrl.trim()) return;
    setImporting(true);
    setImportResult(null);

    try {
      // 1. Fetch via proxy (avoids CORS)
      const res = await fetch(
        `/api/import/valoinventory?token=${encodeURIComponent(importUrl.trim())}`
      );
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Error al importar");

      const { account: src } = json;

      // 2. Load weapons + content tiers + VP prices if needed (for skin resolution)
      let weaponsList = weapons;
      let tiersMap = contentTiers;
      let vpSkinsLocal = weaponSkinsData;

      if (src.skins?.length > 0) {
        const [fetchedTiers, newWeapons, vpSkins] = await Promise.all([
          Object.keys(tiersMap).length > 0 ? Promise.resolve(tiersMap) : fetchContentTiers(),
          weaponsList.length > 0
            ? Promise.resolve(weaponsList)
            : fetch(`${VALO_API}/weapons`).then((r) => r.json()).then((r) => r.data as ValoApiWeapon[]),
          vpSkinsLocal.length > 0
            ? Promise.resolve(vpSkinsLocal)
            : fetch("https://vinfo-api.com/json/weaponSkins").then((r) => r.json()).catch(() => [] as VinfoSkin[]),
        ]);
        tiersMap = fetchedTiers;
        weaponsList = newWeapons;
        vpSkinsLocal = vpSkins;
        setContentTiers(tiersMap);
        setWeapons(weaponsList);
        setWeaponSkinsData(vpSkinsLocal);
        if (weaponsList.length > 0 && !selectedWeapon) {
          setSelectedWeapon(weaponsList[0].uuid);
        }
      }

      // 3. Build skin level UUID → skin data map
      const skinLevelMap = new Map<
        string,
        { weaponName: string; displayName: string; displayIcon: string; rarity: Rarity; rarityColor: string; vpCost?: number }
      >();
      for (const weapon of weaponsList) {
        for (const skin of weapon.skins) {
          if (!skin.contentTierUuid) continue;
          const icon =
            skin.chromas?.[0]?.fullRender ??
            skin.levels?.[0]?.displayIcon ??
            null;
          if (!icon) continue;
          const tier = tiersMap[skin.contentTierUuid];
          const vpCost = getSkinVPPrice(skin.displayName, vpSkinsLocal) ?? undefined;
          for (const level of skin.levels ?? []) {
            skinLevelMap.set(level.uuid, {
              weaponName: weapon.displayName,
              displayName: skin.displayName,
              displayIcon: icon,
              rarity: tier?.name ?? "Select",
              rarityColor: tier?.color ?? "#5b87c4",
              vpCost,
            });
          }
        }
      }

      // 4. Resolve skins — deduplicate by displayName since the inventory stores
      //    every unlocked level of a skin as a separate entry (level 1, 2, 3…)
      const resolvedSkins: AccountSkin[] = [];
      const seenSkinNames = new Set<string>();
      for (const s of src.skins ?? []) {
        const id: string = s.ItemID ?? s.itemID ?? s.uuid ?? "";
        const data = skinLevelMap.get(id);
        if (data && !seenSkinNames.has(data.displayName)) {
          seenSkinNames.add(data.displayName);
          resolvedSkins.push({ uuid: id, ...data });
        }
      }

      // 5. Map enriched items (ItemID is already the UUID)
      const resolvedBuddies: AccountBuddy[] = (src.buddies ?? [])
        .filter((b: Record<string, string>) => b.ItemID && b.displayIcon)
        .map((b: Record<string, string>) => ({
          uuid: b.ItemID,
          displayName: b.displayName ?? "Unknown Buddy",
          displayIcon: b.displayIcon,
        }));

      const resolvedCards: AccountCard[] = (src.cards ?? [])
        .filter((c: Record<string, string>) => c.ItemID)
        .map((c: Record<string, string>) => ({
          uuid: c.ItemID,
          displayName: c.displayName ?? "Unknown Card",
          smallArt: c.smallArt ?? "",
          wideArt: c.wideArt,
          largeArt: c.largeArt,
        }));

      const resolvedSprays: AccountSpray[] = (src.sprays ?? [])
        .filter((s: Record<string, string>) => s.ItemID && s.displayIcon)
        .map((s: Record<string, string>) => ({
          uuid: s.ItemID,
          displayName: s.displayName ?? "Unknown Spray",
          displayIcon: s.displayIcon,
        }));

      const resolvedTitles: AccountTitle[] = (src.titles ?? [])
        .filter((t: Record<string, string>) => t.ItemID)
        .map((t: Record<string, string>) => ({
          uuid: t.ItemID,
          displayName: t.displayName ?? "Unknown Title",
          titleText: t.titleText ?? "",
        }));

      // Agents: keep the 5 default base agents + add imported ones
      const currentDefaults = form.agents.filter((a) =>
        DEFAULT_AGENT_NAMES.some(
          (name) => a.displayName.toLowerCase() === name.toLowerCase()
        )
      );
      const importedAgents: AccountAgent[] = (src.agents ?? [])
        .filter((a: Record<string, string>) => a.ItemID && a.displayIcon)
        .map((a: Record<string, string>) => ({
          uuid: a.ItemID,
          displayName: a.displayName ?? "Unknown Agent",
          displayIcon: a.displayIcon,
          fullPortrait: a.fullPortrait,
          role: a.role ?? "",
        }));
      // Merge: defaults first, then imported non-defaults
      const defaultUuids = new Set(currentDefaults.map((a) => a.uuid));
      const mergedAgents: AccountAgent[] = [
        ...currentDefaults,
        ...importedAgents.filter((a) => !defaultUuids.has(a.uuid)),
      ];

      // 6. Pre-populate title from account nickname if form is empty
      const newTitle =
        !form.title && src.nickname ? src.nickname : form.title;

      setForm((f) => ({
        ...f,
        title: newTitle,
        skins: resolvedSkins,
        buddies: resolvedBuddies,
        cards: resolvedCards,
        sprays: resolvedSprays,
        titles: resolvedTitles,
        agents: mergedAgents,
      }));

      setImportResult({
        ok: true,
        msg: `Importado: ${resolvedSkins.length} skins · ${mergedAgents.length} agentes · ${resolvedBuddies.length} buddies · ${resolvedSprays.length} sprays · ${resolvedCards.length} cards · ${resolvedTitles.length} títulos`,
      });
    } catch (err) {
      setImportResult({
        ok: false,
        msg: err instanceof Error ? err.message : "Error inesperado",
      });
    } finally {
      setImporting(false);
    }
  }

  // ─── Battle Pass picker ──────────────────────────────────────────────────────
  async function openBPPicker() {
    setShowBPPicker(true);
    setBpSearch("");
    const needWeapons = weapons.length === 0;
    const needContracts = contractsData.length === 0;
    const needBuddies = buddiesData.length === 0;
    const needSprays = spraysData.length === 0;
    const needCards = cardsData.length === 0;
    const needTitles = titlesData.length === 0;
    if (!needWeapons && !needContracts && !needBuddies && !needSprays && !needCards && !needTitles) return;
    setBpLoading(true);
    try {
      const [newWeapons, tiersMap, vpSkins, contracts, newBuddies, newSprays, newCards, newTitles] = await Promise.all([
        needWeapons
          ? fetch(`${VALO_API}/weapons`).then((r) => r.json()).then((r) => r.data as ValoApiWeapon[])
          : Promise.resolve(weapons),
        Object.keys(contentTiers).length > 0 ? Promise.resolve(contentTiers) : fetchContentTiers(),
        weaponSkinsData.length > 0
          ? Promise.resolve(weaponSkinsData)
          : fetch("https://vinfo-api.com/json/weaponSkins").then((r) => r.json()).catch(() => [] as VinfoSkin[]),
        needContracts
          ? fetch(`${VALO_API}/contracts`).then((r) => r.json()).then((r) =>
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (r.data as any[]).filter((c) => c.content?.relationType === "Season")
            )
          : Promise.resolve(contractsData),
        needBuddies
          ? fetch(`${VALO_API}/buddies`).then((r) => r.json()).then((r) => r.data as ValoApiBuddy[])
          : Promise.resolve(buddiesData),
        needSprays
          ? fetch(`${VALO_API}/sprays`).then((r) => r.json()).then((r) => r.data as ValoApiSpray[])
          : Promise.resolve(spraysData),
        needCards
          ? fetch(`${VALO_API}/playercards`).then((r) => r.json()).then((r) => r.data as ValoApiCard[])
          : Promise.resolve(cardsData),
        needTitles
          ? fetch(`${VALO_API}/playertitles`).then((r) => r.json()).then((r) => r.data as ValoApiTitle[])
          : Promise.resolve(titlesData),
      ]);
      if (needWeapons) { setWeapons(newWeapons); setSelectedWeapon(newWeapons[0]?.uuid ?? ""); }
      setContentTiers(tiersMap);
      if (weaponSkinsData.length === 0 && vpSkins.length > 0) setWeaponSkinsData(vpSkins);
      if (needContracts) setContractsData(contracts);
      if (needBuddies) setBuddiesData(newBuddies);
      if (needSprays) setSpraysData(newSprays);
      if (needCards) setCardsData(newCards);
      if (needTitles) setTitlesData(newTitles);
    } finally {
      setBpLoading(false);
    }
  }

  // ─── Bundle picker ────────────────────────────────────────────────────────────
  async function openBundlePicker() {
    setShowBundlePicker(true);
    setBundleSearch("");
    setSelectedBundle(null);
    const needWeapons = weapons.length === 0;
    const needBundles = bundlesData.length === 0;
    const needThemes = themesData.length === 0;
    const needBuddies = buddiesData.length === 0;
    const needSprays = spraysData.length === 0;
    const needCards = cardsData.length === 0;
    const needTitles = titlesData.length === 0;
    const needFlex = flexData.length === 0;
    if (!needWeapons && !needBundles && !needThemes && !needBuddies && !needSprays && !needCards && !needTitles && !needFlex) return;
    setBundleLoading(true);
    try {
      const [newWeapons, tiersMap, vpSkins, rawBundles, newThemes, newBuddies, newSprays, newCards, newTitles, newFlex] = await Promise.all([
        needWeapons
          ? fetch(`${VALO_API}/weapons`).then((r) => r.json()).then((r) => r.data as ValoApiWeapon[])
          : Promise.resolve(weapons),
        Object.keys(contentTiers).length > 0 ? Promise.resolve(contentTiers) : fetchContentTiers(),
        weaponSkinsData.length > 0
          ? Promise.resolve(weaponSkinsData)
          : fetch("https://vinfo-api.com/json/weaponSkins").then((r) => r.json()).catch(() => [] as VinfoSkin[]),
        needBundles
          ? fetch(`${VALO_API}/bundles`).then((r) => r.json()).then((r) => r.data as any[])
          : Promise.resolve(bundlesData),
        needThemes
          ? fetch(`${VALO_API}/themes`).then((r) => r.json()).then((r) => r.data as any[])
          : Promise.resolve(themesData),
        needBuddies
          ? fetch(`${VALO_API}/buddies`).then((r) => r.json()).then((r) => r.data as ValoApiBuddy[])
          : Promise.resolve(buddiesData),
        needSprays
          ? fetch(`${VALO_API}/sprays`).then((r) => r.json()).then((r) => r.data as ValoApiSpray[])
          : Promise.resolve(spraysData),
        needCards
          ? fetch(`${VALO_API}/playercards`).then((r) => r.json()).then((r) => r.data as ValoApiCard[])
          : Promise.resolve(cardsData),
        needTitles
          ? fetch(`${VALO_API}/playertitles`).then((r) => r.json()).then((r) => r.data as ValoApiTitle[])
          : Promise.resolve(titlesData),
        needFlex
          ? fetch(`${VALO_API}/flex`).then((r) => r.json()).then((r) => r.data as any[])
          : Promise.resolve(flexData),
      ]);
      if (needWeapons) { setWeapons(newWeapons); setSelectedWeapon(newWeapons[0]?.uuid ?? ""); }
      setContentTiers(tiersMap);
      if (weaponSkinsData.length === 0 && vpSkins.length > 0) setWeaponSkinsData(vpSkins);
      if (needThemes) setThemesData(newThemes);
      if (needBuddies) setBuddiesData(newBuddies);
      if (needSprays) setSpraysData(newSprays);
      if (needCards) setCardsData(newCards);
      if (needTitles) setTitlesData(newTitles);
      if (needFlex) setFlexData(newFlex);
      if (needBundles) {
        // Keep only full bundles (no CAPSULE/GUN BUDDY partial variants).
        // Re-releases (Kuronami V26, Singularity EP9) have the same displayName
        // as originals but different UUIDs and displayNameSubText === null,
        // so filtering by subtext naturally keeps all full bundles separately.
        const full = (rawBundles as any[]).filter((b) => b.displayNameSubText == null);
        // Dedup by UUID in case the API ever returns the same bundle twice
        const byUuid = new Map<string, any>();
        for (const b of full) byUuid.set(b.uuid, b);
        setBundlesData([...byUuid.values()]);
      }
    } finally {
      setBundleLoading(false);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getBundleThemeUuid(bundle: any): string | null {
    const name = (bundle.displayName as string).toLowerCase();
    const candidates = themesData.filter((t) => (t.displayName as string).toLowerCase() === name);
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0].uuid as string;
    // Multiple themes with same name (re-releases): match by longest assetPath token
    const bundlePath: string = bundle.assetPath ?? "";
    const ranked = candidates
      .map((t) => {
        const m = (t.assetPath as string).match(/Theme_([A-Za-z0-9]+)_/);
        return { uuid: t.uuid as string, token: m?.[1] ?? "" };
      })
      .filter((x) => x.token)
      .sort((a, b) => b.token.length - a.token.length);
    for (const { uuid, token } of ranked) {
      if (bundlePath.includes(token)) return uuid;
    }
    return candidates[0].uuid as string;
  }

  function getBundleItems(bundle: any) {
    const name = (bundle.displayName as string).replace(/\s+CAPSULE$/i, "").trim();
    const prefix = name + " ";
    const themeUuid = getBundleThemeUuid(bundle);

    const skins: AccountSkin[] = [];
    const seenSkins = new Set<string>();
    for (const weapon of weapons) {
      for (const skin of weapon.skins) {
        if (!skin.contentTierUuid) continue;
        // Prefer themeUuid match (exact per-bundle) over displayName prefix (catches all re-releases)
        const matchesSkin = themeUuid
          ? (skin as any).themeUuid === themeUuid
          : skin.displayName.startsWith(prefix);
        if (!matchesSkin) continue;
        if (seenSkins.has(skin.displayName)) continue;
        seenSkins.add(skin.displayName);
        const icon = skin.chromas?.[0]?.fullRender ?? skin.levels?.[0]?.displayIcon ?? null;
        if (!icon) continue;
        const tier = contentTiers[skin.contentTierUuid];
        const chromas = (skin.chromas ?? [])
          .filter((c) => c.swatch)
          .map((c) => ({ uuid: c.uuid, swatch: c.swatch as string }));
        skins.push({
          uuid: skin.uuid,
          weaponName: weapon.displayName,
          displayName: skin.displayName,
          displayIcon: icon,
          rarity: tier?.name ?? "Select",
          rarityColor: tier?.color ?? "#5b87c4",
          vpCost: getSkinVPPrice(skin.displayName, weaponSkinsData) ?? undefined,
          chromas: chromas.length > 0 ? chromas : undefined,
        });
      }
    }

    // Re-releases use "BundleName, V26 " naming for accessories — use UUID override if available
    const accessoryPrefix = getBundleAccessoryPrefix(bundle.uuid, prefix);

    const buddies: AccountBuddy[] = buddiesData
      .filter((b) => b.displayName.startsWith(accessoryPrefix))
      .map((b) => ({ uuid: b.uuid, displayName: b.displayName, displayIcon: b.displayIcon }));

    const sprays: AccountSpray[] = spraysData
      .filter((s) => s.displayName.startsWith(accessoryPrefix))
      .map((s) => ({ uuid: s.uuid, displayName: s.displayName, displayIcon: s.displayIcon, animationGif: s.animationGif }));

    const cards: AccountCard[] = cardsData
      .filter((c) => c.displayName.startsWith(accessoryPrefix))
      .map((c) => ({ uuid: c.uuid, displayName: c.displayName, smallArt: c.smallArt, wideArt: c.wideArt, largeArt: c.largeArt }));

    const flex: AccountFlex[] = flexData
      .filter((f: any) => f.displayName.startsWith(accessoryPrefix))
      .map((f: any) => ({ uuid: f.uuid, displayName: f.displayName, displayIcon: f.displayIcon }));

    const titles: AccountTitle[] = titlesData
      .filter((t) => t.displayName?.startsWith(accessoryPrefix))
      .map((t) => ({ uuid: t.uuid, displayName: t.displayName, titleText: t.titleText }));

    return { skins, buddies, sprays, cards, flex, titles };
  }

  function pushBatch(label: string, bpCount: number, added: { skins: AccountSkin[]; buddies: AccountBuddy[]; sprays: AccountSpray[]; cards: AccountCard[]; titles: AccountTitle[]; flex: AccountFlex[] }) {
    const batch: AddBatch = {
      id: `${Date.now()}-${Math.random()}`,
      label,
      bpCount,
      skins: new Set(added.skins.map((s) => s.displayName)),
      buddies: new Set(added.buddies.map((b) => b.displayName)),
      sprays: new Set(added.sprays.map((s) => s.displayName)),
      cards: new Set(added.cards.map((c) => c.displayName)),
      titles: new Set(added.titles.map((t) => t.displayName)),
      flex: new Set(added.flex.map((f) => f.displayName)),
    };
    const total = batch.skins.size + batch.buddies.size + batch.sprays.size + batch.cards.size + batch.titles.size + batch.flex.size;
    if (total === 0 && bpCount === 0) return;
    if (bpCount > 0) setForm((f) => ({ ...f, battlePassCount: (f.battlePassCount ?? 0) + bpCount }));
    setAddBatches((prev) => [...prev.slice(-9), batch]);
  }

  function undoBatch(id: string) {
    const batch = addBatches.find((b) => b.id === id);
    if (!batch) return;
    setForm((f) => ({
      ...f,
      battlePassCount: Math.max(0, (f.battlePassCount ?? 0) - batch.bpCount),
      skins: f.skins.filter((s) => !batch.skins.has(s.displayName)),
      buddies: f.buddies.filter((b) => !batch.buddies.has(b.displayName)),
      sprays: f.sprays.filter((s) => !batch.sprays.has(s.displayName)),
      cards: f.cards.filter((c) => !batch.cards.has(c.displayName)),
      titles: f.titles.filter((t) => !batch.titles.has(t.displayName)),
      flex: f.flex.filter((fl) => !batch.flex.has(fl.displayName)),
    }));
    setAddBatches((prev) => prev.filter((b) => b.id !== id));
  }

  function confirmAddBundle() {
    if (!selectedBundle) return;
    const { skins, buddies, sprays, cards, flex, titles } = getBundleItems(selectedBundle);
    const existingSkinNames = new Set(form.skins.map((s) => s.displayName));
    const existingBuddyNames = new Set(form.buddies.map((b) => b.displayName));
    const existingSprayNames = new Set(form.sprays.map((s) => s.displayName));
    const existingCardNames = new Set(form.cards.map((c) => c.displayName));
    const existingFlexNames = new Set(form.flex.map((f) => f.displayName));
    const existingTitleNames = new Set(form.titles.map((t) => t.displayName));
    const newSkins = skins.filter((s) => bundleSelection.has(`skin:${s.uuid}`) && !existingSkinNames.has(s.displayName));
    const newBuddies = buddies.filter((b) => bundleSelection.has(`buddy:${b.uuid}`) && !existingBuddyNames.has(b.displayName));
    const newSprays = sprays.filter((s) => bundleSelection.has(`spray:${s.uuid}`) && !existingSprayNames.has(s.displayName));
    const newCards = cards.filter((c) => bundleSelection.has(`card:${c.uuid}`) && !existingCardNames.has(c.displayName));
    const newFlex = flex.filter((f) => bundleSelection.has(`flex:${f.uuid}`) && !existingFlexNames.has(f.displayName));
    const newTitles = titles.filter((t) => bundleSelection.has(`title:${t.uuid}`) && !existingTitleNames.has(t.displayName));
    setForm((f) => ({
      ...f,
      skins: newSkins.length > 0 ? [...f.skins, ...newSkins] : f.skins,
      buddies: newBuddies.length > 0 ? [...f.buddies, ...newBuddies] : f.buddies,
      sprays: newSprays.length > 0 ? [...f.sprays, ...newSprays] : f.sprays,
      cards: newCards.length > 0 ? [...f.cards, ...newCards] : f.cards,
      flex: newFlex.length > 0 ? [...f.flex, ...newFlex] : f.flex,
      titles: newTitles.length > 0 ? [...f.titles, ...newTitles] : f.titles,
    }));
    pushBatch(getBundleDisplayName(selectedBundle.uuid, selectedBundle.displayName), 0, {
      skins: newSkins, buddies: newBuddies, sprays: newSprays, cards: newCards, titles: newTitles, flex: newFlex,
    });
    setShowBundlePicker(false);
    setSelectedBundle(null);
    setBundleSelection(new Set());
  }

  // Build level-UUID → skin-data map from loaded weapons (shared by BP functions)
  function buildLevelMap() {
    const map = new Map<string, Omit<AccountSkin, "uuid">>();
    for (const weapon of weapons) {
      for (const skin of weapon.skins) {
        if (!skin.contentTierUuid) continue;
        const icon = skin.chromas?.[0]?.fullRender ?? skin.levels?.[0]?.displayIcon ?? null;
        if (!icon) continue;
        const tier = contentTiers[skin.contentTierUuid];
        const vpCost = getSkinVPPrice(skin.displayName, weaponSkinsData) ?? undefined;
        const chromas = (skin.chromas ?? [])
          .filter((c: any) => c.swatch)
          .map((c: any) => ({ uuid: c.uuid, swatch: c.swatch as string, streamedVideo: (c.streamedVideo as string) || undefined }));
        for (const level of skin.levels ?? []) {
          map.set(level.uuid, {
            weaponName: weapon.displayName,
            displayName: skin.displayName,
            displayIcon: icon,
            rarity: tier?.name ?? "Select",
            rarityColor: tier?.color ?? "#5b87c4",
            vpCost,
            chromas: chromas.length > 0 ? chromas : undefined,
          });
        }
      }
    }
    return map;
  }

  // Extract ALL cosmetic items from a contract up to a given progress % (0-100).
  // Accepts optional data overrides so callers can pass freshly-fetched arrays
  // before React has flushed the corresponding setState calls.
  function getAllItemsFromBP(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contract: any,
    progress: number,
    overrides?: {
      buddies?: ValoApiBuddy[];
      sprays?: ValoApiSpray[];
      cards?: ValoApiCard[];
      titles?: ValoApiTitle[];
    }
  ): { skins: AccountSkin[]; buddies: AccountBuddy[]; sprays: AccountSpray[]; cards: AccountCard[]; titles: AccountTitle[] } {
    const levelMap = buildLevelMap();
    const buddySource = overrides?.buddies ?? buddiesData;
    const spraySource = overrides?.sprays ?? spraysData;
    const cardSource = overrides?.cards ?? cardsData;
    const titleSource = overrides?.titles ?? titlesData;

    // Build buddy level-UUID map from whichever source we're using
    const buddyLevelMap = new Map<string, AccountBuddy>();
    for (const buddy of buddySource) {
      const icon = (buddy.levels?.[0]?.displayIcon ?? buddy.displayIcon) as string;
      for (const level of buddy.levels ?? []) {
        buddyLevelMap.set(level.uuid, { uuid: buddy.uuid, displayName: buddy.displayName, displayIcon: icon });
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chapters: any[] = contract.content?.chapters ?? [];
    const totalLevels = chapters.reduce((s: number, ch: { levels?: unknown[] }) => s + (ch.levels?.length ?? 0), 0);
    const target = Math.round((progress / 100) * totalLevels);

    const skins: AccountSkin[] = [];
    const buddies: AccountBuddy[] = [];
    const sprays: AccountSpray[] = [];
    const cards: AccountCard[] = [];
    const titles: AccountTitle[] = [];
    const seenSkins = new Set<string>();
    const seenBuddies = new Set<string>();
    const seenSprays = new Set<string>();
    const seenCards = new Set<string>();
    const seenTitles = new Set<string>();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function addReward(r: { type: string; uuid: string } | undefined | null) {
      if (!r) return;
      if (r.type === "EquippableSkinLevel") {
        const d = levelMap.get(r.uuid);
        if (d && !seenSkins.has(d.displayName)) { seenSkins.add(d.displayName); skins.push({ uuid: r.uuid, ...d }); }
      } else if (r.type === "EquippableCharmLevel" || r.type === "EquippableCharm") {
        // Try level UUID first; fall back to root buddy UUID
        const b = buddyLevelMap.get(r.uuid) ?? (() => {
          const root = buddySource.find((x) => x.uuid === r.uuid);
          if (!root) return undefined;
          const icon = (root.levels?.[0]?.displayIcon ?? root.displayIcon) as string;
          return { uuid: root.uuid, displayName: root.displayName, displayIcon: icon };
        })();
        if (b && !seenBuddies.has(b.uuid)) { seenBuddies.add(b.uuid); buddies.push(b); }
      } else if (r.type === "Spray" || r.type === "SprayLevel") {
        const s = spraySource.find((x) => x.uuid === r.uuid);
        if (s && !seenSprays.has(s.uuid)) { seenSprays.add(s.uuid); sprays.push({ uuid: s.uuid, displayName: s.displayName, displayIcon: s.displayIcon, animationGif: s.animationGif }); }
      } else if (r.type === "PlayerCard") {
        const c = cardSource.find((x) => x.uuid === r.uuid);
        if (c && !seenCards.has(c.uuid)) { seenCards.add(c.uuid); cards.push({ uuid: c.uuid, displayName: c.displayName, smallArt: c.smallArt, wideArt: c.wideArt, largeArt: c.largeArt }); }
      } else if (r.type === "Title") {
        const t = titleSource.find((x) => x.uuid === r.uuid);
        if (t?.displayName && !seenTitles.has(t.uuid)) { seenTitles.add(t.uuid); titles.push({ uuid: t.uuid, displayName: t.displayName, titleText: t.titleText }); }
      }
    }

    let done = 0;
    for (const chapter of chapters) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chLevels: any[] = chapter.levels ?? [];
      const take = Math.min(chLevels.length, target - done);
      for (let i = 0; i < take; i++) addReward(chLevels[i].reward);
      if (take > 0) for (const fr of chapter.freeRewards ?? []) addReward(fr);
      done += take;
      if (done >= target) break;
    }
    return { skins, buddies, sprays, cards, titles };
  }

  // Check if a skin level UUID belongs to any BP contract and suggest adding all preceding items.
  // Fetches contracts on-demand (once) if not already loaded.
  async function detectBPSkin(levelUuid: string, skinName: string) {
    let contracts = contractsData;
    if (contracts.length === 0) {
      try {
        const res = await fetch(`${VALO_API}/contracts`);
        const json = await res.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        contracts = (json.data as any[]).filter((c) => c.content?.relationType === "Season");
        setContractsData(contracts);
      } catch {
        return;
      }
    }
    for (const contract of contracts) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chapters: any[] = contract.content?.chapters ?? [];
      const flatRewards: { type: string; uuid: string }[] = [];
      for (const ch of chapters) for (const lv of ch.levels ?? []) if (lv.reward) flatRewards.push(lv.reward);
      const idx = flatRewards.findIndex((r) => r.type === "EquippableSkinLevel" && r.uuid === levelUuid);
      if (idx < 0) continue;
      const pct = Math.round(((idx + 1) / flatRewards.length) * 100);
      setBpSuggestion({ contract, pct, skinName });
      return;
    }
    setBpSuggestion(null);
  }

  // Confirm the BP suggestion: fetch missing accessories then add items up to `pct` (or 100 for full pass)
  async function confirmBPSuggestion(mode: "partial" | "full") {
    if (!bpSuggestion) return;
    setBpSuggestionLoading(true);
    try {
      const [newBuddies, newSprays, newCards, newTitles] = await Promise.all([
        buddiesData.length > 0 ? Promise.resolve(buddiesData) : fetch(`${VALO_API}/buddies`).then((r) => r.json()).then((r) => r.data as ValoApiBuddy[]),
        spraysData.length > 0 ? Promise.resolve(spraysData) : fetch(`${VALO_API}/sprays`).then((r) => r.json()).then((r) => r.data as ValoApiSpray[]),
        cardsData.length > 0 ? Promise.resolve(cardsData) : fetch(`${VALO_API}/playercards`).then((r) => r.json()).then((r) => r.data as ValoApiCard[]),
        titlesData.length > 0 ? Promise.resolve(titlesData) : fetch(`${VALO_API}/playertitles`).then((r) => r.json()).then((r) => r.data as ValoApiTitle[]),
      ]);
      if (buddiesData.length === 0) setBuddiesData(newBuddies);
      if (spraysData.length === 0) setSpraysData(newSprays);
      if (cardsData.length === 0) setCardsData(newCards);
      if (titlesData.length === 0) setTitlesData(newTitles);

      const { contract, pct } = bpSuggestion;
      const effectivePct = mode === "full" ? 100 : pct;
      const { skins: bpSkins, buddies: bpBuddies, sprays: bpSprays, cards: bpCards, titles: bpTitles } = getAllItemsFromBP(
        contract, effectivePct, { buddies: newBuddies, sprays: newSprays, cards: newCards, titles: newTitles }
      );
      const exSkins = new Set(form.skins.map((s) => s.displayName));
      const exBuddies = new Set(form.buddies.map((b) => b.displayName));
      const exSprays = new Set(form.sprays.map((s) => s.displayName));
      const exCards = new Set(form.cards.map((c) => c.displayName));
      const exTitles = new Set(form.titles.map((t) => t.displayName));
      const addSkins = bpSkins.filter((s) => !exSkins.has(s.displayName));
      const addBuddies = bpBuddies.filter((b) => !exBuddies.has(b.displayName));
      const addSprays = bpSprays.filter((s) => !exSprays.has(s.displayName));
      const addCards = bpCards.filter((c) => !exCards.has(c.displayName));
      const addTitles = bpTitles.filter((t) => !exTitles.has(t.displayName));
      setForm((f) => ({
        ...f,
        skins: addSkins.length > 0 ? [...f.skins, ...addSkins] : f.skins,
        buddies: addBuddies.length > 0 ? [...f.buddies, ...addBuddies] : f.buddies,
        sprays: addSprays.length > 0 ? [...f.sprays, ...addSprays] : f.sprays,
        cards: addCards.length > 0 ? [...f.cards, ...addCards] : f.cards,
        titles: addTitles.length > 0 ? [...f.titles, ...addTitles] : f.titles,
      }));
      const bpName = (contract.displayName as string).replace(/^Battlepass\s*\/\/\s*/i, "");
      pushBatch(`${bpName} (~${effectivePct}%)`, 1, {
        skins: addSkins, buddies: addBuddies, sprays: addSprays, cards: addCards, titles: addTitles, flex: [],
      });
      setBpSuggestion(null);
    } finally {
      setBpSuggestionLoading(false);
    }
  }

  function loadSeasonBuddies(): Promise<Record<string, AccountBuddy>> {
    if (!seasonBuddyPromiseRef.current) {
      seasonBuddyPromiseRef.current = (async (): Promise<Record<string, AccountBuddy>> => {
        try {
          const [contractsJson, buddiesJson] = await Promise.all([
            fetch(`${VALO_API}/contracts`).then((r) => r.json()),
            buddiesData.length > 0
              ? Promise.resolve({ data: buddiesData })
              : fetch(`${VALO_API}/buddies`).then((r) => r.json()),
          ]);
          const allBuddies: ValoApiBuddy[] = buddiesJson.data;
          if (buddiesData.length === 0) setBuddiesData(allBuddies);

          const buddyLevelMap = new Map<string, AccountBuddy>();
          const buddyRootMap = new Map<string, AccountBuddy>();
          for (const buddy of allBuddies) {
            const icon = (buddy.levels?.[0]?.displayIcon ?? buddy.displayIcon) as string;
            const b: AccountBuddy = { uuid: buddy.uuid, displayName: buddy.displayName, displayIcon: icon };
            buddyRootMap.set(buddy.uuid, b);
            for (const lv of buddy.levels ?? []) buddyLevelMap.set(lv.uuid, b);
          }

          // All Season contracts, newest first by numeric year+act (avoids "Season 25" beating "Season 2026")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const allSeasonContracts: any[] = (contractsJson.data as any[])
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((c: any) => c.content?.relationType === "Season")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .sort((a: any, b: any) => contractSortKey(b.displayName) - contractSortKey(a.displayName));

          console.log("[rank-buddy] All Season contracts:", allSeasonContracts.map((c) => c.displayName));

          // Competitive rank contract = Season contract whose name does NOT contain "battlepass"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rankContracts = allSeasonContracts.filter((c: any) =>
            !(c.displayName as string).toLowerCase().includes("battlepass")
          );

          console.log("[rank-buddy] Rank contracts:", rankContracts.map((c: any) => c.displayName));

          if (rankContracts.length === 0) return {};

          // Derive the season code (e.g. "V26A3") from the latest contract
          const seasonCode = getSeasonCode(rankContracts[0].displayName);
          console.log("[rank-buddy] Season:", rankContracts[0].displayName, "→", seasonCode);

          // Build the map by searching buddy displayNames directly.
          // Each tier buddy is named like "EP8: RADIANT BUDDY" or "V26A3: RADIANT BUDDY".
          // Prefer the current season code match; fall back to the highest EP number.
          const map: Record<string, AccountBuddy> = {};
          for (const tier of RANK_TIERS) {
            const b = findBestRankBuddy(tier, seasonCode, allBuddies);
            if (b) map[tier] = b;
          }

          console.log("[rank-buddy] Final map:", Object.entries(map).map(([k, v]) => `${k}: ${v.displayName}`));
          return map;
        } catch (e) {
          console.error("[rank-buddy] Error loading season buddies:", e);
          seasonBuddyPromiseRef.current = null;
          return {};
        }
      })();
    }
    return seasonBuddyPromiseRef.current;
  }

  async function handleRankChange(newRank: string) {
    setForm((f) => ({ ...f, rank: newRank }));
    if (!newRank || newRank === "Unranked") return;
    const tier = newRank.split(" ")[0];
    if (!(RANK_TIERS as readonly string[]).includes(tier)) return;
    const map = await loadSeasonBuddies();
    const newBuddy = map[tier];
    if (!newBuddy) return;
    setForm((f) => {
      const rankUuids = new Set(Object.values(map).map((b) => b.uuid));
      const filtered = f.buddies.filter((b) => !rankUuids.has(b.uuid));
      return { ...f, buddies: [...filtered, newBuddy] };
    });
  }

  function confirmAddBPWithProgress() {
    if (!selectedBP) return;
    const { skins: bpSkins, buddies: bpBuddies, sprays: bpSprays, cards: bpCards, titles: bpTitles } = getAllItemsFromBP(selectedBP, bpProgress);
    const exSkins = new Set(form.skins.map((s) => s.displayName));
    const exBuddies = new Set(form.buddies.map((b) => b.displayName));
    const exSprays = new Set(form.sprays.map((s) => s.displayName));
    const exCards = new Set(form.cards.map((c) => c.displayName));
    const exTitles = new Set(form.titles.map((t) => t.displayName));
    const newSkins = bpSkins.filter((s) => !exSkins.has(s.displayName));
    const newBuddies = bpBuddies.filter((b) => !exBuddies.has(b.displayName));
    const newSprays = bpSprays.filter((s) => !exSprays.has(s.displayName));
    const newCards = bpCards.filter((c) => !exCards.has(c.displayName));
    const newTitles = bpTitles.filter((t) => !exTitles.has(t.displayName));
    setForm((f) => ({
      ...f,
      skins: newSkins.length > 0 ? [...f.skins, ...newSkins] : f.skins,
      buddies: newBuddies.length > 0 ? [...f.buddies, ...newBuddies] : f.buddies,
      sprays: newSprays.length > 0 ? [...f.sprays, ...newSprays] : f.sprays,
      cards: newCards.length > 0 ? [...f.cards, ...newCards] : f.cards,
      titles: newTitles.length > 0 ? [...f.titles, ...newTitles] : f.titles,
    }));
    const bpName = (selectedBP.displayName as string).replace(/^Battlepass\s*\/\/\s*/i, "");
    pushBatch(`${bpName} (~${bpProgress}%)`, 1, {
      skins: newSkins, buddies: newBuddies, sprays: newSprays, cards: newCards, titles: newTitles, flex: [],
    });
    setSelectedBP(null);
    setShowBPPicker(false);
  }

  function toggleBPSelection(uuid: string) {
    setBpSelections((prev) => {
      if (prev.some((s) => s.uuid === uuid))
        return prev.filter((s) => s.uuid !== uuid);
      return [...prev, { uuid, pct: Math.round(15 + Math.random() * 85) }];
    });
  }

  function setBPPct(uuid: string, pct: number) {
    setBpSelections((prev) =>
      prev.map((s) => s.uuid === uuid ? { ...s, pct: Math.max(0, Math.min(100, pct)) } : s)
    );
  }

  function autoSelectBPs() {
    const n = Math.max(1, Math.min(bpAutoCount, contractsData.length));
    const shuffled = [...contractsData].sort(() => Math.random() - 0.5).slice(0, n);
    const pcts = bpRealisticPercentages(n);
    setBpSelections(shuffled.map((c, i) => ({ uuid: c.uuid, pct: pcts[i] })));
  }

  function randomizeAllBPPcts() {
    const pcts = bpRealisticPercentages(bpSelections.length);
    setBpSelections((prev) => prev.map((s, i) => ({ ...s, pct: pcts[i] })));
  }

  function handleConfirmBPs() {
    const exSkins = new Set(form.skins.map((s) => s.displayName));
    const exBuddies = new Set(form.buddies.map((b) => b.displayName));
    const exSprays = new Set(form.sprays.map((s) => s.displayName));
    const exCards = new Set(form.cards.map((c) => c.displayName));
    const exTitles = new Set(form.titles.map((t) => t.displayName));
    const allSkins: AccountSkin[] = [];
    const allBuddies: AccountBuddy[] = [];
    const allSprays: AccountSpray[] = [];
    const allCards: AccountCard[] = [];
    const allTitles: AccountTitle[] = [];
    for (const { uuid, pct } of bpSelections) {
      const contract = contractsData.find((c) => c.uuid === uuid);
      if (!contract) continue;
      const { skins, buddies, sprays, cards, titles } = getAllItemsFromBP(contract, pct);
      for (const s of skins) if (!exSkins.has(s.displayName)) { allSkins.push(s); exSkins.add(s.displayName); }
      for (const b of buddies) if (!exBuddies.has(b.displayName)) { allBuddies.push(b); exBuddies.add(b.displayName); }
      for (const s of sprays) if (!exSprays.has(s.displayName)) { allSprays.push(s); exSprays.add(s.displayName); }
      for (const c of cards) if (!exCards.has(c.displayName)) { allCards.push(c); exCards.add(c.displayName); }
      for (const t of titles) if (!exTitles.has(t.displayName)) { allTitles.push(t); exTitles.add(t.displayName); }
    }
    setForm((f) => ({
      ...f,
      skins: allSkins.length > 0 ? [...f.skins, ...allSkins] : f.skins,
      buddies: allBuddies.length > 0 ? [...f.buddies, ...allBuddies] : f.buddies,
      sprays: allSprays.length > 0 ? [...f.sprays, ...allSprays] : f.sprays,
      cards: allCards.length > 0 ? [...f.cards, ...allCards] : f.cards,
      titles: allTitles.length > 0 ? [...f.titles, ...allTitles] : f.titles,
    }));
    const batchLabel = bpSelections.length === 1
      ? (() => {
          const c = contractsData.find((c) => c.uuid === bpSelections[0].uuid);
          const name = c ? (c.displayName as string).replace(/^Battlepass\s*\/\/\s*/i, "") : "Battle Pass";
          return `${name} (~${bpSelections[0].pct}%)`;
        })()
      : `${bpSelections.length} Battle Passes`;
    pushBatch(batchLabel, bpSelections.length, { skins: allSkins, buddies: allBuddies, sprays: allSprays, cards: allCards, titles: allTitles, flex: [] });
    setShowBPPicker(false);
    setBpRandomizeMode(false);
    setBpSelections([]);
  }

  const openPicker = useCallback(
    async (type: PickerType) => {
      setPicker(type);
      setPickerMode("browse");
      setPickerSearch("");
      setBulkText("");
      setBulkMatches([]);
      setBulkSearched(false);
      setPickerLoading(true);
      try {
        if (type === "skins") {
          const [tiersMap, newWeapons, vpSkins] = await Promise.all([
            Object.keys(contentTiers).length > 0
              ? Promise.resolve(contentTiers)
              : fetchContentTiers(),
            weapons.length > 0
              ? Promise.resolve(weapons)
              : fetch(`${VALO_API}/weapons`).then((r) => r.json()).then((r) => r.data as ValoApiWeapon[]),
            weaponSkinsData.length > 0
              ? Promise.resolve(weaponSkinsData)
              : fetch("https://vinfo-api.com/json/weaponSkins").then((r) => r.json()).catch(() => [] as VinfoSkin[]),
          ]);
          setContentTiers(tiersMap);
          if (weapons.length === 0) {
            setWeapons(newWeapons);
            setSelectedWeapon(newWeapons[0]?.uuid ?? "");
          }
          if (weaponSkinsData.length === 0 && vpSkins.length > 0) {
            setWeaponSkinsData(vpSkins);
          }
        }
        if (type === "agents" && agentsData.length === 0) {
          const res = await fetch(`${VALO_API}/agents?isPlayableCharacter=true`);
          const json = await res.json();
          setAgentsData(json.data);
        }
        if (type === "buddies" && buddiesData.length === 0) {
          const res = await fetch(`${VALO_API}/buddies`);
          const json = await res.json();
          setBuddiesData(json.data);
        }
        if (type === "sprays" && spraysData.length === 0) {
          const res = await fetch(`${VALO_API}/sprays`);
          const json = await res.json();
          setSpraysData(json.data);
        }
        if (type === "cards" && cardsData.length === 0) {
          const res = await fetch(`${VALO_API}/playercards`);
          const json = await res.json();
          setCardsData(json.data);
        }
        if (type === "titles" && titlesData.length === 0) {
          const res = await fetch(`${VALO_API}/playertitles`);
          const json = await res.json();
          setTitlesData(json.data);
        }
      } finally {
        setPickerLoading(false);
      }
    },
    [weapons, weaponSkinsData, agentsData, buddiesData, spraysData, cardsData, titlesData, contentTiers]
  );

  // ─── Bulk search ────────────────────────────────────────────────────────────
  function runBulkSearch() {
    if (!picker) return;
    const lines = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const results: BulkMatch[] = lines.map((input) => {
      const q = input.toLowerCase();

      if (picker === "skins") {
        const match = allSkins.find(({ skin }) =>
          skin.displayName.toLowerCase().includes(q)
        );
        if (!match) return { input, found: false, label: input };
        const { skin, weapon } = match;
        const levelUuid = skin.levels?.[0]?.uuid ?? skin.uuid;
        const icon = skin.chromas?.[0]?.fullRender ?? skin.levels?.[0]?.displayIcon ?? "";
        const tier = contentTiers[skin.contentTierUuid];
        const data: AccountSkin = {
          uuid: levelUuid,
          weaponName: weapon.displayName,
          displayName: skin.displayName,
          displayIcon: icon,
          rarity: tier?.name ?? "Select",
          rarityColor: tier?.color ?? "#5b87c4",
          vpCost: getSkinVPPrice(skin.displayName, weaponSkinsData) ?? undefined,
        };
        return { input, found: true, label: skin.displayName, icon, data };
      }

      if (picker === "agents") {
        const match = agentsData.find((a) =>
          a.displayName.toLowerCase().includes(q)
        );
        if (!match) return { input, found: false, label: input };
        const data: AccountAgent = {
          uuid: match.uuid,
          displayName: match.displayName,
          displayIcon: match.displayIcon,
          fullPortrait: match.fullPortrait,
          role: match.role?.displayName ?? "",
          roleIcon: match.role?.displayIcon,
        };
        return { input, found: true, label: match.displayName, icon: match.displayIcon, data };
      }

      if (picker === "buddies") {
        const match = buddiesData.find((b) =>
          b.displayName.toLowerCase().includes(q)
        );
        if (!match) return { input, found: false, label: input };
        const levelUuid = match.levels?.[0]?.uuid ?? match.uuid;
        const icon = match.levels?.[0]?.displayIcon ?? match.displayIcon ?? "";
        const data: AccountBuddy = { uuid: levelUuid, displayName: match.displayName, displayIcon: icon };
        return { input, found: true, label: match.displayName, icon, data };
      }

      if (picker === "sprays") {
        const match = spraysData.find((s) =>
          s.displayName.toLowerCase().includes(q)
        );
        if (!match) return { input, found: false, label: input };
        const data: AccountSpray = {
          uuid: match.uuid,
          displayName: match.displayName,
          displayIcon: match.displayIcon,
          animationGif: match.animationGif,
        };
        return { input, found: true, label: match.displayName, icon: match.displayIcon, data };
      }

      if (picker === "cards") {
        const match = cardsData.find((c) =>
          c.displayName.toLowerCase().includes(q)
        );
        if (!match) return { input, found: false, label: input };
        const data: AccountCard = {
          uuid: match.uuid,
          displayName: match.displayName,
          smallArt: match.smallArt,
          wideArt: match.wideArt,
          largeArt: match.largeArt,
        };
        return { input, found: true, label: match.displayName, icon: match.smallArt, data };
      }

      if (picker === "titles") {
        const match = titlesData.find((t) =>
          t.displayName.toLowerCase().includes(q) ||
          t.titleText?.toLowerCase().includes(q)
        );
        if (!match) return { input, found: false, label: input };
        const data: AccountTitle = {
          uuid: match.uuid,
          displayName: match.displayName,
          titleText: match.titleText,
        };
        return { input, found: true, label: match.displayName, data };
      }

      return { input, found: false, label: input };
    });

    setBulkMatches(results);
    setBulkSearched(true);
  }

  function addBulkMatches() {
    if (!picker) return;
    const toAdd = bulkMatches.filter((m) => m.found && m.data);

    if (picker === "skins") {
      const existing = new Set(form.skins.map((s) => s.uuid));
      const newItems = (toAdd.map((m) => m.data) as AccountSkin[]).filter(
        (s) => !existing.has(s.uuid)
      );
      set("skins", [...form.skins, ...newItems]);
    }
    if (picker === "agents") {
      const existing = new Set(form.agents.map((a) => a.uuid));
      const newItems = (toAdd.map((m) => m.data) as AccountAgent[]).filter(
        (a) => !existing.has(a.uuid)
      );
      set("agents", [...form.agents, ...newItems]);
    }
    if (picker === "buddies") {
      const existing = new Set(form.buddies.map((b) => b.uuid));
      const newItems = (toAdd.map((m) => m.data) as AccountBuddy[]).filter(
        (b) => !existing.has(b.uuid)
      );
      set("buddies", [...form.buddies, ...newItems]);
    }
    if (picker === "sprays") {
      const existing = new Set(form.sprays.map((s) => s.uuid));
      const newItems = (toAdd.map((m) => m.data) as AccountSpray[]).filter(
        (s) => !existing.has(s.uuid)
      );
      set("sprays", [...form.sprays, ...newItems]);
    }
    if (picker === "cards") {
      const existing = new Set(form.cards.map((c) => c.uuid));
      const newItems = (toAdd.map((m) => m.data) as AccountCard[]).filter(
        (c) => !existing.has(c.uuid)
      );
      set("cards", [...form.cards, ...newItems]);
    }
    if (picker === "titles") {
      const existing = new Set(form.titles.map((t) => t.uuid));
      const newItems = (toAdd.map((m) => m.data) as AccountTitle[]).filter(
        (t) => !existing.has(t.uuid)
      );
      set("titles", [...form.titles, ...newItems]);
    }

    setBulkText("");
    setBulkMatches([]);
    setBulkSearched(false);
    setPickerMode("browse");
  }

  // ─── Toggle helpers ──────────────────────────────────────────────────────────
  const selectedSkinUuids = new Set(form.skins.map((s) => s.uuid));
  const selectedAgentUuids = new Set(form.agents.map((a) => a.uuid));
  const selectedBuddyUuids = new Set(form.buddies.map((b) => b.uuid));
  const selectedSprayUuids = new Set(form.sprays.map((s) => s.uuid));
  const selectedCardUuids = new Set(form.cards.map((c) => c.uuid));
  const selectedTitleUuids = new Set(form.titles.map((t) => t.uuid));

  const currentWeapon = weapons.find((w) => w.uuid === selectedWeapon);

  function toggleSkin(skin: ValoApiWeapon["skins"][0], weapon: ValoApiWeapon) {
    const levelUuid = skin.levels?.[0]?.uuid ?? skin.uuid;
    if (selectedSkinUuids.has(levelUuid)) {
      set("skins", form.skins.filter((s) => s.uuid !== levelUuid));
      setBpSuggestion(null);
    } else {
      const icon = skin.chromas?.[0]?.fullRender ?? skin.levels?.[0]?.displayIcon ?? null;
      if (!icon) return;
      const tier = contentTiers[skin.contentTierUuid];
      const chromas = (skin.chromas ?? [])
        .filter((c) => c.swatch)
        .map((c) => ({ uuid: c.uuid, swatch: c.swatch as string }));
      set("skins", [...form.skins, {
        uuid: levelUuid,
        weaponName: weapon.displayName,
        displayName: skin.displayName,
        displayIcon: icon,
        rarity: tier?.name ?? "Select",
        rarityColor: tier?.color ?? "#5b87c4",
        vpCost: getSkinVPPrice(skin.displayName, weaponSkinsData) ?? undefined,
        chromas: chromas.length > 0 ? chromas : undefined,
      }]);
      detectBPSkin(levelUuid, skin.displayName);
    }
  }

  function toggleAgent(agent: ValoApiAgent) {
    const isDefault = DEFAULT_AGENT_NAMES.some(
      (n) => agent.displayName.toLowerCase() === n.toLowerCase()
    );
    if (selectedAgentUuids.has(agent.uuid)) {
      if (isDefault) return; // can't deselect base agents
      set("agents", form.agents.filter((a) => a.uuid !== agent.uuid));
    } else {
      set("agents", [...form.agents, {
        uuid: agent.uuid,
        displayName: agent.displayName,
        displayIcon: agent.displayIcon,
        fullPortrait: agent.fullPortrait,
        role: agent.role?.displayName ?? "",
        roleIcon: agent.role?.displayIcon,
      }]);
    }
  }

  function selectAllAgents() {
    const toAdd = filteredAgents
      .filter((a) => !DEFAULT_AGENT_NAMES.some((n) => a.displayName.toLowerCase() === n.toLowerCase()))
      .filter((a) => !selectedAgentUuids.has(a.uuid))
      .map((a) => ({ uuid: a.uuid, displayName: a.displayName, displayIcon: a.displayIcon, fullPortrait: a.fullPortrait, role: a.role?.displayName ?? "", roleIcon: a.role?.displayIcon }));
    if (toAdd.length > 0) set("agents", [...form.agents, ...toAdd]);
  }

  function randomizeAgents() {
    const defaults = form.agents.filter((a) => DEFAULT_AGENT_NAMES.some((n) => a.displayName.toLowerCase() === n.toLowerCase()));
    const pool = agentsData.filter((a) => !DEFAULT_AGENT_NAMES.some((n) => a.displayName.toLowerCase() === n.toLowerCase()));
    const count = 4 + Math.floor(Math.random() * 9); // 4–12 agents
    const picked = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length)).map((a) => ({
      uuid: a.uuid, displayName: a.displayName, displayIcon: a.displayIcon,
      fullPortrait: a.fullPortrait, role: a.role?.displayName ?? "", roleIcon: a.role?.displayIcon,
    }));
    set("agents", [...defaults, ...picked]);
  }

  function toggleBuddy(buddy: ValoApiBuddy) {
    const levelUuid = buddy.levels?.[0]?.uuid ?? buddy.uuid;
    if (selectedBuddyUuids.has(levelUuid)) {
      set("buddies", form.buddies.filter((b) => b.uuid !== levelUuid));
    } else {
      const icon = buddy.levels?.[0]?.displayIcon ?? buddy.displayIcon ?? "";
      set("buddies", [...form.buddies, { uuid: levelUuid, displayName: buddy.displayName, displayIcon: icon }]);
    }
  }

  function toggleSpray(spray: ValoApiSpray) {
    if (selectedSprayUuids.has(spray.uuid)) {
      set("sprays", form.sprays.filter((s) => s.uuid !== spray.uuid));
    } else {
      set("sprays", [...form.sprays, {
        uuid: spray.uuid,
        displayName: spray.displayName,
        displayIcon: spray.displayIcon,
        animationGif: spray.animationGif,
      }]);
    }
  }

  function toggleCard(card: ValoApiCard) {
    if (selectedCardUuids.has(card.uuid)) {
      set("cards", form.cards.filter((c) => c.uuid !== card.uuid));
    } else {
      set("cards", [...form.cards, {
        uuid: card.uuid,
        displayName: card.displayName,
        smallArt: card.smallArt,
        wideArt: card.wideArt,
        largeArt: card.largeArt,
      }]);
    }
  }

  function toggleTitle(title: ValoApiTitle) {
    if (selectedTitleUuids.has(title.uuid)) {
      set("titles", form.titles.filter((t) => t.uuid !== title.uuid));
    } else {
      set("titles", [...form.titles, {
        uuid: title.uuid,
        displayName: title.displayName,
        titleText: title.titleText,
      }]);
    }
  }

  // ─── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) return setError("El título es obligatorio");
    if (!form.price || isNaN(Number(form.price))) return setError("El precio debe ser un número");
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        rank: form.rank || undefined,
        description: form.description || undefined,
      };
      const res = isEdit
        ? await fetch(`/api/admin/accounts/${account.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/accounts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error al guardar");
      }
      router.push("/admin/accounts");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSaving(false);
    }
  }

  // ─── Browse filtered lists ───────────────────────────────────────────────────
  const filteredSkins = (currentWeapon?.skins ?? [])
    .filter((s) => s.contentTierUuid && s.displayName.toLowerCase().includes(pickerSearch.toLowerCase()))
    .sort((a, b) => (getSkinVPPrice(b.displayName, weaponSkinsData) ?? 0) - (getSkinVPPrice(a.displayName, weaponSkinsData) ?? 0));
  const filteredAgents = agentsData.filter((a) =>
    a.displayName.toLowerCase().includes(pickerSearch.toLowerCase())
  );
  const filteredBuddies = buddiesData.filter((b) =>
    b.displayName.toLowerCase().includes(pickerSearch.toLowerCase())
  );
  const filteredSprays = spraysData.filter((s) =>
    s.displayName.toLowerCase().includes(pickerSearch.toLowerCase())
  );
  const filteredCards = cardsData.filter((c) =>
    c.displayName.toLowerCase().includes(pickerSearch.toLowerCase())
  );
  const filteredTitles = titlesData.filter(
    (t) =>
      t.displayName?.toLowerCase().includes(pickerSearch.toLowerCase()) ||
      t.titleText?.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  const SECTION_LABELS: Record<string, string> = {
    skins: "Skins",
    agents: "Agentes",
    buddies: "Gun Buddies",
    sprays: "Sprays",
    cards: "Player Cards",
    titles: "Títulos",
    flex: "Flex",
  };

  const pickerCount = picker
    ? {
        skins: form.skins.length,
        agents: form.agents.length,
        buddies: form.buddies.length,
        sprays: form.sprays.length,
        cards: form.cards.length,
        titles: form.titles.length,
      }[picker]
    : 0;

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ── Import from ValoInventory ── */}
        <div className="rounded-2xl border border-violet/20 bg-violet/5 p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-text">Importar desde ValoInventory</h2>
            <p className="text-xs text-muted mt-1">
              Pegá el link de una cuenta compartida de ValoInventory y se carga todo automáticamente.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={importUrl}
              onChange={(e) => { setImportUrl(e.target.value); setImportResult(null); }}
              placeholder="https://valoinventory-azure.vercel.app/share/..."
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-dark border border-dark-border text-text text-sm focus:outline-none focus:border-violet/50 transition-colors placeholder:text-muted"
              disabled={importing}
            />
            <button
              type="button"
              onClick={handleImport}
              disabled={importing || !importUrl.trim()}
              className="px-5 py-2.5 rounded-xl bg-violet hover:bg-violet/90 disabled:opacity-40 text-white font-semibold text-sm transition-all whitespace-nowrap"
            >
              {importing ? "Importando..." : "Importar"}
            </button>
          </div>
          {importResult && (
            <p className={`text-sm ${importResult.ok ? "text-rarity-deluxe" : "text-rarity-exclusive"}`}>
              {importResult.ok ? "✓ " : "✗ "}{importResult.msg}
            </p>
          )}
        </div>

        {/* Basic info */}
        <div className="rounded-2xl border border-dark-border bg-dark-card p-6 space-y-5">
          <h2 className="font-semibold text-text">Información básica</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs text-muted mb-1.5">Título *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Ej: Cuenta Full Reaver"
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark border border-dark-border text-text text-sm focus:outline-none focus:border-violet/50 transition-colors placeholder:text-muted"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-muted mb-1.5">Descripción</label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Descripción opcional..."
                rows={2}
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark border border-dark-border text-text text-sm focus:outline-none focus:border-violet/50 transition-colors placeholder:text-muted resize-none"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1.5">Precio *</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark border border-dark-border text-text text-sm focus:outline-none focus:border-violet/50 transition-colors placeholder:text-muted"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1.5">Moneda</label>
              <select
                value={form.currency}
                onChange={(e) => set("currency", e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark border border-dark-border text-text text-sm focus:outline-none focus:border-violet/50 transition-colors"
              >
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1.5">Región</label>
              <select
                value={form.region}
                onChange={(e) => set("region", e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark border border-dark-border text-text text-sm focus:outline-none focus:border-violet/50 transition-colors"
              >
                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1.5">Rank</label>
              <select
                value={form.rank}
                onChange={(e) => { void handleRankChange(e.target.value); }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark border border-dark-border text-text text-sm focus:outline-none focus:border-violet/50 transition-colors"
              >
                {RANKS.map((r) => <option key={r} value={r}>{r || "— Sin rank —"}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1.5">Estado</label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value as "available" | "sold")}
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark border border-dark-border text-text text-sm focus:outline-none focus:border-violet/50 transition-colors"
              >
                <option value="available">Disponible</option>
                <option value="sold">Vendida</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => set("featured", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-dark-border rounded-full peer-checked:bg-violet transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-transform peer-checked:after:translate-x-4" />
              </label>
              <span className="text-sm text-muted">Destacada en home</span>
            </div>
          </div>
        </div>

        {/* VP Spent summary */}
        {(() => {
          const skinsVP = form.skins.reduce((s, sk) => s + (sk.vpCost ?? 0), 0);
          const bpVP = form.battlePassCount * 1000;
          const totalVP = skinsVP + bpVP;
          return (
            <div className="rounded-2xl border border-dark-border bg-dark-card p-6">
              <h2 className="font-semibold text-text mb-4">VP Gastados</h2>
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[120px]">
                  <p className="text-xs text-muted mb-1">Skins</p>
                  <p className="text-lg font-bold text-text">{skinsVP.toLocaleString()} <span className="text-sm font-normal text-muted">VP</span></p>
                </div>
                <div className="flex-1 min-w-[120px]">
                  <p className="text-xs text-muted mb-1">Battle Passes</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={form.battlePassCount}
                      onChange={(e) => set("battlePassCount", Math.max(0, Number(e.target.value) || 0))}
                      className="w-14 px-2 py-1 rounded-lg bg-dark border border-dark-border text-sm text-text text-center focus:outline-none focus:border-violet/50"
                    />
                    <span className="text-xs text-muted">× 1 000 = <span className="text-text font-medium">{bpVP.toLocaleString()} VP</span></span>
                  </div>
                </div>
                <div className="flex-1 min-w-[140px]">
                  <p className="text-xs text-muted mb-1">Total</p>
                  <p className="text-2xl font-bold" style={{ color: "#a78bfa" }}>{totalVP.toLocaleString()} <span className="text-sm font-normal text-muted">VP</span></p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Cosmetics sections */}
        {(
          [
            { key: "skins",   count: form.skins.length },
            { key: "agents",  count: form.agents.length },
            { key: "buddies", count: form.buddies.length },
            { key: "sprays",  count: form.sprays.length },
            { key: "cards",   count: form.cards.length },
            { key: "titles",  count: form.titles.length },
            { key: "flex",    count: form.flex.length },
          ] as const
        ).map(({ key, count }) => (
          <div key={key} className="rounded-2xl border border-dark-border bg-dark-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-text">{SECTION_LABELS[key]}</h2>
                {key === "agents" && !isEdit && count > 0 && (
                  <p className="text-xs text-muted mt-0.5">
                    <span className="text-rarity-deluxe">✓</span> Incluye los 5 agentes base
                  </p>
                )}
                {key === "skins" && count > 0 && (() => {
                  const totalVP = form.skins.reduce((s, sk) => s + (sk.vpCost ?? 0), 0);
                  return (
                    <p className="text-xs text-muted mt-0.5">
                      {count} agregadas{totalVP > 0 ? ` · ${totalVP.toLocaleString()} VP` : ""}
                    </p>
                  );
                })()}
                {count > 0 && !(key === "agents" && !isEdit) && key !== "skins" && (
                  <p className="text-xs text-muted mt-0.5">{count} agregados</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {key === "skins" && (
                  <>
                    <button
                      type="button"
                      onClick={openBundlePicker}
                      className="px-3.5 py-1.5 rounded-xl border border-violet/30 text-sm text-violet-light hover:bg-violet/10 transition-colors"
                    >
                      Bundle
                    </button>
                    <button
                      type="button"
                      onClick={openBPPicker}
                      className="px-3.5 py-1.5 rounded-xl border border-violet/30 text-sm text-violet-light hover:bg-violet/10 transition-colors"
                    >
                      Battle Pass
                    </button>
                  </>
                )}
                {key !== "flex" && (
                  <button
                    type="button"
                    onClick={() => openPicker(key as PickerType)}
                    className="px-3.5 py-1.5 rounded-xl border border-dark-border text-sm text-muted hover:text-text hover:border-violet/40 transition-colors"
                  >
                    + Agregar
                  </button>
                )}
              </div>
            </div>

            {/* BP suggestion banner */}
            {key === "skins" && bpSuggestion && (
              <div className="mb-3 rounded-xl border border-violet/30 bg-violet/5 px-4 py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">
                    &ldquo;{bpSuggestion.skinName}&rdquo; es del {(bpSuggestion.contract.displayName as string).replace(/^Battlepass\s*\/\/\s*/i, "")}
                  </p>
                  <p className="text-xs text-muted mt-0.5 mb-2">
                    Detectado en el nivel ~{bpSuggestion.pct}% del pase.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => confirmBPSuggestion("partial")}
                      disabled={bpSuggestionLoading}
                      className="px-3 py-1.5 rounded-lg bg-violet hover:bg-violet/90 disabled:opacity-60 text-white text-xs font-semibold transition-colors"
                    >
                      {bpSuggestionLoading ? "Cargando..." : `Hasta el ~${bpSuggestion.pct}%`}
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmBPSuggestion("full")}
                      disabled={bpSuggestionLoading}
                      className="px-3 py-1.5 rounded-lg border border-violet/40 text-violet-light hover:bg-violet/10 disabled:opacity-60 text-xs font-semibold transition-colors"
                    >
                      Pase completo (100%)
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBpSuggestion(null)}
                  className="shrink-0 text-muted hover:text-text text-sm transition-colors"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Batch undo chips */}
            {key === "skins" && addBatches.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {addBatches.map((batch) => (
                  <div
                    key={batch.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dark-border bg-dark-hover text-xs text-muted"
                  >
                    <span className="text-text font-medium">{batch.label}</span>
                    <button
                      type="button"
                      onClick={() => undoBatch(batch.id)}
                      className="hover:text-red-400 transition-colors ml-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Skins preview */}
            {key === "skins" && form.skins.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {[...form.skins]
                  .sort((a, b) => (b.vpCost ?? 0) - (a.vpCost ?? 0))
                  .map((skin) => {
                    const exclusive = isHardcodedExclusive(skin.displayName);
                    return (
                      <div
                        key={skin.uuid}
                        className="flex items-center gap-2 rounded-lg border bg-dark px-2 py-1.5"
                        style={{ borderColor: exclusive ? "rgba(232,168,48,0.4)" : "rgba(255,255,255,0.06)" }}
                      >
                        {skin.displayIcon && (
                          <div className="relative w-12 h-8 shrink-0">
                            <Image src={skin.displayIcon} alt={skin.displayName} fill sizes="48px" className="object-contain" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-text truncate">{skin.displayName}</p>
                          {skin.vpCost != null && (
                            <p className="text-xs" style={{ color: exclusive ? "#e8a830" : "#6b7280" }}>
                              {skin.vpCost.toLocaleString()} VP
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => set("skins", form.skins.filter((s) => s.uuid !== skin.uuid))}
                          className="text-muted hover:text-rarity-exclusive text-xs shrink-0"
                        >✕</button>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Agents preview */}
            {key === "agents" && form.agents.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.agents.map((agent) => {
                  const isDefault = DEFAULT_AGENT_NAMES.some(
                    (n) => agent.displayName.toLowerCase() === n.toLowerCase()
                  );
                  return (
                    <div
                      key={agent.uuid}
                      className={`flex items-center gap-1.5 rounded-lg border bg-dark px-2 py-1 ${isDefault ? "border-violet/20" : "border-dark-border"}`}
                    >
                      {agent.displayIcon && (
                        <div className="relative w-6 h-6 shrink-0">
                          <Image src={agent.displayIcon} alt={agent.displayName} fill sizes="48px" className="object-contain" />
                        </div>
                      )}
                      <span className="text-xs text-text">{agent.displayName}</span>
                      {isDefault ? (
                        <span className="text-xs text-violet/50 ml-1" title="Agente base">🔒</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => set("agents", form.agents.filter((a) => a.uuid !== agent.uuid))}
                          className="text-muted hover:text-rarity-exclusive text-xs ml-1"
                        >✕</button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Buddies preview */}
            {key === "buddies" && form.buddies.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.buddies.map((buddy) => (
                  <div key={buddy.uuid} className="flex items-center gap-1.5 rounded-lg border border-dark-border bg-dark px-2 py-1">
                    {buddy.displayIcon && (
                      <div className="relative w-6 h-6 shrink-0">
                        <Image src={buddy.displayIcon} alt={buddy.displayName} fill sizes="24px" className="object-contain" />
                      </div>
                    )}
                    <span className="text-xs text-text">{buddy.displayName}</span>
                    <button
                      type="button"
                      onClick={() => set("buddies", form.buddies.filter((b) => b.uuid !== buddy.uuid))}
                      className="text-muted hover:text-rarity-exclusive text-xs ml-1"
                    >✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Flex preview */}
            {key === "flex" && form.flex.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.flex.map((item) => (
                  <div key={item.uuid} className="flex items-center gap-1.5 rounded-lg border border-dark-border bg-dark px-2 py-1">
                    {item.displayIcon && (
                      <div className="relative w-6 h-6 shrink-0">
                        <Image src={item.displayIcon} alt={item.displayName} fill sizes="24px" className="object-contain" />
                      </div>
                    )}
                    <span className="text-xs text-text">{item.displayName}</span>
                    <button
                      type="button"
                      onClick={() => set("flex", form.flex.filter((f) => f.uuid !== item.uuid))}
                      className="text-muted hover:text-rarity-exclusive text-xs ml-1"
                    >✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Sprays / cards / titles preview */}
            {(["sprays", "cards", "titles"] as string[]).includes(key) &&
              (form[key as "sprays" | "cards" | "titles"] as { uuid: string; displayName: string }[]).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(form[key as "sprays" | "cards" | "titles"] as { uuid: string; displayName: string }[]).map((item) => (
                    <div key={item.uuid} className="flex items-center gap-1.5 rounded-lg border border-dark-border bg-dark px-2 py-1">
                      <span className="text-xs text-text">{item.displayName}</span>
                      <button
                        type="button"
                        onClick={() =>
                          set(
                            key as keyof FormState,
                            (form[key as keyof FormState] as { uuid: string }[]).filter((i) => i.uuid !== item.uuid)
                          )
                        }
                        className="text-muted hover:text-rarity-exclusive text-xs"
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}
          </div>
        ))}

        {error && <p className="text-rarity-exclusive text-sm px-1">{error}</p>}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-violet hover:bg-violet/90 disabled:opacity-50 text-white font-semibold text-sm transition-all"
          >
            {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear cuenta"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 rounded-xl border border-dark-border text-muted hover:text-text text-sm transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>

      {/* ─── Picker Modal ──────────────────────────────────────────────────────── */}
      {picker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-dark/80 backdrop-blur-sm" onClick={() => setPicker(null)} />
          <div className="relative w-full max-w-3xl max-h-[85vh] rounded-2xl border border-dark-border bg-dark-card flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-dark-border">
              <h3 className="font-semibold text-text">Agregar {SECTION_LABELS[picker]}</h3>
              <div className="flex items-center gap-3">
                {/* Mode toggle */}
                <div className="flex items-center rounded-lg border border-dark-border overflow-hidden text-xs">
                  <button
                    type="button"
                    onClick={() => { setPickerMode("browse"); setBulkSearched(false); }}
                    className={`px-3 py-1.5 transition-colors ${pickerMode === "browse" ? "bg-violet/20 text-violet-light" : "text-muted hover:text-text"}`}
                  >
                    Buscar
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickerMode("bulk")}
                    className={`px-3 py-1.5 transition-colors ${pickerMode === "bulk" ? "bg-violet/20 text-violet-light" : "text-muted hover:text-text"}`}
                  >
                    Agregar en masa
                  </button>
                </div>
                <button onClick={() => setPicker(null)} className="text-muted hover:text-text transition-colors">✕</button>
              </div>
            </div>

            {pickerLoading ? (
              <div className="flex-1 flex items-center justify-center text-muted text-sm py-20">
                Cargando datos de la API...
              </div>
            ) : pickerMode === "bulk" ? (
              /* ── Bulk mode ── */
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="p-5 space-y-3 border-b border-dark-border">
                  <p className="text-xs text-muted">
                    Pegá los nombres (uno por línea). La búsqueda es parcial — por ej.
                    {picker === "skins" ? ' "Reaver Vandal", "Prime Phantom"' : picker === "agents" ? ' "Killjoy", "Raze"' : ' "Ruination"'}.
                  </p>
                  <textarea
                    value={bulkText}
                    onChange={(e) => { setBulkText(e.target.value); setBulkSearched(false); }}
                    placeholder={"Nombre 1\nNombre 2\nNombre 3\n..."}
                    rows={6}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-dark border border-dark-border text-text text-sm focus:outline-none focus:border-violet/50 placeholder:text-muted resize-none font-mono"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={runBulkSearch}
                    disabled={!bulkText.trim()}
                    className="px-5 py-2 rounded-xl bg-dark-hover border border-dark-border hover:border-violet/40 text-sm text-text disabled:opacity-40 transition-colors"
                  >
                    Buscar ({bulkText.split("\n").filter((l) => l.trim()).length} líneas)
                  </button>
                </div>

                {/* Results preview */}
                {bulkSearched && (
                  <div className="overflow-y-auto flex-1 p-4 space-y-1.5">
                    <p className="text-xs text-muted mb-3">
                      {bulkMatches.filter((m) => m.found).length} encontrados ·{" "}
                      {bulkMatches.filter((m) => !m.found).length} no encontrados
                    </p>
                    {bulkMatches.map((match, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border ${
                          match.found
                            ? "border-rarity-deluxe/20 bg-rarity-deluxe/5"
                            : "border-rarity-exclusive/20 bg-rarity-exclusive/5"
                        }`}
                      >
                        {match.found ? (
                          <>
                            {match.icon && (
                              <div className="relative w-10 h-7 shrink-0">
                                <Image src={match.icon} alt={match.label} fill sizes="40px" className="object-contain" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-text truncate">{match.label}</p>
                              {match.label !== match.input && (
                                <p className="text-xs text-muted truncate">Entrada: &ldquo;{match.input}&rdquo;</p>
                              )}
                            </div>
                            <span className="text-rarity-deluxe text-sm shrink-0">✓</span>
                          </>
                        ) : (
                          <>
                            <span className="text-rarity-exclusive shrink-0">✗</span>
                            <p className="text-sm text-muted flex-1 truncate">{match.input}</p>
                            <span className="text-xs text-muted shrink-0">No encontrado</span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Bulk footer */}
                {bulkSearched && bulkMatches.some((m) => m.found) && (
                  <div className="px-5 py-3.5 border-t border-dark-border flex items-center justify-between">
                    <p className="text-xs text-muted">
                      Se agregarán {bulkMatches.filter((m) => m.found).length} items
                    </p>
                    <button
                      type="button"
                      onClick={addBulkMatches}
                      className="px-5 py-2 rounded-xl bg-violet hover:bg-violet/90 text-white text-sm font-semibold transition-all"
                    >
                      Agregar {bulkMatches.filter((m) => m.found).length} items
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* ── Browse mode ── */
              <>
                {/* Weapon selector */}
                {picker === "skins" && weapons.length > 0 && (
                  <div className="px-5 py-3 border-b border-dark-border">
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {weapons.map((w) => (
                        <button
                          key={w.uuid}
                          type="button"
                          onClick={() => { setSelectedWeapon(w.uuid); setPickerSearch(""); }}
                          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            selectedWeapon === w.uuid
                              ? "bg-violet/20 text-violet-light border border-violet/30"
                              : "border border-dark-border text-muted hover:text-text"
                          }`}
                        >
                          {w.displayName}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search */}
                <div className="px-5 py-3 border-b border-dark-border">
                  <input
                    type="text"
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    placeholder="Buscar..."
                    className="w-full px-3 py-2 rounded-lg bg-dark border border-dark-border text-text text-sm focus:outline-none focus:border-violet/50 placeholder:text-muted"
                    autoFocus
                  />
                </div>

                {/* Grid */}
                <div className="overflow-y-auto flex-1 p-4">
                  {picker === "skins" && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {filteredSkins.map((skin) => {
                        const levelUuid = skin.levels?.[0]?.uuid ?? skin.uuid;
                        const icon = skin.chromas?.[0]?.fullRender ?? skin.levels?.[0]?.displayIcon ?? null;
                        if (!icon) return null;
                        const isExclusive = isHardcodedExclusive(skin.displayName);
                        const selected = selectedSkinUuids.has(levelUuid);
                        const vpPrice = getSkinVPPrice(skin.displayName, weaponSkinsData);
                        return (
                          <button
                            key={skin.uuid}
                            type="button"
                            onClick={() => toggleSkin(skin, currentWeapon!)}
                            className={`flex items-center gap-2 rounded-xl border p-2 text-left transition-all ${selected ? "border-violet/50 bg-violet/10" : isExclusive ? "border-[#e8a830]/40 bg-[#e8a830]/8 hover:border-[#e8a830]/60" : "border-dark-border bg-dark hover:border-dark-hover"}`}
                          >
                            <div className="relative w-16 h-10 shrink-0 rounded-lg overflow-hidden bg-dark-hover">
                              <Image src={icon} alt={skin.displayName} fill sizes="64px" className="object-contain p-0.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-text truncate">{skin.displayName}</p>
                              {vpPrice != null && (
                                <p className="text-xs" style={{ color: isExclusive ? "#e8a830" : "#6b7280" }}>
                                  {vpPrice.toLocaleString()} VP
                                </p>
                              )}
                            </div>
                            {selected && <span className="ml-auto text-violet-light text-sm shrink-0">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {picker === "agents" && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {filteredAgents.map((agent) => {
                        const selected = selectedAgentUuids.has(agent.uuid);
                        const isDefault = DEFAULT_AGENT_NAMES.some(
                          (n) => agent.displayName.toLowerCase() === n.toLowerCase()
                        );
                        return (
                          <button
                            key={agent.uuid}
                            type="button"
                            onClick={() => toggleAgent(agent)}
                            className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all ${
                              isDefault
                                ? "border-violet/30 bg-violet/5 cursor-default"
                                : selected
                                ? "border-violet/50 bg-violet/10"
                                : "border-dark-border bg-dark hover:border-dark-hover"
                            }`}
                          >
                            <div className="relative w-12 h-12">
                              <Image src={agent.displayIcon} alt={agent.displayName} fill sizes="48px" className="object-contain" />
                            </div>
                            <p className="text-xs text-text text-center">{agent.displayName}</p>
                            {isDefault ? (
                              <span className="text-violet/50 text-xs">base</span>
                            ) : selected ? (
                              <span className="text-violet-light text-xs">✓</span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {picker === "buddies" && (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {filteredBuddies.map((buddy) => {
                        const levelUuid = buddy.levels?.[0]?.uuid ?? buddy.uuid;
                        const icon = buddy.levels?.[0]?.displayIcon ?? buddy.displayIcon;
                        const selected = selectedBuddyUuids.has(levelUuid);
                        return (
                          <button
                            key={buddy.uuid}
                            type="button"
                            onClick={() => toggleBuddy(buddy)}
                            className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-all ${selected ? "border-violet/50 bg-violet/10" : "border-dark-border bg-dark hover:border-dark-hover"}`}
                          >
                            {icon && (
                              <div className="relative w-10 h-10">
                                <Image src={icon} alt={buddy.displayName} fill sizes="40px" className="object-contain" />
                              </div>
                            )}
                            <p className="text-xs text-text text-center line-clamp-2 leading-tight">{buddy.displayName}</p>
                            {selected && <span className="text-violet-light text-xs">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {picker === "sprays" && (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {filteredSprays.map((spray) => {
                        const selected = selectedSprayUuids.has(spray.uuid);
                        return (
                          <button
                            key={spray.uuid}
                            type="button"
                            onClick={() => toggleSpray(spray)}
                            className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-all ${selected ? "border-violet/50 bg-violet/10" : "border-dark-border bg-dark hover:border-dark-hover"}`}
                          >
                            {spray.displayIcon && (
                              <div className="relative w-12 h-12">
                                <Image src={spray.animationGif ?? spray.displayIcon} alt={spray.displayName} fill sizes="48px" className="object-contain" unoptimized={!!spray.animationGif} />
                              </div>
                            )}
                            <p className="text-xs text-text text-center line-clamp-2 leading-tight">{spray.displayName}</p>
                            {selected && <span className="text-violet-light text-xs">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {picker === "cards" && (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {filteredCards.map((card) => {
                        const selected = selectedCardUuids.has(card.uuid);
                        return (
                          <button
                            key={card.uuid}
                            type="button"
                            onClick={() => toggleCard(card)}
                            className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-all ${selected ? "border-violet/50 bg-violet/10" : "border-dark-border bg-dark hover:border-dark-hover"}`}
                          >
                            {card.smallArt && (
                              <div className="relative w-10 h-14 rounded overflow-hidden">
                                <Image src={card.smallArt} alt={card.displayName} fill sizes="40px" className="object-cover" />
                              </div>
                            )}
                            <p className="text-xs text-text text-center line-clamp-2 leading-tight">{card.displayName}</p>
                            {selected && <span className="text-violet-light text-xs">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {picker === "titles" && (
                    <div className="space-y-1.5">
                      {filteredTitles.map((title) => {
                        const selected = selectedTitleUuids.has(title.uuid);
                        return (
                          <button
                            key={title.uuid}
                            type="button"
                            onClick={() => toggleTitle(title)}
                            className={`w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-left transition-all ${selected ? "border-violet/50 bg-violet/10" : "border-dark-border bg-dark hover:border-dark-hover"}`}
                          >
                            <div>
                              <p className="text-sm text-text font-medium">{title.displayName}</p>
                              {title.titleText && <p className="text-xs text-muted italic">&ldquo;{title.titleText}&rdquo;</p>}
                            </div>
                            {selected && <span className="text-violet-light shrink-0">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Browse footer */}
                <div className="px-5 py-3.5 border-t border-dark-border flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted shrink-0">{pickerCount} seleccionados</p>
                    {picker === "agents" && (
                      <>
                        <button
                          type="button"
                          onClick={selectAllAgents}
                          className="text-xs px-2.5 py-1 rounded-lg border border-dark-border text-muted hover:text-text hover:border-violet/40 transition-colors"
                        >
                          Todos
                        </button>
                        <button
                          type="button"
                          onClick={randomizeAgents}
                          className="text-xs px-2.5 py-1 rounded-lg border border-dark-border text-muted hover:text-text hover:border-violet/40 transition-colors"
                        >
                          ↺ Random
                        </button>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPicker(null)}
                    className="px-4 py-2 rounded-xl bg-violet hover:bg-violet/90 text-white text-sm font-semibold transition-all"
                  >
                    Listo
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── Battle Pass Picker Modal ───────────────────────────────────────────── */}
      {showBPPicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-dark/80 backdrop-blur-sm"
            onClick={() => { setShowBPPicker(false); setSelectedBP(null); setBpRandomizeMode(false); }}
          />
          <div className="relative w-full max-w-lg max-h-[80vh] rounded-2xl border border-dark-border bg-dark-card flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-dark-border">
              <div className="flex items-center gap-2">
                {(selectedBP || bpRandomizeMode) && (
                  <button
                    type="button"
                    onClick={() => { setSelectedBP(null); setBpRandomizeMode(false); }}
                    className="text-muted hover:text-text transition-colors text-sm mr-1"
                  >←</button>
                )}
                <div>
                  <h3 className="font-semibold text-text">
                    {bpRandomizeMode ? "Randomizar Battle Passes" : selectedBP ? (selectedBP.displayName as string).replace(/^Battlepass\s*\/\/\s*/i, "") : "Skins de Battle Pass"}
                  </h3>
                  {!selectedBP && !bpRandomizeMode && (
                    <p className="text-xs text-muted mt-0.5">Elegí un pase o randomizá varios</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => { setShowBPPicker(false); setSelectedBP(null); setBpRandomizeMode(false); }}
                className="text-muted hover:text-text transition-colors"
              >✕</button>
            </div>

            {bpLoading ? (
              <div className="flex-1 flex items-center justify-center text-muted text-sm py-16">
                Cargando contratos...
              </div>

            ) : selectedBP ? (
              /* ── Vista detalle: slider de progreso ── */
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 flex flex-col items-center justify-center px-8 py-10 space-y-8">
                  {/* Slider */}
                  <div className="w-full space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted">Progreso del pase</span>
                      <span className="text-xl font-bold text-text">{bpProgress}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={bpProgress}
                      onChange={(e) => setBpProgress(Number(e.target.value))}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer accent-violet"
                    />
                    <div className="flex justify-between text-xs text-muted">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* Preview count */}
                  {(() => {
                    const { skins, buddies, sprays, cards, titles } = getAllItemsFromBP(selectedBP, bpProgress);
                    const exSkins = new Set(form.skins.map((s) => s.displayName));
                    const exBuddies = new Set(form.buddies.map((b) => b.displayName));
                    const exSprays = new Set(form.sprays.map((s) => s.displayName));
                    const exCards = new Set(form.cards.map((c) => c.displayName));
                    const exTitles = new Set(form.titles.map((t) => t.displayName));
                    const newSkins = skins.filter((s) => !exSkins.has(s.displayName)).length;
                    const newBuddies = buddies.filter((b) => !exBuddies.has(b.displayName)).length;
                    const newSprays = sprays.filter((s) => !exSprays.has(s.displayName)).length;
                    const newCards = cards.filter((c) => !exCards.has(c.displayName)).length;
                    const newTitles = titles.filter((t) => !exTitles.has(t.displayName)).length;
                    const total = newSkins + newBuddies + newSprays + newCards + newTitles;
                    const parts = [
                      newSkins > 0 && `${newSkins} skin${newSkins !== 1 ? "s" : ""}`,
                      newBuddies > 0 && `${newBuddies} buddy`,
                      newSprays > 0 && `${newSprays} spray${newSprays !== 1 ? "s" : ""}`,
                      newCards > 0 && `${newCards} card${newCards !== 1 ? "s" : ""}`,
                      newTitles > 0 && `${newTitles} título${newTitles !== 1 ? "s" : ""}`,
                    ].filter(Boolean);
                    return (
                      <p className="text-sm text-muted text-center">
                        {total === 0 ? "Todo ya está en el formulario" : (
                          <><span className="text-text font-semibold">{total}</span> ítems nuevos — {parts.join(", ")}</>
                        )}
                      </p>
                    );
                  })()}
                </div>

                <div className="px-5 py-4 border-t border-dark-border flex gap-3">
                  <button
                    type="button"
                    onClick={confirmAddBPWithProgress}
                    className="flex-1 py-2.5 rounded-xl bg-violet hover:bg-violet/90 text-white font-semibold text-sm transition-all"
                  >
                    Agregar ítems del pase
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedBP(null)}
                    className="px-4 py-2.5 rounded-xl border border-dark-border text-muted hover:text-text text-sm transition-colors"
                  >
                    Volver
                  </button>
                </div>
              </div>

            ) : bpRandomizeMode ? (
              /* ── Vista randomizar: lista de BPs con selección ── */
              <div className="flex flex-col flex-1 overflow-hidden">
                {/* Sub-header: search + auto-select */}
                <div className="px-4 py-3 border-b border-dark-border flex items-center gap-2">
                  <input
                    type="text"
                    value={bpSearch}
                    onChange={(e) => setBpSearch(e.target.value)}
                    placeholder="Buscar pase..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-dark border border-dark-border text-text text-sm focus:outline-none focus:border-violet/50 placeholder:text-muted"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setBpAutoCount((n) => Math.max(1, n - 1))}
                      className="w-7 h-7 rounded-lg border border-dark-border text-text text-sm hover:border-violet/40 transition-colors"
                    >−</button>
                    <span className="w-6 text-center text-sm font-semibold text-text">{bpAutoCount}</span>
                    <button
                      type="button"
                      onClick={() => setBpAutoCount((n) => Math.min(contractsData.length, n + 1))}
                      className="w-7 h-7 rounded-lg border border-dark-border text-text text-sm hover:border-violet/40 transition-colors"
                    >+</button>
                    <button
                      type="button"
                      onClick={autoSelectBPs}
                      className="ml-1 w-7 h-7 rounded-lg border border-violet/30 text-violet-light text-sm hover:bg-violet/10 transition-colors"
                      title="Auto-seleccionar"
                    >↺</button>
                  </div>
                </div>

                {/* Scrollable list */}
                <div className="overflow-y-auto flex-1 p-3 space-y-1.5">
                  {contractsData
                    .filter((c) => c.displayName.toLowerCase().includes(bpSearch.toLowerCase()))
                    .sort((a: { displayName: string }, b: { displayName: string }) => b.displayName.localeCompare(a.displayName))
                    .map((contract) => {
                      const label = (contract.displayName as string).replace(/^Battlepass\s*\/\/\s*/i, "");
                      const sel = bpSelections.find((s) => s.uuid === contract.uuid);
                      const isSelected = !!sel;
                      return (
                        <div
                          key={contract.uuid}
                          className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ${
                            isSelected
                              ? "border-violet/40 bg-violet/5"
                              : "border-dark-border bg-dark hover:border-violet/20"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleBPSelection(contract.uuid)}
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                              isSelected ? "border-violet bg-violet" : "border-dark-border"
                            }`}
                          >
                            {isSelected && <span className="text-white text-xs leading-none">✓</span>}
                          </button>
                          <p
                            className="flex-1 text-sm font-medium text-text cursor-pointer"
                            onClick={() => toggleBPSelection(contract.uuid)}
                          >
                            {label}
                          </p>
                          {isSelected && (
                            <div className="flex items-center gap-1 shrink-0">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={sel.pct}
                                onChange={(e) => setBPPct(contract.uuid, Number(e.target.value) || 0)}
                                className="w-10 px-1 py-0.5 rounded-lg bg-dark border border-dark-border text-sm text-text text-center focus:outline-none focus:border-violet/50"
                              />
                              <span className="text-xs text-muted">%</span>
                              <button
                                type="button"
                                onClick={() => setBPPct(contract.uuid, 100)}
                                className="px-1.5 py-0.5 rounded text-xs font-semibold text-violet-light hover:bg-violet/20 transition-colors"
                                title="100%"
                              >TODO</button>
                              <button
                                type="button"
                                onClick={() => setBPPct(contract.uuid, Math.round(15 + Math.random() * 85))}
                                className="text-muted hover:text-violet-light transition-colors text-xs ml-0.5"
                                title="Randomizar %"
                              >↺</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-dark-border flex gap-2">
                  {bpSelections.length > 0 && (
                    <button
                      type="button"
                      onClick={randomizeAllBPPcts}
                      className="px-3 py-2 rounded-xl border border-violet/30 text-violet-light text-xs hover:bg-violet/10 transition-colors whitespace-nowrap"
                    >
                      ↺ Rand. %
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleConfirmBPs}
                    disabled={bpSelections.length === 0}
                    className="flex-1 py-2 rounded-xl bg-violet hover:bg-violet/90 disabled:opacity-40 text-white font-semibold text-sm transition-all"
                  >
                    Confirmar ({bpSelections.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => { setBpRandomizeMode(false); setBpSelections([]); }}
                    className="px-3 py-2 rounded-xl border border-dark-border text-muted hover:text-text text-sm transition-colors"
                  >
                    Volver
                  </button>
                </div>
              </div>

            ) : (
              /* ── Vista lista ── */
              <>
                <div className="px-5 py-3 border-b border-dark-border flex gap-2">
                  <input
                    type="text"
                    value={bpSearch}
                    onChange={(e) => setBpSearch(e.target.value)}
                    placeholder="Buscar episodio o acto..."
                    className="flex-1 px-3 py-2 rounded-lg bg-dark border border-dark-border text-text text-sm focus:outline-none focus:border-violet/50 placeholder:text-muted"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => { setBpRandomizeMode(true); setBpSelections([]); autoSelectBPs(); }}
                    className="px-3.5 py-2 rounded-lg border border-violet/30 text-violet-light text-sm hover:bg-violet/10 transition-colors whitespace-nowrap"
                  >
                    Randomizar
                  </button>
                </div>

                <div className="overflow-y-auto flex-1 p-3 space-y-1.5">
                  {contractsData
                    .filter((c) => c.displayName.toLowerCase().includes(bpSearch.toLowerCase()))
                    .sort((a: { displayName: string }, b: { displayName: string }) => b.displayName.localeCompare(a.displayName))
                    .map((contract) => {
                      let skinCount = 0;
                      for (const ch of contract.content?.chapters ?? []) {
                        for (const lvl of ch.levels ?? []) if (lvl.reward?.type === "EquippableSkinLevel") skinCount++;
                        for (const r of ch.freeRewards ?? []) if (r.type === "EquippableSkinLevel") skinCount++;
                      }
                      const label = (contract.displayName as string).replace(/^Battlepass\s*\/\/\s*/i, "");
                      return (
                        <button
                          key={contract.uuid}
                          type="button"
                          onClick={() => { setSelectedBP(contract); setBpProgress(100); }}
                          className="w-full flex items-center justify-between gap-3 rounded-xl border border-dark-border bg-dark hover:border-violet/40 hover:bg-violet/5 px-4 py-3 text-left transition-all"
                        >
                          <p className="text-sm font-medium text-text">{label}</p>
                          <span className="text-xs text-muted shrink-0">{skinCount} skins</span>
                        </button>
                      );
                    })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── Bundle Picker Modal ─────────────────────────────────────────────────── */}
      {showBundlePicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-dark/80 backdrop-blur-sm"
            onClick={() => { setShowBundlePicker(false); setSelectedBundle(null); }}
          />
          <div className="relative w-full max-w-3xl max-h-[85vh] rounded-2xl border border-dark-border bg-dark-card flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-dark-border">
              <div className="flex items-center gap-2">
                {selectedBundle && (
                  <button
                    type="button"
                    onClick={() => setSelectedBundle(null)}
                    className="text-muted hover:text-text transition-colors text-sm mr-1"
                  >←</button>
                )}
                <div>
                  <h3 className="font-semibold text-text">
                    {selectedBundle ? getBundleDisplayName(selectedBundle.uuid, selectedBundle.displayName as string) : "Skins de Bundle"}
                  </h3>
                  {!selectedBundle && (
                    <p className="text-xs text-muted mt-0.5">Elegí un bundle para agregar sus skins</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => { setShowBundlePicker(false); setSelectedBundle(null); }}
                className="text-muted hover:text-text transition-colors"
              >✕</button>
            </div>

            {bundleLoading ? (
              <div className="flex-1 flex items-center justify-center text-muted text-sm py-16">
                Cargando bundles...
              </div>

            ) : selectedBundle ? (
              /* ── Vista detalle del bundle ── */
              (() => {
                const { skins: bundleSkins, buddies: bundleBuddies, sprays: bundleSprays, cards: bundleCards, flex: bundleFlex, titles: bundleTitles } = getBundleItems(selectedBundle);
                const existingSkinNames = new Set(form.skins.map((s) => s.displayName));
                const existingBuddyNames = new Set(form.buddies.map((b) => b.displayName));
                const existingSprayNames = new Set(form.sprays.map((s) => s.displayName));
                const existingCardNames = new Set(form.cards.map((c) => c.displayName));
                const existingFlexNames = new Set(form.flex.map((f) => f.displayName));
                const existingTitleNames = new Set(form.titles.map((t) => t.displayName));
                const bundleReleaseDate = getBundleDate(selectedBundle.displayName, selectedBundle.uuid);
                const selectedCount = bundleSelection.size;
                const selectedVP = bundleSkins
                  .filter((s) => bundleSelection.has(`skin:${s.uuid}`))
                  .reduce((acc, s) => acc + (s.vpCost ?? 0), 0);

                const toggle = (key: string) =>
                  setBundleSelection((prev) => {
                    const next = new Set(prev);
                    next.has(key) ? next.delete(key) : next.add(key);
                    return next;
                  });

                const itemRowClass = (selected: boolean, alreadyIn: boolean) =>
                  `w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${
                    alreadyIn
                      ? "border-dark-border opacity-40 cursor-default"
                      : selected
                        ? "border-violet/50 bg-violet/5 hover:bg-violet/10 cursor-pointer"
                        : "border-dark-border bg-dark hover:border-dark-border/60 cursor-pointer"
                  }`;

                const SelectDot = ({ selected }: { selected: boolean }) => (
                  <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${selected ? "border-violet bg-violet" : "border-dark-border"}`}>
                    {selected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                );

                return (
                  <div className="flex flex-col flex-1 overflow-hidden">
                    {/* Banner */}
                    {(selectedBundle.displayIcon2 ?? selectedBundle.displayIcon) && (
                      <div className="relative w-full h-28 bg-dark-hover overflow-hidden shrink-0">
                        <Image
                          src={selectedBundle.displayIcon2 ?? selectedBundle.displayIcon}
                          alt={getBundleDisplayName(selectedBundle.uuid, selectedBundle.displayName)}
                          fill sizes="(max-width: 768px) 100vw, 768px"
                          className="object-cover object-center" unoptimized
                        />
                      </div>
                    )}

                    <div className="overflow-y-auto flex-1 p-3 space-y-2">
                      {/* Skins */}
                      {bundleSkins.length > 0 && (
                        <div>
                          <div className="space-y-1">
                            {[...bundleSkins].sort((a, b) => (b.vpCost ?? 0) - (a.vpCost ?? 0)).map((skin) => {
                              const alreadyIn = existingSkinNames.has(skin.displayName);
                              const key = `skin:${skin.uuid}`;
                              const selected = bundleSelection.has(key);
                              return (
                                <button key={skin.uuid} type="button" disabled={alreadyIn} onClick={() => toggle(key)} className={itemRowClass(selected, alreadyIn)}>
                                  {skin.displayIcon && (
                                    <div className="relative w-16 h-9 shrink-0">
                                      <Image src={skin.displayIcon} alt={skin.displayName} fill sizes="64px" className="object-contain" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-text truncate">{skin.displayName}</p>
                                    {skin.vpCost != null && <p className="text-xs text-muted">{skin.vpCost.toLocaleString()} VP</p>}
                                  </div>
                                  {alreadyIn ? <span className="text-xs text-muted shrink-0">ya agregada</span> : <SelectDot selected={selected} />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Buddies */}
                      {bundleBuddies.length > 0 && (
                        <div>
                          <div className="space-y-1">
                            {bundleBuddies.map((buddy) => {
                              const alreadyIn = existingBuddyNames.has(buddy.displayName);
                              const key = `buddy:${buddy.uuid}`;
                              const selected = bundleSelection.has(key);
                              return (
                                <button key={buddy.uuid} type="button" disabled={alreadyIn} onClick={() => toggle(key)} className={itemRowClass(selected, alreadyIn)}>
                                  <div className="relative w-9 h-9 shrink-0 rounded-lg bg-dark-hover overflow-hidden">
                                    {buddy.displayIcon && <Image src={buddy.displayIcon} alt={buddy.displayName} fill sizes="36px" className="object-contain p-0.5" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-text truncate">{buddy.displayName}</p>
                                    <p className="text-xs text-muted">Buddy</p>
                                  </div>
                                  {alreadyIn ? <span className="text-xs text-muted shrink-0">ya agregado</span> : <SelectDot selected={selected} />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Sprays */}
                      {bundleSprays.length > 0 && (
                        <div>
                          <div className="space-y-1">
                            {bundleSprays.map((spray) => {
                              const alreadyIn = existingSprayNames.has(spray.displayName);
                              const key = `spray:${spray.uuid}`;
                              const selected = bundleSelection.has(key);
                              return (
                                <button key={spray.uuid} type="button" disabled={alreadyIn} onClick={() => toggle(key)} className={itemRowClass(selected, alreadyIn)}>
                                  <div className="relative w-9 h-9 shrink-0 rounded-lg bg-dark-hover overflow-hidden">
                                    {(spray.animationGif ?? spray.displayIcon) && (
                                      <Image src={spray.animationGif ?? spray.displayIcon} alt={spray.displayName} fill sizes="36px" className="object-contain p-0.5" unoptimized={!!spray.animationGif} />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-text truncate">{spray.displayName}</p>
                                    <p className="text-xs text-muted">Spray</p>
                                  </div>
                                  {alreadyIn ? <span className="text-xs text-muted shrink-0">ya agregado</span> : <SelectDot selected={selected} />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Player Cards */}
                      {bundleCards.length > 0 && (
                        <div>
                          <div className="space-y-1">
                            {bundleCards.map((card) => {
                              const alreadyIn = existingCardNames.has(card.displayName);
                              const key = `card:${card.uuid}`;
                              const selected = bundleSelection.has(key);
                              return (
                                <button key={card.uuid} type="button" disabled={alreadyIn} onClick={() => toggle(key)} className={itemRowClass(selected, alreadyIn)}>
                                  <div className="relative w-7 h-10 shrink-0 rounded overflow-hidden bg-dark-hover">
                                    {(card.smallArt ?? card.largeArt) && (
                                      <Image src={card.smallArt ?? card.largeArt!} alt={card.displayName} fill sizes="28px" className="object-cover" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-text truncate">{card.displayName}</p>
                                    <p className="text-xs text-muted">Player Card</p>
                                  </div>
                                  {alreadyIn ? <span className="text-xs text-muted shrink-0">ya agregada</span> : <SelectDot selected={selected} />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Flex */}
                      {bundleFlex.length > 0 && (
                        <div>
                          <div className="space-y-1">
                            {bundleFlex.map((item) => {
                              const alreadyIn = existingFlexNames.has(item.displayName);
                              const key = `flex:${item.uuid}`;
                              const selected = bundleSelection.has(key);
                              return (
                                <button key={item.uuid} type="button" disabled={alreadyIn} onClick={() => toggle(key)} className={itemRowClass(selected, alreadyIn)}>
                                  <div className="relative w-9 h-9 shrink-0 rounded-lg bg-dark-hover overflow-hidden">
                                    {item.displayIcon && <Image src={item.displayIcon} alt={item.displayName} fill sizes="36px" className="object-contain p-0.5" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-text truncate">{item.displayName}</p>
                                    <p className="text-xs text-muted">Flex</p>
                                  </div>
                                  {alreadyIn ? <span className="text-xs text-muted shrink-0">ya agregado</span> : <SelectDot selected={selected} />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Titles */}
                      {bundleTitles.length > 0 && (
                        <div>
                          <div className="space-y-1">
                            {bundleTitles.map((title) => {
                              const alreadyIn = existingTitleNames.has(title.displayName);
                              const key = `title:${title.uuid}`;
                              const selected = bundleSelection.has(key);
                              return (
                                <button key={title.uuid} type="button" disabled={alreadyIn} onClick={() => toggle(key)} className={itemRowClass(selected, alreadyIn)}>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-text truncate">{title.displayName}</p>
                                    {title.titleText && <p className="text-xs text-muted italic">&ldquo;{title.titleText}&rdquo;</p>}
                                  </div>
                                  {alreadyIn ? <span className="text-xs text-muted shrink-0">ya agregado</span> : <SelectDot selected={selected} />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {bundleSkins.length === 0 && bundleBuddies.length === 0 && bundleSprays.length === 0 && bundleCards.length === 0 && bundleFlex.length === 0 && bundleTitles.length === 0 && (
                        <p className="text-sm text-muted text-center py-8">No se encontraron ítems para este bundle.</p>
                      )}
                    </div>

                    <div className="px-4 py-3 border-t border-dark-border flex items-center gap-3">
                      <div className="shrink-0 flex flex-col gap-0.5">
                        {bundleReleaseDate && (
                          <p className="text-[10px] text-muted">{formatBundleDate(bundleReleaseDate)}</p>
                        )}
                        {selectedVP > 0 && (
                          <p className="text-sm font-bold text-violet-light">{selectedVP.toLocaleString()} VP</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={confirmAddBundle}
                        disabled={selectedCount === 0}
                        className="flex-1 py-2.5 rounded-xl bg-violet hover:bg-violet/90 disabled:opacity-40 text-white font-semibold text-sm transition-all"
                      >
                        Agregar {selectedCount} ítem{selectedCount !== 1 ? "s" : ""}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSelectedBundle(null); setBundleSelection(new Set()); }}
                        className="px-4 py-2.5 rounded-xl border border-dark-border text-muted hover:text-text text-sm transition-colors"
                      >
                        Volver
                      </button>
                    </div>
                  </div>
                );
              })()

            ) : (
              /* ── Vista lista de bundles: grid 3 columnas ── */
              (() => {
                // Pre-compute once: avoids calling getBundleItems twice per bundle
                const allProcessed = bundlesData.map((bundle) => {
                  const label = getBundleDisplayName(bundle.uuid, bundle.displayName);
                  const { skins, buddies, sprays, cards, flex, titles } = getBundleItems(bundle);
                  const totalItems = skins.length + buddies.length + sprays.length + cards.length + flex.length + titles.length;
                  const totalVP = skins.reduce((s, sk) => s + (sk.vpCost ?? 0), 0);
                  const releaseDate = getBundleDate(bundle.displayName, bundle.uuid);
                  const year = releaseDate ? releaseDate.split("-")[0] : null;
                  return { bundle, label, skins, totalItems, totalVP, releaseDate, year };
                }).filter(({ totalItems }) => totalItems > 0);

                const availableYears = [...new Set(allProcessed.map((p) => p.year).filter(Boolean) as string[])].sort().reverse();

                const filtered = allProcessed
                  .filter(({ label, totalVP, totalItems, year }) => {
                    if (!label.toLowerCase().includes(bundleSearch.toLowerCase())) return false;
                    if (bundleVPFilter === "<5000" && totalVP >= 5000) return false;
                    if (bundleVPFilter === "5000-10000" && (totalVP < 5000 || totalVP >= 10000)) return false;
                    if (bundleVPFilter === "10000+" && totalVP < 10000) return false;
                    if (bundleYearFilter && year !== bundleYearFilter) return false;
                    if (bundleItemsFilter === "<6" && totalItems >= 6) return false;
                    if (bundleItemsFilter === "6-10" && (totalItems < 6 || totalItems > 10)) return false;
                    if (bundleItemsFilter === "10+" && totalItems <= 10) return false;
                    return true;
                  })
                  .sort((a, b) => {
                    if (bundleSortOrder === "az") return a.label.localeCompare(b.label);
                    const da = a.releaseDate ?? "";
                    const db = b.releaseDate ?? "";
                    if (!da && !db) return 0;
                    if (!da) return 1;
                    if (!db) return -1;
                    return bundleSortOrder === "newest"
                      ? db.localeCompare(da)
                      : da.localeCompare(db);
                  });

                const selectClass = (active: boolean) =>
                  `bg-dark-card border rounded-lg text-xs px-2.5 py-1.5 focus:outline-none cursor-pointer transition-colors appearance-none ${
                    active
                      ? "border-violet/50 text-violet-light"
                      : "border-dark-border text-muted hover:border-dark-border/60"
                  }`;

                return (
                  <>
                    <div className="px-4 pt-3 pb-3 border-b border-dark-border space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={bundleSearch}
                          onChange={(e) => setBundleSearch(e.target.value)}
                          placeholder="Buscar bundle..."
                          className="flex-1 px-3 py-1.5 rounded-lg bg-dark-card border border-dark-border text-text text-sm focus:outline-none focus:border-violet/50 placeholder:text-muted min-w-0"
                          autoFocus
                        />
                        <select
                          value={bundleSortOrder}
                          onChange={(e) => setBundleSortOrder(e.target.value as "newest" | "oldest" | "az")}
                          className={selectClass(false) + " shrink-0"}
                        >
                          <option value="newest">↓ Más reciente</option>
                          <option value="oldest">↑ Más antiguo</option>
                          <option value="az">A → Z</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={bundleVPFilter}
                          onChange={(e) => setBundleVPFilter(e.target.value)}
                          className={selectClass(!!bundleVPFilter) + " flex-1"}
                        >
                          <option value="">VP: Todos</option>
                          <option value="<5000">VP &lt; 5k</option>
                          <option value="5000-10000">VP 5k – 10k</option>
                          <option value="10000+">VP 10k+</option>
                        </select>
                        <select
                          value={bundleYearFilter}
                          onChange={(e) => setBundleYearFilter(e.target.value)}
                          className={selectClass(!!bundleYearFilter) + " flex-1"}
                        >
                          <option value="">Año: Todos</option>
                          {availableYears.map((yr) => (
                            <option key={yr} value={yr}>{yr}</option>
                          ))}
                        </select>
                        <select
                          value={bundleItemsFilter}
                          onChange={(e) => setBundleItemsFilter(e.target.value)}
                          className={selectClass(!!bundleItemsFilter) + " flex-1"}
                        >
                          <option value="">Ítems: Todos</option>
                          <option value="<6">&lt; 6 ítems</option>
                          <option value="6-10">6 – 10 ítems</option>
                          <option value="10+">10+ ítems</option>
                        </select>
                      </div>
                    </div>

                    <div className="overflow-y-auto flex-1 p-4">
                      {filtered.length === 0 ? (
                        <p className="text-sm text-muted text-center py-12">Sin resultados para estos filtros.</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-3">
                          {filtered.map(({ bundle, label: bundleLabel, skins, totalItems, totalVP, releaseDate }) => {
                            const banner = bundle.displayIcon2 ?? bundle.displayIcon;
                            return (
                              <button
                                key={bundle.uuid}
                                type="button"
                                onClick={() => {
                                  const { skins: bs, buddies: bb, sprays: bsp, cards: bc, flex: bf, titles: bt } = getBundleItems(bundle);
                                  const exSkins = new Set(form.skins.map((s) => s.displayName));
                                  const exBuddies = new Set(form.buddies.map((b) => b.displayName));
                                  const exSprays = new Set(form.sprays.map((s) => s.displayName));
                                  const exCards = new Set(form.cards.map((c) => c.displayName));
                                  const exFlex = new Set(form.flex.map((f) => f.displayName));
                                  const exTitles = new Set(form.titles.map((t) => t.displayName));
                                  const init = new Set<string>();
                                  bs.filter((s) => !exSkins.has(s.displayName)).forEach((s) => init.add(`skin:${s.uuid}`));
                                  bb.filter((b) => !exBuddies.has(b.displayName)).forEach((b) => init.add(`buddy:${b.uuid}`));
                                  bsp.filter((s) => !exSprays.has(s.displayName)).forEach((s) => init.add(`spray:${s.uuid}`));
                                  bc.filter((c) => !exCards.has(c.displayName)).forEach((c) => init.add(`card:${c.uuid}`));
                                  bf.filter((f) => !exFlex.has(f.displayName)).forEach((f) => init.add(`flex:${f.uuid}`));
                                  bt.filter((t) => !exTitles.has(t.displayName)).forEach((t) => init.add(`title:${t.uuid}`));
                                  setBundleSelection(init);
                                  setSelectedBundle(bundle);
                                }}
                                className="flex flex-col rounded-xl border border-dark-border bg-dark hover:border-violet/40 hover:bg-violet/5 overflow-hidden text-left transition-all group"
                              >
                                <div className="relative w-full bg-dark-hover overflow-hidden" style={{ aspectRatio: "2 / 1" }}>
                                  {banner ? (
                                    <Image src={banner} alt={bundleLabel} fill sizes="(max-width: 640px) 90vw, 245px" className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized />
                                  ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-muted text-xs">{bundleLabel[0]}</div>
                                  )}
                                </div>
                                <div className="p-2.5 flex flex-col gap-1">
                                  <p className="text-sm font-semibold text-text leading-tight line-clamp-1">{bundleLabel}</p>
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-xs text-muted">
                                      {totalItems} ítem{totalItems !== 1 ? "s" : ""}
                                      <span className="text-dark-border mx-1">·</span>
                                      {skins.length} skin{skins.length !== 1 ? "s" : ""}
                                    </span>
                                    {totalVP > 0 && <span className="text-[11px] font-semibold text-violet-light shrink-0">{totalVP.toLocaleString()} VP</span>}
                                  </div>
                                  {releaseDate && <p className="text-[10px] text-muted">{formatBundleDate(releaseDate, true)}</p>}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                );
              })()
            )}
          </div>
        </div>
      )}

    </>
  );
}
