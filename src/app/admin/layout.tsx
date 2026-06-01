import { redirect } from "next/navigation";
import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV !== "development") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-dark">
      {/* Admin topbar */}
      <div className="sticky top-16 z-40 border-b border-dark-border bg-[#0c0c18]/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-12 items-center gap-4">
            <span className="text-xs font-semibold uppercase tracking-widest text-violet-light">
              Admin
            </span>
            <div className="h-4 w-px bg-dark-border" />
            <nav className="flex items-center gap-1">
              <Link
                href="/admin"
                className="px-3 py-1.5 rounded-lg text-xs text-muted hover:text-text hover:bg-dark-hover transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/accounts"
                className="px-3 py-1.5 rounded-lg text-xs text-muted hover:text-text hover:bg-dark-hover transition-colors"
              >
                Cuentas
              </Link>
              <Link
                href="/admin/vp"
                className="px-3 py-1.5 rounded-lg text-xs text-muted hover:text-text hover:bg-dark-hover transition-colors"
              >
                VP Packages
              </Link>
            </nav>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {children}
      </div>
    </div>
  );
}
