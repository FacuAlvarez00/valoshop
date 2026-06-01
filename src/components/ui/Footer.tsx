import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-dark-border bg-dark-card mt-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <span className="text-lg font-bold gradient-text">ValoShop</span>
            <p className="text-muted text-sm mt-1">
              Catálogo de cuentas de Valorant
            </p>
          </div>

          <nav className="flex items-center gap-6 text-sm text-muted">
            <Link href="/accounts" className="hover:text-text transition-colors">
              Cuentas
            </Link>
            <Link href="/vp" className="hover:text-text transition-colors">
              Valorant Points
            </Link>
          </nav>
        </div>

        <div className="mt-8 pt-6 border-t border-dark-border text-center text-xs text-muted">
          ValoShop no está afiliado con Riot Games ni Valorant. Todos los
          contenidos de Valorant son propiedad de Riot Games.
        </div>
      </div>
    </footer>
  );
}
