"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Trophy, Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/validate", label: "Validador", icon: Search },
  { href: "/ranking", label: "Ranking", icon: Trophy },
  { href: "/history", label: "Historial", icon: Clock },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-60 md:shrink-0 md:border-r md:border-sidebar-border md:bg-sidebar md:px-4 md:py-6 md:gap-6">
        <BrandHeader />
        <nav className="flex flex-col gap-1">
          {links.map((link) => {
            const Icon = link.icon;
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <Icon className="size-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto text-xs text-muted-foreground">
          <p className="font-mono">v0.2.0</p>
          <p>Data-driven · Mercado Libre</p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-sidebar-border bg-sidebar/95 px-4 backdrop-blur md:hidden">
        <BrandHeader compact />
      </header>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-sidebar-border bg-sidebar/95 backdrop-blur md:hidden">
        {links.map((link) => {
          const Icon = link.icon;
          const active =
            pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-xs",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-5" />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function BrandHeader({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/validate" className="flex items-center gap-2">
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Sparkles className="size-5" />
      </div>
      {!compact && (
        <div className="flex flex-col">
          <span className="text-sm font-semibold">Drop Validator AI</span>
          <span className="text-xs text-muted-foreground">
            Validá antes de vender
          </span>
        </div>
      )}
      {compact && (
        <span className="text-sm font-semibold">Drop Validator AI</span>
      )}
    </Link>
  );
}
