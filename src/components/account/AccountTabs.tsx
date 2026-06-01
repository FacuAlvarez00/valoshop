"use client";

import Image from "next/image";
import { useState, useMemo, useEffect, useCallback } from "react";
import type { ValoAccount } from "@/types";
import { isHardcodedExclusive } from "@/lib/skinPrice";

const WEAPON_ORDER = [
  "Vandal", "Phantom", "Operator", "Outlaw", "Sheriff", "Ghost", "Frenzy",
  "Classic", "Shorty", "Bucky", "Judge", "Bulldog", "Guardian", "Marshal",
  "Spectre", "Stinger", "Ares", "Odin", "Melee",
];

type FetchedChroma = { uuid: string; swatch: string; streamedVideo?: string };

export default function AccountTabs({ account }: { account: ValoAccount }) {
  const tabs = [
    { id: "skins",   label: "Skins",   count: account.skins.length },
    { id: "agents",  label: "Agentes", count: account.agents.length },
    { id: "buddies", label: "Buddies", count: account.buddies.length },
    { id: "sprays",  label: "Sprays",  count: account.sprays.length },
    { id: "cards",   label: "Cards",   count: account.cards.length },
    { id: "titles",  label: "Títulos", count: account.titles.length },
    { id: "flex",    label: "Flex",    count: (account.flex ?? []).length },
  ].filter((t) => t.count > 0);

  const [active, setActive]               = useState(tabs[0]?.id ?? "skins");
  const [skinSearch, setSkinSearch]       = useState("");
  const [weaponFilter, setWeaponFilter]   = useState<string | null>(null);
  const [videoModal, setVideoModal]       = useState<string | null>(null);
  const [fetchedChromas, setFetchedChromas] = useState<Record<string, FetchedChroma[]>>({});

  // Fetch full chroma data (including streamedVideo) if any skin is missing it
  useEffect(() => {
    if (account.skins.every((s) => s.chromas)) return;
    fetch("https://valorant-api.com/v1/weapons")
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, FetchedChroma[]> = {};
        for (const weapon of data.data as any[]) {
          for (const skin of weapon.skins as any[]) {
            const chromas = ((skin.chromas as any[]) ?? [])
              .filter((c: any) => c.swatch)
              .map((c: any) => ({
                uuid: c.uuid as string,
                swatch: c.swatch as string,
                streamedVideo: (c.streamedVideo as string) || undefined,
              }));
            if (chromas.length > 0) map[skin.displayName as string] = chromas;
          }
        }
        setFetchedChromas(map);
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const closeVideo = useCallback(() => setVideoModal(null), []);

  const availableWeapons = useMemo(() => {
    const set = new Set(account.skins.map((s) => s.weaponName));
    return WEAPON_ORDER.filter((w) => set.has(w));
  }, [account.skins]);

  const filteredSkins = useMemo(() => {
    return account.skins
      .filter((s) => {
        if (weaponFilter && s.weaponName !== weaponFilter) return false;
        if (skinSearch && !s.displayName.toLowerCase().includes(skinSearch.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => (b.vpCost ?? 0) - (a.vpCost ?? 0));
  }, [account.skins, weaponFilter, skinSearch]);

  return (
    <>
      <div>
        {/* Tab bar */}
        <div className="flex gap-0.5 border-b border-dark-border overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${
                active === tab.id
                  ? "border-violet text-violet-light"
                  : "border-transparent text-muted hover:text-text"
              }`}
            >
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                active === tab.id ? "bg-violet/20 text-violet-light" : "bg-dark-hover text-muted"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="pt-6">

          {/* ── SKINS ── */}
          {active === "skins" && (
            <div>
              {/* Search + weapon chips */}
              <div className="mb-5 space-y-3">
                <input
                  type="text"
                  placeholder="Buscar skin..."
                  value={skinSearch}
                  onChange={(e) => setSkinSearch(e.target.value)}
                  className="w-full sm:w-64 px-4 py-2 rounded-xl bg-dark border border-dark-border text-sm text-text placeholder:text-muted focus:outline-none focus:border-violet/50"
                />
                {availableWeapons.length > 1 && (
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setWeaponFilter(null)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                        !weaponFilter
                          ? "border-violet/60 bg-violet/15 text-violet-light"
                          : "border-dark-border text-muted hover:border-violet/30 hover:text-text"
                      }`}
                    >
                      Todas
                    </button>
                    {availableWeapons.map((w) => (
                      <button
                        key={w}
                        onClick={() => setWeaponFilter(weaponFilter === w ? null : w)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                          weaponFilter === w
                            ? "border-violet/60 bg-violet/15 text-violet-light"
                            : "border-dark-border text-muted hover:border-violet/30 hover:text-text"
                        }`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {filteredSkins.length === 0 ? (
                <p className="text-muted text-sm">Sin resultados.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredSkins.map((skin) => {
                    const exclusive = isHardcodedExclusive(skin.displayName);
                    const rawChromas = skin.chromas ?? fetchedChromas[skin.displayName] ?? [];
                    const swatches = rawChromas.filter((c) => c.swatch);
                    return (
                      <div
                        key={skin.uuid}
                        className="rounded overflow-hidden flex flex-col cursor-default"
                        style={{
                          background: exclusive
                            ? "linear-gradient(160deg, #2c1f00 0%, #3e2b00 60%, #2c1f00 100%)"
                            : "#0f1117",
                          border: `1px solid ${exclusive ? "rgba(180,120,20,0.55)" : "rgba(255,255,255,0.07)"}`,
                          boxShadow: exclusive
                            ? "0 0 18px rgba(220,150,20,0.12)"
                            : "0 2px 8px rgba(0,0,0,0.35)",
                        }}
                      >
                        {/* Header: swatches + VP badge */}
                        <div className="flex items-center justify-between px-2.5 pt-2.5 pb-1.5 min-h-[34px] gap-2">
                          <div className="flex gap-1 flex-nowrap overflow-hidden">
                            {swatches.slice(0, 4).map((c) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                key={c.uuid}
                                src={c.swatch!}
                                alt=""
                                title={c.streamedVideo ? "Ver video" : undefined}
                                onClick={c.streamedVideo ? () => setVideoModal(c.streamedVideo!) : undefined}
                                className={`w-[22px] h-[22px] rounded-[3px] border object-cover transition-all ${
                                  c.streamedVideo
                                    ? "border-white/30 cursor-pointer hover:scale-110 hover:brightness-110 hover:border-white/60"
                                    : "border-white/15 cursor-default"
                                }`}
                              />
                            ))}
                          </div>
                          {skin.vpCost != null && (
                            <span
                              className="text-xs font-extrabold px-2.5 py-1 rounded-md shrink-0 tabular-nums"
                              style={{
                                background: exclusive ? "rgba(220,150,20,0.25)" : "#c8293a",
                                color: exclusive ? "#f0c050" : "#fff",
                                letterSpacing: "0.02em",
                              }}
                            >
                              {skin.vpCost.toLocaleString()}
                            </span>
                          )}
                        </div>

                        {/* Weapon art */}
                        <div className="relative w-full" style={{ height: "140px" }}>
                          {skin.displayIcon ? (
                            <Image
                              src={skin.displayIcon}
                              alt={skin.displayName}
                              fill
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                              className="object-contain p-3"
                            />
                          ) : (
                            <div className="h-full flex items-center justify-center">
                              <span className="text-muted text-xs">Sin imagen</span>
                            </div>
                          )}
                        </div>

                        {/* Footer */}
                        <div
                          className="px-3 py-2.5"
                          style={{ borderTop: `1px solid ${exclusive ? "rgba(180,120,20,0.25)" : "rgba(255,255,255,0.05)"}` }}
                        >
                          <p className="text-[11px] font-medium mb-0.5"
                            style={{ color: exclusive ? "rgba(220,160,50,0.7)" : "rgba(255,255,255,0.35)" }}>
                            {skin.weaponName}
                          </p>
                          <p className="text-[13px] font-semibold leading-tight line-clamp-1"
                            style={{ color: exclusive ? "#f0d080" : "#e8eaf0" }}>
                            {skin.displayName}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── AGENTS ── */}
          {active === "agents" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {account.agents.map((agent) => (
                <div
                  key={agent.uuid}
                  className="rounded-xl border border-dark-border bg-dark-card overflow-hidden hover:border-violet/30 transition-colors"
                >
                  <div className="relative h-36 bg-dark-hover">
                    {agent.fullPortrait || agent.displayIcon ? (
                      <Image
                        src={agent.fullPortrait ?? agent.displayIcon}
                        alt={agent.displayName}
                        fill
                        sizes="(max-width: 640px) 50vw, 20vw"
                        className="object-contain object-bottom"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted text-2xl font-bold">
                        {agent.displayName[0]}
                      </div>
                    )}
                  </div>
                  <div className="p-2.5 text-center">
                    <p className="text-sm font-semibold text-text truncate">{agent.displayName}</p>
                    <p className="text-xs text-muted mt-0.5">{agent.role}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── BUDDIES ── */}
          {active === "buddies" && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
              {account.buddies.map((buddy) => (
                <div
                  key={buddy.uuid}
                  className="rounded-xl border border-dark-border bg-dark-card p-2.5 flex flex-col items-center gap-2 hover:border-violet/30 transition-colors"
                >
                  <div className="relative w-14 h-14">
                    {buddy.displayIcon && (
                      <Image src={buddy.displayIcon} alt={buddy.displayName} fill sizes="56px" className="object-contain" />
                    )}
                  </div>
                  <p className="text-xs text-muted text-center line-clamp-2 leading-tight">{buddy.displayName}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── SPRAYS ── */}
          {active === "sprays" && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {account.sprays.map((spray) => (
                <div
                  key={spray.uuid}
                  className="rounded-xl border border-dark-border bg-dark-card p-3 flex flex-col items-center gap-2 hover:border-violet/30 transition-colors"
                >
                  <div className="relative w-16 h-16">
                    {(spray.animationGif ?? spray.displayIcon) && (
                      <Image
                        src={spray.animationGif ?? spray.displayIcon}
                        alt={spray.displayName}
                        fill
                        sizes="64px"
                        className="object-contain"
                        unoptimized={!!spray.animationGif}
                      />
                    )}
                  </div>
                  <p className="text-xs text-muted text-center line-clamp-2 leading-tight">{spray.displayName}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── CARDS ── */}
          {active === "cards" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {account.cards.map((card) => (
                <div
                  key={card.uuid}
                  className="rounded-xl border border-dark-border bg-dark-card overflow-hidden hover:border-violet/30 transition-colors"
                >
                  <div className="relative aspect-[2/3]">
                    {card.largeArt ?? card.smallArt ? (
                      <Image
                        src={(card.largeArt ?? card.smallArt)!}
                        alt={card.displayName}
                        fill
                        sizes="(max-width: 640px) 50vw, 20vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full bg-dark-hover flex items-center justify-center text-muted text-xs p-2 text-center">
                        {card.displayName}
                      </div>
                    )}
                  </div>
                  <div className="px-2 py-2 text-center">
                    <p className="text-xs text-muted truncate">{card.displayName}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── TITLES ── */}
          {active === "titles" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {account.titles.map((title) => (
                <div
                  key={title.uuid}
                  className="rounded-xl border border-dark-border bg-dark-card px-4 py-3 flex items-center justify-between gap-4 hover:border-violet/30 transition-colors"
                >
                  <p className="text-sm font-semibold text-text">{title.displayName}</p>
                  {title.titleText && (
                    <p className="text-xs text-muted italic shrink-0">&ldquo;{title.titleText}&rdquo;</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── FLEX ── */}
          {active === "flex" && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {(account.flex ?? []).map((item) => (
                <div
                  key={item.uuid}
                  className="rounded-xl border border-dark-border bg-dark-card p-2.5 flex flex-col items-center gap-2 hover:border-violet/30 transition-colors"
                >
                  <div className="relative w-14 h-14">
                    {item.displayIcon && (
                      <Image src={item.displayIcon} alt={item.displayName} fill sizes="56px" className="object-contain" />
                    )}
                  </div>
                  <p className="text-xs text-muted text-center line-clamp-2 leading-tight">{item.displayName}</p>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* ── Video preview modal ── */}
      {videoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.82)" }}
          onClick={closeVideo}
        >
          <div
            className="relative w-full max-w-3xl rounded-2xl overflow-hidden"
            style={{ boxShadow: "0 8px 48px rgba(0,0,0,0.7)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeVideo}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-lg transition-colors"
              style={{ background: "rgba(0,0,0,0.7)", border: "2px solid #e03045" }}
            >
              ×
            </button>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              key={videoModal}
              src={videoModal}
              autoPlay
              controls
              className="w-full block rounded-2xl"
              style={{ background: "#000", maxHeight: "80vh" }}
            />
          </div>
        </div>
      )}
    </>
  );
}
