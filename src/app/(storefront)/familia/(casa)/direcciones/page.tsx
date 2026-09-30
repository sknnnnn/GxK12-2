import type { Metadata } from "next";
import { requireMember } from "@/lib/familia/session";
import { getMemberAddresses } from "@/services/familia";
import { FamiliaForm } from "../../FamiliaForm";
import { addAddressAction, deleteAddressAction, setDefaultAddressAction } from "../../actions";
import styles from "../../familia.module.css";

export const metadata: Metadata = {
  title: "Direcciones — Familia GxK",
};

const FIELDS = [
  ["label", "Nombre de la dirección (opcional)", ""],
  ["streetName", "Calle", "address-line1"],
  ["streetNumber", "Número", ""],
  ["floor", "Piso (opcional)", ""],
  ["apartment", "Depto. (opcional)", ""],
  ["locality", "Localidad", "address-level2"],
  ["province", "Provincia", "address-level1"],
  ["postalCode", "Código postal", "postal-code"],
] as const;

// Direcciones guardadas: se ofrecen en el checkout para envíos por transportista.
export default async function DireccionesPage() {
  const { supabase } = await requireMember();
  const addresses = await getMemberAddresses(supabase);
  return (
    <>
      <h1>DIRECCIONES</h1>
      {addresses.length === 0 ? (
        <p className={styles.muted}>Todavía no guardaste direcciones.</p>
      ) : (
        <ul className={styles.list}>
          {addresses.map((address) => (
            <li key={address.id} className={styles.card}>
              <strong>{address.label || `${address.streetName} ${address.streetNumber}`}</strong>
              <span>
                {address.streetName} {address.streetNumber}
                {address.floor ? `, piso ${address.floor}` : ""}
                {address.apartment ? ` ${address.apartment}` : ""} — {address.locality}, {address.province} ({address.postalCode})
              </span>
              <div className={styles.row}>
                {address.isDefault ? (
                  <span className={styles.muted}>Principal</span>
                ) : (
                  <form action={setDefaultAddressAction.bind(null, address.id)}>
                    <button type="submit" className={styles.secondary}>
                      Usar como principal
                    </button>
                  </form>
                )}
                <form action={deleteAddressAction.bind(null, address.id)}>
                  <button type="submit" className={styles.secondary}>
                    Eliminar
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
      <h2>Agregar dirección</h2>
      <FamiliaForm action={addAddressAction} submitLabel="Guardar dirección">
        {FIELDS.map(([name, label, autoComplete]) => (
          <label key={name}>
            {label}
            <input name={name} autoComplete={autoComplete || undefined} />
          </label>
        ))}
      </FamiliaForm>
    </>
  );
}
