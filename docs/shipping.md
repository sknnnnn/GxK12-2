# Envíos — flujo real (PRO-128)

## Flujo

```text
Checkout ─► pedido pending_payment (costo y proveedor leídos de shipping_settings, server-side)
        ─► webhook Mercado Pago: record_payment_result ─► orders.status = payment_confirmed
        ─► ensureShipmentForPaidOrder (services/shipping/shipments.ts)
             ├─ OK       ─► shipments.status = created | processing (+ external_id, tracking, label_url si el proveedor la da)
             └─ falla    ─► shipments.status = failed + last_error  (pago, pedido y stock NO se tocan)
        ─► Admin > Envíos / detalle de pedido: reintento manual de incidencias
```

- **Un solo proveedor activo** (`andreani` | `correo_argentino`), elegido en **Admin > Configuración** (tabla `shipping_settings`, fila única). Sin fallback automático.
- **Costo de envío**: monto fijo configurado en Admin. Se suma al pedido (`orders.shipping_cost`) y a la preference de Mercado Pago como ítem "Envío". No hay cotización online (ningún proveedor tiene un endpoint de cotización verificado).
- Si falta proveedor o costo, **el checkout se rechaza** (`shipping_unavailable`) en vez de cobrar un envío inventado.
- `orders.shipping_method` guarda el proveedor activo al momento de la compra (informativo). El alta usa el proveedor activo al confirmarse el pago; `shipments.provider` es la fuente de verdad del envío.
- `shipments.cost` queda `NULL`: lo cobrado al cliente ya está en `orders.shipping_cost`; el costo real del transportista no se conoce todavía.
- `shipments.destination_type = 'address'` (único destino que ofrece hoy el checkout). El domicilio vive en `orders.shipping_address`, no se duplica.
- **Idempotencia**: índice único parcial `uq_shipments_order_active` (un envío no cancelado por pedido) + claim optimista por `attempts`. Reintentos del webhook o clicks repetidos no dan de alta dos envíos. Un intento `pending` se considera abandonado recién a los 15 minutos.
- **Tracking**: se guarda el número que entregue el proveedor; el cliente lo consulta en el sitio oficial del proveedor. No hay tracking público propio ni URLs de tracking construidas a mano.

## Estados de `shipments.status`

| Estado | Significado |
|---|---|
| `pending` | Alta en curso |
| `processing` | El proveedor aceptó el alta en forma asíncrona |
| `created` | Alta confirmada por el proveedor |
| `failed` | Incidencia (ver `last_error`); reintentable desde Admin |
| `cancelled` | Cancelado (libera el índice de envío activo) |

## Pendiente (no inventado — bloquea el alta real)

**Credenciales (GXK)**
- Correo Argentino: `CORREO_ARGENTINO_API_KEY`, `CORREO_ARGENTINO_AGREEMENT`, `CORREO_ARGENTINO_ENVIRONMENT`.
- Andreani: mecanismo de autenticación real no confirmado; `ANDREANI_API_KEY` / `ANDREANI_API_URL` son placeholders.

**Contratos / API**
- Correo Argentino: valores válidos de `parcels[].productCategory` (el alta se detiene ahí a propósito) y código(s) de `serviceType` de la cuenta.
- Andreani: ningún endpoint verificado (alta, etiqueta, tracking, cotización, cancelación).
- Etiqueta: Correo Argentino entrega el PDF vía `getLabel` (no una URL); falta decidir si se descarga bajo demanda desde Admin o se guarda en Storage.

**Decisiones comerciales de GXK**
- Regla definitiva del costo de envío (hoy: monto fijo).
- Packaging: cómo se agrupan productos/unidades en bultos, dimensiones y peso finales. Hoy solo se soporta un producto × 1 unidad; el resto queda como incidencia `ShippingPackagingNotSupportedError`.
- Destino: domicilio vs. sucursal/locker y selección de sucursal. **El checkout actual guarda el domicilio en una sola línea (`address`)**; ambos proveedores necesitan calle y número por separado, así que hoy el alta termina en incidencia `ShippingDestinationIncompleteError` hasta que se defina el formulario de destino.
- Domicilio de despacho y datos del remitente (se cargan en Admin > Configuración).
- Límites de peso/dimensiones del contrato con cada proveedor.

## Tests

`npm test` (runner nativo `node:test`, sin dependencias nuevas). Supabase y proveedores se simulan en memoria (`tests/support/fakeSupabase.ts`); ningún test llama a APIs externas.
