# Scripts de desarrollo

Scripts fuera de `src/` — no forman parte de la app, no se importan desde Next.js.

## `seed-test-catalog.mjs`

Carga (o limpia) un dataset pequeño de catálogo **TEST/DEMO** contra el proyecto
Supabase configurado en `.env.local`, para validar el recorrido Storage →
`services/catalog` → Storefront con datos reales sin cargar todavía el
catálogo comercial definitivo de GXK.

Crea 3 categorías (`TEST ...`), reutiliza/crea talles (S/M/L/XL) y colores
(Negro/Blanco/Gris) como catálogo de referencia compartido, y 6 productos
`TEST ...` que cubren: varias tallas+colores con combinación inexistente
a propósito, solo-talle, disponible, agotado-pero-publicado, oculto, y
descontinuado. Las imágenes son SVGs mínimos generados por el propio script
(sin descargas externas), subidos al bucket `product-images` bajo `test/`.

### Ejecutar

```bash
node --env-file=.env.local scripts/seed-test-catalog.mjs
```

Es idempotente: si corre de nuevo, primero borra el dataset TEST anterior
(productos/categorías con slug `test-%`, sus variantes e imágenes por
cascada, y los objetos de Storage bajo `test/`) y lo vuelve a crear.

### Limpiar sin volver a sembrar

```bash
node --env-file=.env.local scripts/seed-test-catalog.mjs --clean
```

Borra categorías/productos/variantes/imágenes `TEST ...` y los objetos de
Storage bajo `test/`. **No borra `sizes`/`colors`**: son catálogo de
referencia genérico (S/M/L/XL, Negro/Blanco/Gris), no contenido de prueba —
el catálogo comercial real los va a reutilizar tal cual.

### Requisitos

- Node 20.6+ (usa `--env-file`, sin dependencias nuevas).
- `.env.local` con `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`
  ya configurados (no se piden ni se imprimen).
