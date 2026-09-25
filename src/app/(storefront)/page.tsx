import Link from "next/link";
import { CartLink } from "@/components/storefront/CartLink";

export default function HomePage() {
  return (
    <main style={{ padding: "2rem 1.5rem" }}>
      <h1>GXK</h1>
      <p>Storefront en construcción.</p>
      <p>
        <Link href="/catalogo">Ver catálogo</Link>
        {" · "}
        <CartLink />
      </p>
    </main>
  );
}
