import type { Metadata } from "next";

export const metadata: Metadata = { title: "Rent a GPU" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
