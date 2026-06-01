import Link from "next/link";
import Image from "next/image";
import type { ValoAccount } from "@/types";
import { rarityColor } from "@/lib/rarity";

interface Props {
  account: ValoAccount;
}

const RANK_COLORS: Record<string, string> = {
  Unranked: "#8080a0",
  Iron: "#8a8a9a",
  Bronze: "#a07048",
  Silver: "#a0a8b8",
  Gold: "#d4a020",
  Platinum: "#40b8c8",
  Diamond: "#8050d8",
  Ascendant: "#30c060",
  Immortal: "#c82828",
  Radiant: "#f0c830",
};

function getRankColor(rank?: string): string {
  if (!rank) return "#8080a0";
  const tier = rank.split(" ")[0];
  return RANK_COLORS[tier] ?? "#8080a0";
}

export default function AccountCard({ account }: Props) {
  const topSkins = account.skins.slice(0, 4);
  const extraSkins = account.skins.length - 4;

  return (
    <Link href={`/accounts/${account.id}`} className="group block">
      <article className="card-shine relative rounded-2xl border border-dark-border bg-dark-card overflow-hidden transition-all duration-300 hover:border-violet/40 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(124,58,237,0.15)]">
        {/* Status badge */}
        {account.status === "sold" && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-dark/70 backdrop-blur-sm rounded-2xl">
            <span className="px-4 py-2 rounded-full bg-dark-card border border-dark-border text-muted font-semibold text-sm tracking-widest uppercase">
              Vendida
            </span>
          </div>
        )}

        {/* Skin previews */}
        <div className="relative h-36 bg-dark-hover overflow-hidden">
          {topSkins.length > 0 ? (
            <div className="grid grid-cols-2 gap-1 h-full p-2">
              {topSkins.slice(0, 4).map((skin) => (
                <div
                  key={skin.uuid}
                  className="relative rounded-lg overflow-hidden bg-dark flex items-center justify-center"
                  style={{
                    boxShadow: `0 0 8px ${rarityColor(skin.rarity)}40`,
                    borderColor: `${rarityColor(skin.rarity)}30`,
                    borderWidth: "1px",
                  }}
                >
                  {skin.displayIcon ? (
                    <Image
                      src={skin.displayIcon}
                      alt={skin.displayName}
                      fill
                      sizes="(max-width: 640px) 45vw, 150px"
                      className="object-contain p-1"
                    />
                  ) : (
                    <span className="text-muted text-xs">{skin.weaponName}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <span className="text-muted text-sm">Sin skins cargadas</span>
            </div>
          )}

          {extraSkins > 0 && (
            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-dark/80 text-muted text-xs border border-dark-border">
              +{extraSkins} más
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-text leading-tight group-hover:text-violet-light transition-colors line-clamp-2">
              {account.title}
            </h3>
            {account.rank && (
              <span
                className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border"
                style={{
                  color: getRankColor(account.rank),
                  borderColor: `${getRankColor(account.rank)}40`,
                  backgroundColor: `${getRankColor(account.rank)}10`,
                }}
              >
                {account.rank}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-muted">
              <span>{account.region}</span>
              {account.skins.length > 0 && (
                <>
                  <span className="text-dark-border">·</span>
                  <span>{account.skins.length} skins</span>
                </>
              )}
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-text">
                {account.currency} {account.price.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
