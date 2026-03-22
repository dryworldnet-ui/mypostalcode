/** Row shape for the `postal_codes` table */
export interface PostalCode {
  id: string;
  postal_code: string;
  area: string;
  city: string;
  province: string;
  /** Pipe-separated alternate names (LAPPlace, LAPTown, SA1–SA4) for better search */
  aliases: string;
}
