"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ValoAccount } from "@/types";

export default function AdminAccountRow({
  account,
}: {
  account: ValoAccount;
}) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm(`¿Eliminar "${account.title}"?`)) return;
    const res = await fetch(`/api/admin/accounts/${account.id}`, {
      method: "DELETE",
    });
    if (res.ok) router.refresh();
  }

  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-5 py-3.5 hover:bg-dark-hover transition-colors">
      <div className="min-w-0">
        <p className="text-sm font-medium text-text truncate">{account.title}</p>
        <p className="text-xs text-muted mt-0.5">{account.skins.length} skins</p>
      </div>
      <span className="text-xs text-muted">{account.region}</span>
      <span className="text-sm text-text font-medium">
        {account.currency} {account.price.toLocaleString()}
      </span>
      <span
        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          account.status === "available"
            ? "bg-rarity-deluxe/10 text-rarity-deluxe"
            : "bg-dark-hover text-muted"
        }`}
      >
        {account.status === "available" ? "Disponible" : "Vendida"}
      </span>
      <div className="flex items-center gap-2">
        <Link
          href={`/admin/accounts/${account.id}`}
          className="px-3 py-1 rounded-lg text-xs border border-dark-border text-muted hover:text-text hover:border-violet/30 transition-colors"
        >
          Editar
        </Link>
        <button
          onClick={handleDelete}
          className="px-3 py-1 rounded-lg text-xs border border-dark-border text-muted hover:text-rarity-exclusive hover:border-rarity-exclusive/30 transition-colors"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}
