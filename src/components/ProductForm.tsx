import Link from "next/link";
import type { Product } from "@/db/schema";

export default function ProductForm({
  product,
  action,
}: {
  product?: Product;
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          name="name"
          defaultValue={product?.name ?? ""}
          required
          placeholder="Product name"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1">
            Slug{" "}
            <span className="font-normal text-gray-400">
              (auto if blank)
            </span>
          </label>
          <input
            name="slug"
            defaultValue={product?.slug ?? ""}
            placeholder="my-product"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            name="status"
            defaultValue={product?.status ?? "draft"}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium mb-1">Price</label>
          <input
            name="price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={product?.price ?? 0}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Currency</label>
          <input
            name="currency"
            defaultValue={product?.currency ?? "USD"}
            maxLength={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 uppercase focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Inventory</label>
          <input
            name="inventory"
            type="number"
            min="0"
            defaultValue={product?.inventory ?? 0}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Image URL</label>
        <input
          name="image"
          defaultValue={product?.image ?? ""}
          placeholder="https://…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          name="description"
          defaultValue={product?.description ?? ""}
          rows={5}
          placeholder="Describe the product"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="px-5 py-2 rounded-lg bg-gray-900 text-white font-medium"
        >
          {product ? "Save changes" : "Create product"}
        </button>
        <Link
          href="/admin/products"
          className="px-5 py-2 rounded-lg border border-gray-300 font-medium"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
