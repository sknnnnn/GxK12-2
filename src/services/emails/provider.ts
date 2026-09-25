// Abstracción de envío de emails transaccionales (ver Arquitectura técnica § 13).
// Proveedor pendiente de definir.
export interface EmailService {
  sendOrderConfirmation(input: unknown): Promise<unknown>;
  sendPaymentConfirmation(input: unknown): Promise<unknown>;
  sendShippingNotification(input: unknown): Promise<unknown>;
  sendTrackingNotification(input: unknown): Promise<unknown>;
}
