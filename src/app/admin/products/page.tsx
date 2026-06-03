import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import DeleteButton from "@/components/DeleteButton";
import { getAllProducts } from "@/lib/queries";
import { deleteProduct } from "@/app/actions/products";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProductsList() {
  const products = await getAllProducts();
  return (
    <AdminShell
      title="Products"
      action={
        <Link
          href="/admin/products/new"
          className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium"
        >
          New product
        </Link>
      }
    >
      {products.length === 0 ? (
        <p className="text-gray-500">No products yet. Add your first one.</p>
      ) : (
        <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
          {products.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-10 h-10 rounded object-cover border border-gray-100"
                  />
                ) : (
                  <div className="w-10 h-10 rounded bg-gray-100" />
                )}
                <div className="min-w-0">
                  <Link
                    href={`/admin/products/${p.id}`}
                    className="font-medium hover:underline truncate block"
                  >
                    {p.name}
                  </Link>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {formatPrice(p.price, p.currency)} · {p.inventory} in stock
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    p.status === "published"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {p.status}
                </span>
                <Link
                  href={`/admin/products/${p.id}`}
                  className="text-sm text-gray-600 hover:underline"
                >
                  Edit
                </Link>
                <DeleteButton action={deleteProduct.bind(null, p.id)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
