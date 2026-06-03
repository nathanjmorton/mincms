"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/posts", label: "Posts" },
  { href: "/admin/products", label: "Products" },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <aside className="w-56 shrink-0 border-r border-gray-200 min-h-screen p-4 flex flex-col">
      <Link href="/admin" className="font-semibold text-lg px-2">
        MinCMS
      </Link>
      <nav className="mt-6 flex flex-col gap-1">
        {links.map((l) => {
          const active =
            l.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`px-2 py-1.5 rounded text-sm ${
                active
                  ? "bg-gray-900 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-1">
        <Link
          href="/"
          className="px-2 py-1.5 rounded text-sm text-gray-500 hover:bg-gray-100"
        >
          ← View site
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="w-full text-left px-2 py-1.5 rounded text-sm text-gray-500 hover:bg-gray-100"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
