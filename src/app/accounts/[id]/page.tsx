import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getAccountById, getAccounts } from "@/lib/data";
import AccountTabs from "@/components/account/AccountTabs";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return getAccounts().map((a) => ({ id: a.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const account = getAccountById(id);
  if (!account) return {};
  return {
    title: account.title,
    description: `Cuenta de Valorant: ${account.title} — ${account.skins.length} skins`,
  };
}

const RANK_COLORS: Record<string, string> = {
  Unranked:  "#8080a0",
  Iron:      "#8a8a9a",
  Bronze:    "#a07048",
  Silver:    "#a0a8b8",
  Gold:      "#d4a020",
  Platinum:  "#40b8c8",
  Diamond:   "#8050d8",
  Ascendant: "#30c060",
  Immortal:  "#c82828",
  Radiant:   "#f0c830",
};

function getRankColor(rank?: string): string {
  if (!rank) return "#8080a0";
  const tier = rank.split(" ")[0];
  return RANK_COLORS[tier] ?? "#8080a0";
}

export default async function AccountDetailPage({ params }: Props) {
  const { id } = await params;
  const account = getAccountById(id);
  if (!account) notFound();

  const isAvailable = account.status === "available";
  const skinsVP   = account.skins.reduce((sum, s) => sum + (s.vpCost ?? 0), 0);
  const bpVP      = (account.battlePassCount ?? 0) * 1000;
  const totalVP   = skinsVP + bpVP;

  const statRows = [
    { label: "Región",   value: account.region },
    { label: "Rank",     value: account.rank || "Unranked",
      color: getRankColor(account.rank) },
    { label: "Skins",    value: `${account.skins.length} skins` },
    ...(account.buddies.length > 0
      ? [{ label: "Gun Buddies", value: `${account.buddies.length}` }]
      : []),
    ...(account.sprays.length > 0
      ? [{ label: "Sprays", value: `${account.sprays.length}` }]
      : []),
    ...(account.agents.length > 0
      ? [{ label: "Agentes", value: `${account.agents.length}` }]
      : []),
    ...(totalVP > 0
      ? [{ label: "VP gastados", value: `${totalVP.toLocaleString()} VP`, color: "#a78bfa" }]
      : []),
    ...((account.battlePassCount ?? 0) > 0
      ? [{ label: "Battle Passes", value: `${account.battlePassCount}` }]
      : []),
  ] as { label: string; value: string; color?: string }[];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">

      {/* Back */}
      <Link
        href="/accounts"
        className="inline-flex items-center gap-1.5 text-muted text-sm hover:text-text transition-colors mb-6"
      >
        ← Catálogo
      </Link>

      {/* Title + status — full width above columns */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
              isAvailable
                ? "bg-rarity-deluxe/10 text-rarity-deluxe border-rarity-deluxe/30"
                : "bg-dark-hover text-muted border-dark-border"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? "bg-rarity-deluxe" : "bg-muted"}`} />
            {isAvailable ? "Disponible" : "Vendida"}
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-text leading-snug">
          {account.title}
        </h1>
        {account.description && (
          <p className="text-muted text-sm mt-1.5 leading-relaxed">{account.description}</p>
        )}
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* ── Left: tabs ── */}
        <div className="flex-1 min-w-0">
          <div className="rounded-sm border border-dark-border bg-dark-card p-4 sm:p-6">
            <AccountTabs account={account} />
          </div>
        </div>

        {/* ── Right: sticky sidebar ── */}
        <div className="w-full lg:w-72 shrink-0 lg:sticky lg:top-6 space-y-3">

          {/* Price card */}
          <div className="rounded-sm border border-dark-border bg-dark-card p-5">
            <p className="text-3xl font-extrabold text-text tracking-tight">
              {account.currency} {account.price.toLocaleString()}
            </p>

            {/* Stat rows */}
            <div className="mt-5 space-y-0 divide-y divide-dark-border">
              {statRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between py-2.5">
                  <span className="text-sm text-muted">{row.label}</span>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: row.color ?? "var(--color-text)" }}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            {/* CTA */}
            {isAvailable ? (
              <a
                href="#contacto"
                className="mt-5 block w-full py-3 rounded-sm font-extrabold text-sm text-center transition-all active:scale-95"
                style={{ background: "#e8b923", color: "#000" }}
              >
                Consultar precio
              </a>
            ) : (
              <div
                className="mt-5 w-full py-3 rounded-sm text-sm text-center font-semibold"
                style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)" }}
              >
                Cuenta vendida
              </div>
            )}
          </div>

          {/* Trust badges */}
          <div className="rounded-sm border border-dark-border bg-dark-card px-4 py-3 space-y-2.5">
            {[
              { icon: "🛡️", title: "Garantía incluida",   sub: "Soporte post-venta" },
              { icon: "⚡", title: "Entrega inmediata",    sub: "Acceso al instante" },
              { icon: "💬", title: "Atención 24/7",        sub: "Siempre disponibles" },
            ].map((b) => (
              <div key={b.title} className="flex items-start gap-2.5">
                <span className="text-base mt-0.5">{b.icon}</span>
                <div>
                  <p className="text-xs font-semibold text-text">{b.title}</p>
                  <p className="text-xs text-muted">{b.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contact */}
      {isAvailable && (
        <div
          id="contacto"
          className="mt-8 rounded-sm border border-violet/20 bg-violet/5 p-6 sm:p-8 text-center"
        >
          <h2 className="text-xl font-bold text-text mb-2">¿Te interesa esta cuenta?</h2>
          <p className="text-muted text-sm mb-4">
            Contactanos para más información y coordinar la compra.
          </p>
          <p className="text-muted text-sm">Próximamente información de contacto disponible.</p>
        </div>
      )}
    </div>
  );
}
