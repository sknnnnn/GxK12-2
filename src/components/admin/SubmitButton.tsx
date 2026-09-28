"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/**
 * Botón de submit para un <form action={serverAction}> plano: mientras la
 * Server Action corre queda deshabilitado y muestra `pendingText`, así una
 * acción no se dispara dos veces ni parece "no haber hecho nada". Si se pasa
 * `confirmText`, pide confirmación nativa antes de enviar (acciones
 * irreversibles). Solo UX: no reemplaza ninguna validación server-side.
 */
export function SubmitButton({
  children,
  pendingText = "Guardando…",
  confirmText,
  className,
}: {
  children: ReactNode;
  pendingText?: string;
  confirmText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      aria-busy={pending}
      onClick={(event) => {
        if (confirmText && !window.confirm(confirmText)) {
          event.preventDefault();
        }
      }}
    >
      {pending ? pendingText : children}
    </button>
  );
}
