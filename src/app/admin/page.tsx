import Link from "next/link";
import { getAccounts, getVPPackages } from "@/lib/data";

export default function AdminDashboard() {
  const accounts = getAccounts();
  const vpPackages = getVPPackages();

  const available = accounts.filter((a) => a.status === "available").length;
  const sold = accounts.filter((a) => a.status === "sold").length;
  const featured = accounts.filter((a) => a.featured).length;

  const stats = [
    { label: "Total cuentas", value: accounts.length, href: "/admin/accounts" },
    { label: "Disponibles", value: available, href: "/admin/accounts" },
    { label: "Vendidas", value: sold, href: "/admin/accounts" },
    { label: "Destacadas", value: featured, href: "/admin/accounts" },
    { label: "Paquetes VP", value: vpPackages.length, href: "/admin/vp" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-2xl font-bold text-text">Dashboard</h1>
        <Link
          href="/admin/accounts/new"
          className="px-4 py-2 rounded-xl bg-violet hover:bg-violet/90 text-white text-sm font-semibold transition-all"
        >
          + Nueva cuenta
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
        {stats.map(({ label, value, href }) => (
          <Link
            key={label}
            href={href}
            className="rounded-2xl border border-dark-border bg-dark-card p-5 hover:border-violet/30 transition-colors"
          >
            <p className="text-3xl font-bold text-text">{value}</p>
            <p className="text-muted text-xs mt-1">{label}</p>
          </Link>
        ))}
      </div>

      <div className="rounded-2xl border border-dark-border bg-dark-card p-6">
        <h2 className="font-semibold text-text mb-4">Accesos rápidos</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/accounts/new"
            className="px-4 py-2 rounded-xl border border-dark-border bg-dark-hover hover:border-violet/30 text-sm text-text transition-colors"
          >
            Crear cuenta
          </Link>
          <Link
            href="/admin/accounts"
            className="px-4 py-2 rounded-xl border border-dark-border bg-dark-hover hover:border-violet/30 text-sm text-text transition-colors"
          >
            Gestionar cuentas
          </Link>
          <Link
            href="/"
            target="_blank"
            className="px-4 py-2 rounded-xl border border-dark-border bg-dark-hover hover:border-violet/30 text-sm text-muted transition-colors"
          >
            Ver sitio →
          </Link>
        </div>
      </div>
    </div>
  );
}
