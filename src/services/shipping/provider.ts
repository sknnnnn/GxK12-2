// Abstracción de proveedor logístico (ver Arquitectura técnica § 12).
// Cada proveedor real (Andreani, Correo Argentino) implementa esta interfaz.
export interface ShippingProvider {
  calculateRate(input: unknown): Promise<unknown>;
  createShipment(input: unknown): Promise<unknown>;
  generateLabel(input: unknown): Promise<unknown>;
  getTracking(input: unknown): Promise<unknown>;
  cancelShipment(input: unknown): Promise<unknown>;
}
