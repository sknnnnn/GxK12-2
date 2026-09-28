# GXK12:2

E-commerce de indumentaria de GXK. Next.js (App Router) + TypeScript + Supabase.

La documentación funcional y técnica (requerimientos, arquitectura funcional, arquitectura técnica) vive en el proyecto MACARIO, no en este repositorio.

GXK tiene tres superficies (Storefront Web, Admin Web, y a futuro GXK Desktop) sobre un mismo backend y la misma lógica de negocio. Ver [`ARCHITECTURE.md`](./ARCHITECTURE.md) para cómo se organiza el código para sostener esto.

## Desarrollo

```bash
npm install
cp .env.example .env.local   # completar con las credenciales del proyecto Supabase
npm run dev
npm test                     # tests de GXK Core (node:test, sin APIs externas)
```

Envíos (proveedor activo, costo, alta post-pago y pendientes): ver [`docs/shipping.md`](./docs/shipping.md).

Abrir [http://localhost:3000](http://localhost:3000).

## Estructura

```text
src/
  app/
    (storefront)/   storefront público
    admin/          panel administrativo
  components/       storefront, admin, ui compartida
  lib/supabase/     clientes Supabase (público, server, admin) + middleware de sesión
  services/         operaciones server-side agrupadas por dominio
                     (catalog, cart, checkout, orders, payments, inventory, shipping, emails, admin)
  types/            tipos compartidos (incluye tipos generados de Supabase)
  utils/            utilidades compartidas
```

## Estado

Esquema de base de datos aplicado y validado en Supabase (`supabase/migrations/`). Sin integraciones reales
(Mercado Pago, Andreani, Correo Argentino, email) todavía. `services/` sigue siendo stubs — ver `ARCHITECTURE.md`
para la convención que su implementación debe seguir.
