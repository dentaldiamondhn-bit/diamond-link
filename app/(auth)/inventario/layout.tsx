'use client';

export default function InventarioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="max-w-7xl mx-auto p-6">{children}</div>;
}
