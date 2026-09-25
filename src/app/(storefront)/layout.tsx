import type { ReactNode } from "react";
import { CartProvider } from "@/lib/cart/CartProvider";

// Escopa el carrito al Storefront: Admin Web (src/app/admin) no lo monta,
// no lo necesita (ver src/lib/cart/CartProvider.tsx).
export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
