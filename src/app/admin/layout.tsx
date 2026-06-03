export const metadata = { title: "Admin — MinCMS" };

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex-1 flex flex-col">{children}</div>;
}
