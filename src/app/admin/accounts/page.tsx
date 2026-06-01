import Link from "next/link";
import { getAccounts } from "@/lib/data";
import AdminAccountRow from "@/components/admin/AdminAccountRow";

export default function AdminAccountsPage() {
  const accounts = getAccounts();

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text">Cuentas</h1>
          <p className="text-muted text-sm mt-1">{accounts.length} en total</p>
        </div>
        <Link
          href="/admin/accounts/new"
          className="px-4 py-2 rounded-xl bg-violet hover:bg-violet/90 text-white text-sm font-semibold transition-all"
        >
          + Nueva cuenta
        </Link>
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-2xl border border-dark-border bg-dark-card p-20 text-center">
          <p className="text-muted mb-4">Sin cuentas todavía</p>
          <Link
            href="/admin/accounts/new"
            className="px-5 py-2.5 rounded-xl bg-violet hover:bg-violet/90 text-white text-sm font-semibold transition-all"
          >
            Crear primera cuenta
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-dark-border bg-dark-card overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-dark-border text-xs text-muted uppercase tracking-widest">
            <span>Cuenta</span>
            <span>Región</span>
            <span>Precio</span>
            <span>Estado</span>
            <span>Acciones</span>
          </div>
          <div className="divide-y divide-dark-border">
            {accounts.map((account) => (
              <AdminAccountRow key={account.id} account={account} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
