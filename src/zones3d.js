// Points d'ancrage des zones, en coordonnées normalisées de la boîte englobante de la voiture :
// x de -1 (arrière) à +1 (avant), y de 0 (sol) à 1 (toit), z de -1 (gauche) à +1 (droite).
// Changer de modèle 3D ne demande que ce fichier-là, pas de toucher aux voyants.
export const ANCRAGES = {
  moteur: [0.8, 0.5, 0],
  train_avant: [0.75, 0.2, 0],
  train_arriere: [-0.75, 0.2, 0],
  roue_avg: [0.7, 0.15, -1],
  roue_avd: [0.7, 0.15, 1],
  roue_arg: [-0.7, 0.15, -1],
  roue_ard: [-0.7, 0.15, 1],
  optique_avg: [1, 0.5, -0.6],
  optique_avd: [1, 0.5, 0.6],
  optique_arg: [-1, 0.5, -0.6],
  optique_ard: [-1, 0.5, 0.6],
  pare_brise: [0.4, 0.75, 0],
  retro_g: [0.3, 0.7, -1.05],
  retro_d: [0.3, 0.7, 1.05],
  habitacle: [0, 0.7, 0],
  carrosserie: [0, 0.5, 0],
  soubassement: [0, 0.05, 0],
  echappement: [-1, 0.2, 0.3],
  plaque_av: [1.02, 0.3, 0],
  plaque_ar: [-1.02, 0.3, 0],
};

// boite = { longueur, hauteur, largeur } de la voiture, centrée sur l'origine, posée sur le sol.
export function positionZone(zone, boite) {
  const [x, y, z] = ANCRAGES[zone] ?? ANCRAGES.carrosserie;
  return [(x * boite.longueur) / 2, y * boite.hauteur, (z * boite.largeur) / 2];
}
