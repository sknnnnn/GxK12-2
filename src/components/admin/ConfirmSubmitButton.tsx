"use client";

import type { ReactNode } from "react";

/**
 * Botón de submit con confirmación nativa antes de dejar pasar el submit
 * -- para acciones destructivas dentro de un <form action={serverAction}>
 * plano (sin más JS que esto). Solo UX, sin lógica de negocio: la
 * confirmación no reemplaza ninguna validación server-side.
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
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!window.confirm(confirmText)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
