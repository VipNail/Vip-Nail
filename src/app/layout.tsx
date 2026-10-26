import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "VIP Nail Studio & School",
    template: "%s · VIP Nail Studio & School",
  },
  description: "Estudio de manicura y pedicura, tienda y academia.",
  // DEBT: quitar en producción. Staging no se indexa.
  robots: process.env.PERMITIR_INDEXAR === "1" ? undefined : { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
