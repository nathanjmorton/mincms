import { notFound } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import ProductForm from "@/components/ProductForm";
import { getProductById } from "@/lib/queries";
import { updateProduct } from "@/app/actions/products";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductById(Number(id));
  if (!product) notFound();

  const action = updateProduct.bind(null, product.id);

  return (
    <AdminShell title="Edit product">
      <ProductForm product={product} action={action} />
    </AdminShell>
  );
}
