import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Bakersfield · Housing Policy Navigator",
  description:
    "Internal housing policy research, staff review, and implementation workspace.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
