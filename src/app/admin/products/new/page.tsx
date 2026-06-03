import AdminShell from "@/components/AdminShell";
import ProductForm from "@/components/ProductForm";
import { createProduct } from "@/app/actions/products";

export default function NewProductPage() {
  return (
    <AdminShell title="New product">
      <ProductForm action={createProduct} />
    </AdminShell>
  );
}
