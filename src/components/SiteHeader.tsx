import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="border-b border-gray-200">
      <div className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-semibold text-lg tracking-tight">
          MinCMS
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/blog" className="text-gray-600 hover:text-gray-900">
            Blog
          </Link>
          <Link href="/shop" className="text-gray-600 hover:text-gray-900">
            Shop
          </Link>
          <Link
            href="/admin"
            className="text-gray-600 hover:text-gray-900"
          >
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
