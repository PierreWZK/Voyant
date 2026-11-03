// Plafond d'appels par clé (adresse IP) sur une fenêtre glissante.
// shortcut: compteur en mémoire, valable pour un seul conteneur ; passer à Redis si on en lance plusieurs.
export function creerLimite({ max, fenetreMs }) {
  const passages = new Map();
  return function autoriser(cle, maintenant = Date.now()) {
    const recents = (passages.get(cle) ?? []).filter((t) => maintenant - t < fenetreMs);
    const accepte = recents.length < max;
    if (accepte) recents.push(maintenant);
    if (recents.length) passages.set(cle, recents);
    else passages.delete(cle);
    return accepte;
  };
}
