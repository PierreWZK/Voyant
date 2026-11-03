export const TAILLE_MAX = 10 * 1024 * 1024;

const MARQUES_HEIC = ['heic', 'heix', 'heim', 'heis', 'hevc', 'hevx', 'mif1', 'msf1'];

// Le type annoncé par le navigateur n'est pas fiable : on regarde les premiers octets du fichier.
export function detecterType(octets) {
  if (!octets || octets.length < 12) return null;
  if (octets.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  if (octets[0] === 0xff && octets[1] === 0xd8 && octets[2] === 0xff) return 'image/jpeg';
  if (octets.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (octets.subarray(4, 8).toString('latin1') === 'ftyp' && MARQUES_HEIC.includes(octets.subarray(8, 12).toString('latin1'))) {
    return 'image/heic';
  }
  return null;
}
