import type { Metadata } from "next";
import { getVPPackages } from "@/lib/data";
import VPPackageCard from "@/components/catalog/VPPackageCard";

export const metadata: Metadata = {
  title: "Valorant Points",
  description: "Recargá tus Valorant Points al mejor precio.",
};

export default function VPPage() {
  const packages = getVPPackages();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-14">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet/10 border border-violet/20 mb-5">
          <svg
            viewBox="0 0 24 24"
            className="w-7 h-7 text-violet-light"
            fill="currentColor"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-text">Valorant Points</h1>
        <p className="text-muted mt-2 text-sm max-w-md mx-auto">
          Recargá tu cuenta con Valorant Points y comprá los skins que querés al
          mejor precio del mercado.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto">
        {packages.map((pkg) => (
          <VPPackageCard key={pkg.id} pkg={pkg} />
        ))}
      </div>

      {/* How it works */}
      <div className="mt-16 rounded-2xl border border-dark-border bg-dark-card p-8">
        <h2 className="text-lg font-bold text-text mb-6 text-center">
          ¿Cómo funciona?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              step: "01",
              title: "Elegí el paquete",
              desc: "Seleccioná la cantidad de VP que necesitás.",
            },
            {
              step: "02",
              title: "Contactanos",
              desc: "Coordinamos el pago y la recarga de manera segura.",
            },
            {
              step: "03",
              title: "Recibís tus VP",
              desc: "Los points aparecen en tu cuenta de manera inmediata.",
            },
          ].map(({ step, title, desc }) => (
            <div key={step} className="text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-violet/10 border border-violet/20 text-violet-light font-bold text-sm mb-3">
                {step}
              </div>
              <h3 className="font-semibold text-text text-sm mb-1">{title}</h3>
              <p className="text-muted text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
