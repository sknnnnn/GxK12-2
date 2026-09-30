import type { ReactNode } from "react";
import { CartProvider } from "@/lib/cart/CartProvider";
import { SiteHeader } from "@/components/storefront/SiteHeader";
import { SiteFooter } from "@/components/storefront/SiteFooter";

// Escopa el carrito al Storefront: Admin Web (src/app/admin) no lo monta,
// no lo necesita (ver src/lib/cart/CartProvider.tsx). Header y footer
// (Bible §14, Roadmap Bloque 1) viven acá para todo el Storefront.
export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <SiteHeader />
      {children}
      <SiteFooter />
    </CartProvider>
  );
}
