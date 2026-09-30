import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDeliveryMethods, getShippingSettings } from "@/services/shipping";
import { getPaymentSettings } from "@/services/payments";
import { getSiteSettings } from "@/services/site";
import formStyles from "../productos/ProductForm.module.css";
import styles from "../pedidos/[id]/page.module.css";
import { SubmitButton } from "@/components/admin/SubmitButton";
import {
  updateDeliveryMethodAction,
  updatePaymentSettingsAction,
  updateShippingSettingsAction,
  updateSiteSettingsAction,
} from "./actions";

// Configuración: modalidades de entrega (Bible §19), medios de pago (§18),
// contacto/redes del sitio (§22, §35) y datos de despacho de GXK. Pantalla funcional mínima, sin
// diseño definitivo (queda para Figma). Las credenciales de los proveedores
// NO se editan acá: viven en variables de entorno server-side.
export default async function AdminConfiguracionPage(props: PageProps<"/admin/configuracion">) {
  const searchParams = await props.searchParams;
  const errorMessage = typeof searchParams.error === "string" ? searchParams.error : null;
  const showSuccess = typeof searchParams.success === "string";

  const supabase = await createSupabaseServerClient();
  const [settings, deliveryMethods, payment, site] = await Promise.all([
    getShippingSettings(supabase),
    getDeliveryMethods(supabase),
    getPaymentSettings(supabase),
    getSiteSettings(supabase),
  ]);
  const origin = settings.originAddress;
  const contact = settings.originContact;

  return (
    <div>
      <h1>Configuración</h1>

      {errorMessage && <p className={styles.error}>{errorMessage}</p>}
      {showSuccess && <p className={styles.success}>Configuración guardada.</p>}

      <section className={formStyles.form}>
        <h2>Modalidades de entrega</h2>
        <p className={styles.muted}>
          Bible §19: Andreani, Correo Argentino y Punto de encuentro. El checkout ofrece solo las habilitadas y con costo
          definido. Andreani / Correo Argentino se dan de alta con el transportista cuando el pago queda confirmado.
        </p>
        {deliveryMethods.map((method) => (
          <form key={method.id} action={updateDeliveryMethodAction} className={formStyles.fieldset}>
            <input type="hidden" name="id" value={method.id} />
            <fieldset className={formStyles.fieldset}>
              <legend className={formStyles.legend}>{method.label}</legend>
              <div className={formStyles.row}>
                <label className={formStyles.field}>
                  <span>
                    <input type="checkbox" name="isEnabled" defaultChecked={method.isEnabled} /> Habilitada
                  </span>
                </label>
                <label className={formStyles.field}>
                  Costo (ARS)
                  <input name="cost" inputMode="decimal" defaultValue={method.cost ?? ""} placeholder="Ej. 4500" />
                </label>
              </div>
              {method.id === "meeting_point" && (
                <label className={formStyles.field}>
                  Lugar, horarios y cómo se coordina (se muestra en el checkout)
                  <textarea name="details" rows={3} defaultValue={method.details ?? ""} />
                </label>
              )}
              <SubmitButton className={formStyles.submitButton}>Guardar {method.label}</SubmitButton>
            </fieldset>
          </form>
        ))}
      </section>

      <form action={updatePaymentSettingsAction} className={formStyles.form}>
        <fieldset className={formStyles.fieldset}>
          <legend className={formStyles.legend}>Medios de pago</legend>
          <p className={styles.muted}>
            Bible §18-§19. El efectivo se ofrece solo con punto de encuentro (un envío se paga completo por adelantado). Su
            alcance exacto sigue pendiente de definición: dejalo deshabilitado hasta confirmarlo.
          </p>
          <label className={formStyles.field}>
            <span>
              <input type="checkbox" name="mercadoPagoEnabled" defaultChecked={payment.mercadoPagoEnabled} /> Mercado Pago
              (tarjetas y cuotas según Mercado Pago)
            </span>
          </label>
          <label className={formStyles.field}>
            Cuotas máximas (vacío = las que ofrezca Mercado Pago)
            <input name="maxInstallments" inputMode="numeric" defaultValue={payment.maxInstallments ?? ""} />
          </label>
          <label className={formStyles.field}>
            <span>
              <input type="checkbox" name="meetingPointDepositEnabled" defaultChecked={payment.meetingPointDepositEnabled} />{" "}
              Punto de encuentro: 50% de reserva + 50% en la entrega
            </span>
          </label>
          <label className={formStyles.field}>
            <span>
              <input type="checkbox" name="cashEnabled" defaultChecked={payment.cashEnabled} /> Efectivo en la entrega (punto de
              encuentro)
            </span>
          </label>
          <SubmitButton className={formStyles.submitButton}>Guardar medios de pago</SubmitButton>
        </fieldset>
      </form>

      <form action={updateSiteSettingsAction} className={formStyles.form}>
        <fieldset className={formStyles.fieldset}>
          <legend className={formStyles.legend}>Sitio: contacto y redes</legend>
          <p className={styles.muted}>Vacío = no se muestra en el sitio.</p>
          <div className={formStyles.row}>
            <label className={formStyles.field}>
              WhatsApp (número internacional, ej. 5491122334455)
              <input name="whatsappNumber" defaultValue={site.whatsappNumber ?? ""} inputMode="tel" />
            </label>
            <label className={formStyles.field}>
              Instagram (https://…)
              <input name="instagramUrl" defaultValue={site.instagramUrl ?? ""} />
            </label>
            <label className={formStyles.field}>
              TikTok (https://…)
              <input name="tiktokUrl" defaultValue={site.tiktokUrl ?? ""} />
            </label>
          </div>
          <SubmitButton className={formStyles.submitButton}>Guardar sitio</SubmitButton>
        </fieldset>
      </form>

      <form action={updateShippingSettingsAction} className={formStyles.form}>
        <fieldset className={formStyles.fieldset}>
          <legend className={formStyles.legend}>Despacho por transportista</legend>
          <label className={formStyles.field}>
            Service type del contrato (opcional)
            <input name="serviceType" defaultValue={settings.serviceType ?? ""} />
          </label>
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

        <SubmitButton className={formStyles.submitButton}>Guardar datos de despacho</SubmitButton>
      </form>
    </div>
  );
}
