import Link from "next/link";
import { getFeaturedAccounts, getVPPackages } from "@/lib/data";
import AccountCard from "@/components/catalog/AccountCard";
import VPPackageCard from "@/components/catalog/VPPackageCard";

export default function HomePage() {
  const featured = getFeaturedAccounts().slice(0, 3);
  const vpPackages = getVPPackages().filter((p) => p.popular);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(124,58,237,0.15),transparent)]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-28 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet/20 bg-violet/5 text-violet-light text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-light animate-pulse" />
            Cuentas disponibles ahora
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            <span className="gradient-text">ValoShop</span>
          </h1>

          <p className="text-muted-light text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            El catálogo más completo de cuentas de Valorant. Encontrá la cuenta
            perfecta con los skins que siempre quisiste.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/accounts"
              className="px-8 py-3.5 rounded-xl bg-violet hover:bg-violet/90 text-white font-semibold text-sm transition-all hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] active:scale-95"
            >
              Ver cuentas
            </Link>
            <Link
              href="/vp"
              className="px-8 py-3.5 rounded-xl border border-dark-border bg-dark-card hover:border-violet/30 hover:bg-dark-hover text-text font-semibold text-sm transition-all active:scale-95"
            >
              Valorant Points
            </Link>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-dark-border bg-dark-card/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-text">100%</p>
              <p className="text-muted text-sm mt-0.5">Seguro</p>
            </div>
            <div>
              <p className="text-2xl font-bold gradient-text">24/7</p>
              <p className="text-muted text-sm mt-0.5">Disponible</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-text">Inmediato</p>
              <p className="text-muted text-sm mt-0.5">Entrega</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured accounts */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-2xl font-bold text-text">Cuentas destacadas</h2>
            <p className="text-muted text-sm mt-1">
              Las mejores cuentas del catálogo
            </p>
          </div>
          <Link
            href="/accounts"
            className="text-violet-light text-sm font-medium hover:underline underline-offset-2"
          >
            Ver todas →
          </Link>
        </div>

        {featured.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featured.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dark-border bg-dark-card p-16 text-center">
            <p className="text-muted">Próximamente nuevas cuentas</p>
          </div>
        )}
      </section>

      {/* VP section */}
      <section className="border-t border-dark-border bg-dark-card/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl font-bold text-text">Valorant Points</h2>
              <p className="text-muted text-sm mt-1">
                Recargá tu cuenta al mejor precio
              </p>
            </div>
            <Link
              href="/vp"
              className="text-violet-light text-sm font-medium hover:underline underline-offset-2"
            >
              Ver todos →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {vpPackages.map((pkg) => (
              <VPPackageCard key={pkg.id} pkg={pkg} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
