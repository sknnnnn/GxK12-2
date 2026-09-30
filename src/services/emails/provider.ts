// Proveedor de email transaccional. PENDIENTE (Roadmap): proveedor
// definitivo. La interfaz queda lista; mientras no haya uno registrado, los
// emails se registran en email_log como 'skipped' y el flujo sigue.
//
// Para conectar el proveedor definitivo: implementar EmailProvider (en un
// archivo propio, con sus credenciales server-only) y registrarlo en
// PROVIDERS con el id que se configure en EMAIL_PROVIDER.

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
};

export interface EmailProvider {
  readonly id: string;
  send(message: EmailMessage): Promise<void>;
}

const PROVIDERS: Record<string, () => EmailProvider> = {};

/** null = no hay proveedor configurado (EMAIL_PROVIDER vacío o no registrado). */
export function getEmailProvider(): EmailProvider | null {
  const id = process.env.EMAIL_PROVIDER?.trim();
  if (!id) return null;
  const factory = PROVIDERS[id];
  if (!factory) {
    console.error(`[emails] EMAIL_PROVIDER="${id}" no está implementado; los emails se registran como omitidos.`);
    return null;
  }
  return factory();
}
