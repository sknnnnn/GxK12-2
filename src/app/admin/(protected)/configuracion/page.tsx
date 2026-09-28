import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getShippingSettings } from "@/services/shipping";
import formStyles from "../productos/ProductForm.module.css";
import styles from "../pedidos/[id]/page.module.css";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { updateShippingSettingsAction } from "./actions";

// Configuración de envíos (PRO-128): proveedor activo, costo fijo cobrado
// en checkout y datos de despacho de GXK. Pantalla funcional mínima, sin
// diseño definitivo (queda para Figma). Las credenciales de los proveedores
// NO se editan acá: viven en variables de entorno server-side.
export default async function AdminConfiguracionPage(props: PageProps<"/admin/configuracion">) {
  const searchParams = await props.searchParams;
  const errorMessage = typeof searchParams.error === "string" ? searchParams.error : null;
  const showSuccess = searchParams.success === "1";

  const supabase = await createSupabaseServerClient();
  const settings = await getShippingSettings(supabase);
  const origin = settings.originAddress;
  const contact = settings.originContact;

  return (
    <div>
      <h1>Configuración</h1>

      {errorMessage && <p className={styles.error}>{errorMessage}</p>}
      {showSuccess && <p className={styles.success}>Configuración guardada.</p>}

      <form action={updateShippingSettingsAction} className={formStyles.form}>
        <fieldset className={formStyles.fieldset}>
          <legend className={formStyles.legend}>Envíos</legend>

          <div className={formStyles.row}>
            <label className={formStyles.field}>
              Proveedor activo
              <select name="activeProvider" defaultValue={settings.activeProvider ?? ""} required>
                <option value="" disabled>
                  Elegir…
                </option>
                <option value="andreani">Andreani</option>
                <option value="correo_argentino">Correo Argentino</option>
              </select>
            </label>

            <label className={formStyles.field}>
              Costo de envío cobrado en checkout (ARS)
              <input
                name="shippingCost"
                inputMode="decimal"
                defaultValue={settings.shippingCost ?? ""}
                placeholder="Ej. 4500.00"
                required
              />
            </label>

            <label className={formStyles.field}>
              Service type del contrato (opcional)
              <input name="serviceType" defaultValue={settings.serviceType ?? ""} />
            </label>
          </div>

          <p className={styles.muted}>
            Sin proveedor y costo configurados el checkout no toma pedidos. El envío se da de alta con el proveedor activo
            recién cuando el pago queda confirmado.
          </p>
        </fieldset>

        <fieldset className={formStyles.fieldset}>
          <legend className={formStyles.legend}>Domicilio de despacho (origen)</legend>
          <div className={formStyles.row}>
            <label className={formStyles.field}>
              Calle
              <input name="originStreetName" defaultValue={origin?.streetName ?? ""} />
            </label>
            <label className={formStyles.field}>
              Número
              <input name="originStreetNumber" defaultValue={origin?.streetNumber ?? ""} />
            </label>
            <label className={formStyles.field}>
              Piso
              <input name="originFloor" defaultValue={origin?.floor ?? ""} />
            </label>
            <label className={formStyles.field}>
              Depto.
              <input name="originApartment" defaultValue={origin?.apartment ?? ""} />
            </label>
          </div>
          <div className={formStyles.row}>
            <label className={formStyles.field}>
              Localidad
              <input name="originLocality" defaultValue={origin?.locality ?? ""} />
            </label>
            <label className={formStyles.field}>
              Provincia (código del proveedor)
              <input name="originProvince" defaultValue={origin?.province ?? ""} />
            </label>
            <label className={formStyles.field}>
              Código postal
              <input name="originPostalCode" defaultValue={origin?.postalCode ?? ""} />
            </label>
          </div>
        </fieldset>

        <fieldset className={formStyles.fieldset}>
          <legend className={formStyles.legend}>Remitente</legend>
          <div className={formStyles.row}>
            <label className={formStyles.field}>
              Nombre / razón social
              <input name="originContactName" defaultValue={contact?.name ?? ""} />
            </label>
            <label className={formStyles.field}>
              Email
              <input name="originContactEmail" type="email" defaultValue={contact?.email ?? ""} />
            </label>
            <label className={formStyles.field}>
              Teléfono
              <input name="originContactPhone" defaultValue={contact?.phone ?? ""} />
            </label>
          </div>
        </fieldset>

        <SubmitButton className={formStyles.submitButton}>Guardar configuración</SubmitButton>
      </form>
    </div>
  );
}
