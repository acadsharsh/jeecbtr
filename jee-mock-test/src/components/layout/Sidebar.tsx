"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, BookOpen, Upload, Plus, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { createBrowserClient } from "@/lib/supabase";
import toast from "react-hot-toast";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/tests", icon: BookOpen, label: "My Tests" },
  { href: "/upload", icon: Upload, label: "Upload PDF" },
  { href: "/tests/new", icon: Plus, label: "New Test" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.push("/");
    router.refresh();
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-ink-900 border-r-2 border-ink-900 flex flex-col z-40">
      <div className="px-6 py-5 border-b-2 border-ink-700">
        <Link href="/dashboard" className="font-display text-2xl font-black text-ink-50">
          JEE<span className="text-amber-500">Forge</span>
        </Link>
        <p className="text-xs text-ink-400 font-mono mt-0.5">Mock Test Generator</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 text-sm font-body font-medium transition-all duration-100 border-2",
                active
                  ? "bg-amber-500 text-ink-900 border-amber-500 shadow-ink-sm"
                  : "text-ink-300 border-transparent hover:bg-ink-800 hover:text-ink-50 hover:border-ink-700"
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t-2 border-ink-700">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 w-full text-sm font-body font-medium text-ink-400 border-2 border-transparent hover:bg-ink-800 hover:text-ink-50 hover:border-ink-700 transition-all duration-100"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
