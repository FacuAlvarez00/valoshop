import { getVPPackages } from "@/lib/data";

export default function AdminVPPage() {
  const packages = getVPPackages();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text">Valorant Points</h1>
        <p className="text-muted text-sm mt-1">
          Editá los paquetes directamente en{" "}
          <code className="text-violet-light">src/data/vp-packages.json</code>
        </p>
      </div>

      <div className="rounded-2xl border border-dark-border bg-dark-card overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-dark-border text-xs text-muted uppercase tracking-widest">
          <span>Paquete</span>
          <span>Bonus</span>
          <span>Precio</span>
          <span>Popular</span>
        </div>
        <div className="divide-y divide-dark-border">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-3.5"
            >
              <p className="text-sm font-medium text-text">
                {pkg.amount.toLocaleString()} VP
              </p>
              <span className="text-sm text-muted">
                {pkg.bonus > 0 ? `+${pkg.bonus}` : "—"}
              </span>
              <span className="text-sm text-text">
                {pkg.currency} {pkg.price.toFixed(2)}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  pkg.popular
                    ? "bg-violet/15 text-violet-light"
                    : "bg-dark-hover text-muted"
                }`}
              >
                {pkg.popular ? "Sí" : "No"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-dark-border bg-dark-card/50 p-5">
        <p className="text-sm text-muted">
          Para modificar los paquetes, editá el archivo{" "}
          <code className="text-violet-light bg-dark px-1.5 py-0.5 rounded text-xs">
            src/data/vp-packages.json
          </code>{" "}
          directamente.
        </p>
      </div>
    </div>
  );
}
