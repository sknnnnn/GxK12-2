"use client";

import type { ReactNode } from "react";
import { SubmitButton } from "./SubmitButton";

/**
 * Botón de submit con confirmación nativa antes de dejar pasar el submit
 * -- para acciones destructivas dentro de un <form action={serverAction}>
 * plano (sin más JS que esto). Solo UX, sin lógica de negocio: la
 * confirmación no reemplaza ninguna validación server-side. Mientras la
 * acción corre queda deshabilitado (ver SubmitButton).
 */
export function ConfirmSubmitButton({
  confirmText,
  className,
  children,
}: {
  confirmText: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <SubmitButton confirmText={confirmText} className={className} pendingText="Procesando…">
      {children}
    </SubmitButton>
  );
}
