import type { Metadata } from "next";
import { requireMember } from "@/lib/familia/session";
import { FamiliaForm, ProfileFields } from "../../FamiliaForm";
import { updateProfileAction } from "../../actions";
import styles from "../../familia.module.css";

export const metadata: Metadata = {
  title: "Mis datos — Familia GxK",
};

export default async function MisDatosPage() {
  const { member } = await requireMember();
  return (
    <>
      <h1>MIS DATOS</h1>
      <p className={styles.muted}>Email: {member.email}</p>
      <FamiliaForm action={updateProfileAction} submitLabel="Guardar">
        <ProfileFields defaults={member} />
      </FamiliaForm>
    </>
  );
}
