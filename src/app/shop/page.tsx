import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { getPublishedProducts } from "@/lib/queries";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Shop — MinCMS" };

export default async function ShopIndex() {
  const products = await getPublishedProducts();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 w-full flex-1 py-12">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Shop</h1>
        {products.length === 0 ? (
          <p className="text-gray-500">No products available yet.</p>
        ) : (
          <div className="grid gap-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <Link key={p.id} href={`/shop/${p.slug}`} className="group block">
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image}
                    alt={p.name}
                    className="aspect-square w-full object-cover rounded-lg border border-gray-100"
                  />
                ) : (
                  <div className="aspect-square w-full rounded-lg bg-gray-100" />
                )}
                <h2 className="mt-2 font-medium group-hover:underline">
                  {p.name}
                </h2>
                <p className="text-gray-600">
                  {formatPrice(p.price, p.currency)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
