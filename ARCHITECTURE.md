# GXK — Arquitectura de plataforma

> Complementa `README.md`. La documentación funcional/técnica de negocio (requerimientos, arquitectura funcional, arquitectura técnica) vive en el proyecto MACARIO, no acá — este documento cubre específicamente cómo se organiza el código para sostener tres superficies sobre un mismo backend.

---

## 1. Las tres superficies

GXK12.2 tiene tres superficies, no dos sistemas:

```text
                    GXK
                     │
          ┌──────────┴──────────┐
          │                     │
       STOREFRONT           ADMINISTRACIÓN
          │                     │
        WEB             ┌───────┴───────┐
                        │               │
                       WEB           DESKTOP
```

- **Storefront Web** — tienda pública (Next.js).
- **Admin Web** — panel administrativo en el navegador (Next.js).
- **GXK Desktop** — aplicación de escritorio para Windows (`.exe`, probablemente Tauri más adelante). Alternativa a Admin Web, **no** un reemplazo ni "la versión principal". Un administrador elige indistintamente navegador o escritorio; ambas operan sobre las mismas reglas y los mismos datos.

Ninguna de las dos interfaces administrativas es la versión "de verdad" de la que la otra sería una copia — las dos son clientes de la misma lógica.

## 2. Principio: GXK Core

```text
                 GXK CORE
                    │
        ┌───────────┼───────────┐
        │           │           │
   Storefront   Admin Web    Desktop
        │           │           │
        └───────────┼───────────┘
                    │
                 Supabase
```

**GXK Core** es la lógica de dominio en `src/services/**`: catálogo, carrito, checkout, pedidos, pagos, inventario, envíos, emails, administración. Las reglas de negocio (qué es overselling, cuándo un pedido puede cancelarse, qué campos son editables) viven ahí una sola vez. Las interfaces (Storefront, Admin Web, Desktop) se limitan a: mostrar, recibir interacción, validar inputs de UI, invocar la función de `services/` correspondiente, y manejar estado visual. Ninguna interfaz debe reimplementar una regla que ya vive en Core — ver `src/services/*/index.ts`, cada uno documenta esto en su propio encabezado.

No se creó un monorepo ni `packages/` para esto: sigue siendo un único proyecto Next.js con una carpeta de dominio (`src/services/`) diseñada para ser consumible por algo que no sea Next.js el día que haga falta. Ver §5.

## 3. Qué es específico de Next.js y qué es reutilizable

| Capa | Reutilizable tal cual desde Desktop | Notas |
|---|---|---|
| `src/services/**` (GXK Core) | **Sí**, en principio | Reciben un `GxkSupabaseClient` ya construido como parámetro (ver §4). No importan `next/headers`, Server Actions ni ningún API de Next.js. |
| `src/lib/supabase/client.ts` (browser) | Sí, como referencia | `createBrowserClient` de `@supabase/ssr` funciona en cualquier contexto de navegador/webview, incluido un futuro webview de Tauri. |
| `src/lib/supabase/admin.ts` (service-role) | **No** — y no debe reutilizarse en Desktop | Ver §6 (seguridad). Solo corre en un servidor real. |
| `src/lib/supabase/server.ts` (sesión + cookies) | No tal cual | Depende de `next/headers`. Es el único de los tres factories atado a Next.js — natural, ya que existe específicamente para el modelo de cookies de Server Components/Actions. Desktop necesitará su propia forma de sostener sesión (ver §7). |
| `src/proxy.ts` / `src/lib/supabase/middleware.ts` | No aplica | Proxy de Next.js (refresco de sesión en cada request web). Desktop no tiene "requests" en ese sentido — no hay nada que portar acá. |
| `src/app/**` (páginas, Server Actions, Route Handlers) | No — es la interfaz | Cada superficie tiene la suya. Admin Web vive en `src/app/admin/**`; Desktop tendrá su propia capa de interfaz el día que se incorpore (ver §7), consumiendo los mismos `services/**`. |

## 4. Convención de GXK Core: inyección de cliente

Cada función de `src/services/**` recibe un `GxkSupabaseClient` (`src/lib/supabase/types.ts`, alias tipado de `SupabaseClient<Database>`) como parámetro, en vez de construir uno internamente:

```ts
// src/services/catalog/index.ts (forma esperada, no implementado todavía)
import type { GxkSupabaseClient } from "@/lib/supabase/types";

export async function listPublishedProducts(supabase: GxkSupabaseClient, categoryId?: string) {
  // ...
}
```

Quien llama decide cómo se construyó ese cliente:

- Storefront/Admin Web (Server Component/Action) → `createSupabaseServerClient()` (sesión vía cookies, sujeto a RLS).
- Storefront (interacción de cliente) → `createSupabasePublicClient()` (anon key, sujeto a RLS pública).
- Checkout/webhooks (operación server-only acotada) → `createSupabaseAdminClient()` (service-role, nunca en Desktop ni en el navegador).
- Desktop (a futuro) → lo que Desktop use para construir su propio cliente autenticado (ver §7) — mismo tipo `GxkSupabaseClient`, mismas funciones de `services/**`, sin reescribir nada de Core.

`Database` (`src/types/database.ts`) ahora son los tipos reales generados desde el esquema aplicado en Supabase (antes era un placeholder `Record<string, unknown>`), así que `services/**` puede tipar sus datos contra las tablas reales desde el día uno.

## 5. Por qué no hace falta un monorepo todavía

`src/services/**` ya es una carpeta con cero dependencias de Next.js en su superficie pública (una vez implementada siguiendo §4): son funciones TypeScript puras que reciben un cliente Supabase tipado y devuelven datos. Eso alcanza para que, cuando exista Desktop, ese código se **importe directamente** (mismo repo, mismo `node_modules`, sin publicar un paquete) o, si en algún momento Desktop vive en un proceso separado (ej. un sidecar de Tauri), se copie/enlace sin reescritura de lógica. Separar en `packages/` recién tendría sentido si Desktop necesitara versionar/publicar ese código de forma independiente — no es el caso ahora, y el enunciado del problema pide explícitamente evitarlo salvo necesidad real.

## 6. Seguridad — dónde vive la service-role key

- La service-role key vive únicamente en `SUPABASE_SERVICE_ROLE_KEY` (`.env.local`, nunca en el repo) y se usa exclusivamente a través de `createSupabaseAdminClient()` (`src/lib/supabase/admin.ts`).
- Auditoría de esta tarea: **nada fuera de `admin.ts` la referencia** (`grep` confirmó cero coincidencias adicionales de `createSupabaseAdminClient`/`SUPABASE_SERVICE_ROLE_KEY` en `src/`). No hay una fuga actual.
- El guard `import "server-only"` impide que ese módulo termine en un bundle de cliente de Next.js — pero **eso es una protección específica del bundler de Next.js**, no una garantía general. Se documentó explícitamente en `admin.ts` que esa misma disciplina ("esto corre solo en un servidor real") hay que sostenerla manualmente el día que se incorpore Desktop: Tauri/Node no tiene el mismo guard, así que si alguna vez alguien importa `admin.ts` (o algo que lo use) desde código que termine empaquetado dentro del `.exe`, la key quedaría embebida y extraíble del binario. Esto **no ha ocurrido** — es una regla a mantener, no un bug encontrado.
- Modelo esperado para Desktop: autenticarse como un administrador real vía Supabase Auth (mismo mecanismo que Admin Web, misma tabla `admins`, mismas policies RLS), y operar con un cliente de sesión (equivalente a `createSupabaseServerClient`, no a `createSupabaseAdminClient`). Las únicas operaciones que necesitan service-role (checkout, webhook de pagos, liberación de reservas) siguen viviendo exclusivamente en un servidor — Desktop las dispara pidiéndoselas a ese servidor, nunca ejecutándolas localmente.

## 7. Lo que falta para incorporar Desktop (Tauri) — no implementado en esta etapa

Deliberadamente fuera de alcance ahora (ni se instaló Tauri ni se generó ningún `.exe`). Cuando se aborde:

1. **Sesión/autenticación**: definir cómo Desktop obtiene y persiste una sesión de Supabase Auth de administrador (Tauri no tiene cookies de navegador de la misma forma que Next.js) — probablemente `@supabase/supabase-js` con un storage adapter propio (ej. el keychain del SO) en vez de `@supabase/ssr`.
2. **Superficie de datos**: decidir si Desktop habla directo contra Supabase (anon/authenticated + RLS, igual que el navegador) o contra la propia API de Admin Web (Route Handlers) como backend — ambas opciones son compatibles con la arquitectura actual, es una decisión de producto pendiente, no técnica.
3. **Empaquetado**: elegir Tauri (o alternativa), definir cómo se referencia `src/services/**` desde el proyecto Tauri (import directo dentro del mismo repo vs. paso intermedio), sin duplicar lógica.
4. **Build/firma/distribución** del `.exe`: pipeline de build, code signing, actualización automática — nada de esto existe todavía.
5. **Paridad de interfaz**: dashboard, productos, imágenes, categorías, talles, colores, variantes, stock, outfits, pedidos, pagos, envíos, configuración — misma lista que Admin Web (§ del pedido original), a implementar consumiendo los mismos `services/**` una vez que existan.

## 8. Estado actual (2026-09-25)

- Esquema de Supabase aplicado y validado (`supabase/migrations/`), no se tocó en esta tarea.
- `src/services/**` sigue siendo stubs (`export {}`) — la lógica real de cada dominio todavía no está implementada; esta tarea preparó la convención (§4) que esa implementación debe seguir, no la implementación en sí.
- `src/types/database.ts` ahora refleja el esquema real (antes era un placeholder).
- Storefront y Admin Web siguen siendo páginas mínimas (`src/app/(storefront)/page.tsx`, `src/app/admin/page.tsx`) — sin diseño visual definitivo, a propósito.
