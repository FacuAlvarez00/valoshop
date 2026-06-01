import type { VPPackage } from "@/types";

interface Props {
  pkg: VPPackage;
  onContact?: () => void;
}

export default function VPPackageCard({ pkg }: Props) {
  const totalVP = pkg.amount + pkg.bonus;

  return (
    <div
      className={`card-shine relative rounded-2xl border bg-dark-card overflow-hidden transition-all duration-300 hover:-translate-y-0.5 ${
        pkg.popular
          ? "border-violet/50 shadow-[0_0_20px_rgba(124,58,237,0.2)]"
          : "border-dark-border hover:border-violet/30"
      }`}
    >
      {pkg.popular && (
        <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-violet via-violet-light to-cyan" />
      )}

      {pkg.popular && (
        <div className="absolute top-3 right-3">
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-violet/20 text-violet-light border border-violet/30">
            Popular
          </span>
        </div>
      )}

      <div className="p-6 flex flex-col items-center gap-4 text-center">
        {/* VP Icon */}
        <div className="w-16 h-16 rounded-2xl bg-[#1a1030] border border-violet/20 flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            className="w-9 h-9 text-violet-light"
            fill="currentColor"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>

        <div>
          <p className="text-3xl font-bold text-text">
            {totalVP.toLocaleString()}
          </p>
          <p className="text-sm text-muted mt-0.5">Valorant Points</p>
          {pkg.bonus > 0 && (
            <p className="text-xs text-rarity-deluxe mt-1 font-medium">
              +{pkg.bonus} de bonus
            </p>
          )}
        </div>

        <div className="w-full pt-2 border-t border-dark-border">
          <p className="text-2xl font-bold text-text">
            {pkg.currency}{" "}
            {pkg.price.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
