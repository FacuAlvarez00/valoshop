import type { Metadata } from "next";
import { getAccounts } from "@/lib/data";
import AccountCard from "@/components/catalog/AccountCard";

export const metadata: Metadata = {
  title: "Cuentas",
  description: "Catálogo completo de cuentas de Valorant disponibles.",
};

const REGIONS = ["Todas", "NA", "LATAM", "EU", "AP", "BR", "KR"];

export default function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string; status?: string }>;
}) {
  // Next.js 15+ searchParams is async — use sync fallback for server components
  const accounts = getAccounts();

  const available = accounts.filter((a) => a.status === "available").length;
  const sold = accounts.filter((a) => a.status === "sold").length;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-text">Cuentas</h1>
        <p className="text-muted mt-1 text-sm">
          {available} disponibles · {sold} vendidas
        </p>
      </div>

      {/* Grid */}
      {accounts.length === 0 ? (
        <div className="rounded-2xl border border-dark-border bg-dark-card p-24 text-center">
          <p className="text-muted text-lg font-medium mb-2">
            Sin cuentas aún
          </p>
          <p className="text-muted text-sm">
            Las cuentas aparecerán aquí una vez que se carguen desde el panel de
            admin.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {accounts.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
        </div>
      )}
    </div>
  );
}
