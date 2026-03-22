/**
 * Town-to-district-municipality mapping for provinces that use municipality folders.
 * Only Limpopo uses municipality level. Other provinces keep province/town structure.
 *
 * Municipality slugs become folder names: capricorn, mopani, sekhukhune, vhembe, waterberg
 */

export const PROVINCES_WITH_MUNICIPALITIES = ['limpopo'];

/**
 * Maps town slug -> municipality slug for Limpopo.
 * Based on SA district municipalities and local municipality seats.
 *
 * Capricorn District (seat: Polokwane)
 * Mopani District (seat: Giyani)
 * Sekhukhune District (seat: Groblersdal)
 * Vhembe District (seat: Thohoyandou)
 * Waterberg District (seat: Modimolle)
 */
export const LIMPOPO_TOWN_TO_MUNICIPALITY = {
  // Capricorn District Municipality
  polokwane: 'capricorn',
  seshego: 'capricorn',
  dikgale: 'capricorn',
  chuenespoort: 'capricorn',
  bakone: 'capricorn',
  raditshaba: 'capricorn',
  koloti: 'capricorn',
  'ga-maraba': 'capricorn',
  rebone: 'capricorn',
  dendron: 'capricorn',
  mashashane: 'capricorn',
  atok: 'capricorn',
  boyne: 'capricorn',
  superbia: 'capricorn',
  sovenga: 'capricorn',

  // Mopani District Municipality
  giyani: 'mopani',
  gompies: 'mopani',
  phalaborwa: 'mopani',
  tzaneen: 'mopani',
  haenertsburg: 'mopani',
  letsitele: 'mopani',
  nkwe: 'mopani',
  gakgapane: 'mopani',
  duiwelskloof: 'mopani',
  hoedspruit: 'mopani',
  letaba: 'mopani',
  trichardtsdal: 'mopani',
  molototsi: 'mopani',

  // Sekhukhune District Municipality
  'marble-hall': 'sekhukhune',
  marblehall: 'sekhukhune',
  shiluvane: 'sekhukhune',
  bosbokrand: 'sekhukhune',
  soekmekaar: 'sekhukhune',
  juno: 'sekhukhune',

  // Vhembe District Municipality
  thohoyandou: 'vhembe',
  sibasa: 'vhembe',
  tholongwe: 'vhembe',
  mphahlele: 'vhembe',
  makhado: 'vhembe',
  'louis-trichardt': 'vhembe',
  louistrichardt: 'vhembe',
  malamulele: 'vhembe',
  musina: 'vhembe',
  messina: 'vhembe',
  mutale: 'vhembe',
  levubu: 'vhembe',
  temba: 'vhembe',
  mulima: 'vhembe',
  mungomani: 'vhembe',
  munzhedzi: 'vhembe',
  muthathi: 'vhembe',

  // Waterberg District Municipality
  modimolle: 'waterberg',
  mookgophong: 'waterberg',
  naboomspruit: 'waterberg',
  nylstroom: 'waterberg',
  mokopane: 'waterberg',
  potgietersrus: 'waterberg',
  mahwelereng: 'waterberg',
  'bela-bela': 'waterberg',
  belabela: 'waterberg',
  lephalale: 'waterberg',
  ellisras: 'waterberg',
  thabazimbi: 'waterberg',
  vaalwater: 'waterberg',
  roedtan: 'waterberg',
  waterberg: 'waterberg',
  'dwars-river': 'waterberg',
  dwarsriver: 'waterberg',
  lonsdale: 'waterberg',
  neandertal: 'waterberg',
  manyama: 'waterberg',
  elim: 'waterberg',
  mokamole: 'waterberg',
  'north-west': 'waterberg',
  northwest: 'waterberg',
};
