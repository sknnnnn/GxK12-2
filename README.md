# GXK12:2

E-commerce de indumentaria de GXK. Next.js (App Router) + TypeScript + Supabase.

La documentación funcional y técnica (requerimientos, arquitectura funcional, arquitectura técnica) vive en el proyecto MACARIO, no en este repositorio.

## Desarrollo

```bash
npm install
cp .env.example .env.local   # completar con las credenciales del proyecto Supabase
npm run dev
```

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

Base técnica inicializada. Sin esquema de base de datos aplicado, sin integraciones reales
(Mercado Pago, Andreani, Correo Argentino, email) todavía.
