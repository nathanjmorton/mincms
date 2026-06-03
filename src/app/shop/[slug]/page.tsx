import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import { getProductBySlug } from "@/lib/queries";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || product.status !== "published") notFound();

  const inStock = product.inventory > 0;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 w-full flex-1 py-12">
        <Link href="/shop" className="text-sm text-gray-500 hover:text-gray-900">
          ← Back to shop
        </Link>
        <div className="grid gap-10 md:grid-cols-2 mt-6">
          <div>
            {product.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.image}
                alt={product.name}
                className="w-full rounded-xl border border-gray-100"
              />
            ) : (
              <div className="aspect-square w-full rounded-xl bg-gray-100" />
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {product.name}
            </h1>
            <p className="text-2xl mt-3">
              {formatPrice(product.price, product.currency)}
            </p>
            <p
              className={`mt-2 text-sm ${
                inStock ? "text-green-600" : "text-red-600"
              }`}
            >
              {inStock ? `In stock (${product.inventory})` : "Out of stock"}
            </p>
            {product.description ? (
              <p className="mt-6 text-gray-700 whitespace-pre-line">
                {product.description}
              </p>
            ) : null}
            <button
              disabled={!inStock}
              className="mt-8 w-full sm:w-auto px-6 py-3 rounded-lg bg-gray-900 text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Add to cart
            </button>
            <p className="mt-2 text-xs text-gray-400">
              (Checkout is a stub — wire up Stripe to complete it.)
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
