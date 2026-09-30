import type { AdminMeasurementRow, AdminProductVariant } from "@/services/admin";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { saveMeasurementsAction } from "./actions";
import styles from "./ProductForm.module.css";

const EXTRA_LABEL_SLOTS = 2;

/**
 * Medidas reales por talle (Bible §20: "Cada modelo tiene medidas propias.
 * Mostrar: ancho, largo, hombros, etc."). Las etiquetas son libres; los
 * talles salen de las variantes del producto. Guardar reemplaza la tabla.
 */
export function ProductMeasurementsManager({
  productId,
  variants,
  rows,
}: {
  productId: string;
  variants: AdminProductVariant[];
  rows: AdminMeasurementRow[];
}) {
  const sizes = [...new Map(variants.filter((v) => v.size).map((v) => [v.size!.id, v.size!])).values()];
  const sizeKeys: { key: string; name: string }[] =
    sizes.length > 0 ? sizes.map((size) => ({ key: size.id, name: size.name })) : [{ key: "none", name: "Único" }];

  const labels = [...new Set(rows.map((row) => row.label))];
  const slots = [...labels, ...Array.from({ length: EXTRA_LABEL_SLOTS }, () => "")];
  const valueFor = (sizeKey: string, label: string) =>
    rows.find((row) => (row.sizeId ?? "none") === sizeKey && row.label === label)?.valueCm ?? "";

  return (
    <form action={saveMeasurementsAction.bind(null, productId)} className={styles.form}>
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Medidas reales (cm)</legend>
        <p>Una columna por medida (ancho, largo, hombros…). Dejá vacía la etiqueta para quitar una columna.</p>
        <input type="hidden" name="sizeKeys" value={sizeKeys.map((size) => size.key).join(",")} />
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Talle</th>
                {slots.map((label, index) => (
                  <th key={index}>
                    <input name={`label_${index}`} defaultValue={label} placeholder="Medida" aria-label={`Etiqueta de la columna ${index + 1}`} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sizeKeys.map((size) => (
                <tr key={size.key}>
                  <th scope="row">{size.name}</th>
                  {slots.map((label, index) => (
                    <td key={index}>
                      <input
                        name={`value_${size.key}_${index}`}
                        inputMode="decimal"
                        defaultValue={label ? valueFor(size.key, label) : ""}
                        aria-label={`${size.name}, columna ${index + 1}`}
                        size={6}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <input type="hidden" name="slotCount" value={slots.length} />
        <SubmitButton className={styles.submitButton}>Guardar medidas</SubmitButton>
      </fieldset>
    </form>
  );
}
