import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Profile editor | misa.lol trial",
  description: "Edit one profile and its link, with a live preview.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
