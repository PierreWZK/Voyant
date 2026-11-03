import { creerVoiture3D } from './voiture3d.js';
import { verdict } from './verdict.js';

const TAILLE_MAX = 10 * 1024 * 1024;
const TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif'];
const EXTENSIONS = /\.(pdf|jpe?g|png|heic|heif)$/i;

const zone = document.querySelector('.zone-depot');
const champ = document.querySelector('#fichier');
const champPhoto = document.querySelector('#photo');
const message = document.querySelector('#message');
const zoneResultat = document.querySelector('#resultat');
const LIBELLES = { mineure: 'Mineure', majeure: 'Majeure', critique: 'Critique' };

function afficher(texte, ton = 'info') {
  message.textContent = texte;
  message.dataset.ton = ton;
}

// Premier filtre pour répondre vite ; le serveur revérifie le contenu du fichier.
function verifier(fichier) {
  if (!TYPES.includes(fichier.type) && !EXTENSIONS.test(fichier.name)) {
    return 'Format refusé : envoie un PDF ou une photo (JPEG, PNG, HEIC).';
  }
  if (fichier.size > TAILLE_MAX) return 'Fichier trop lourd : 10 Mo au maximum.';
  return null;
}

async function envoyer(fichier) {
  const erreur = verifier(fichier);
  if (erreur) return afficher(erreur, 'erreur');

  zone.classList.add('occupee');
  afficher(`Envoi de « ${fichier.name} »…`);
  const donnees = new FormData();
  donnees.append('fichier', fichier);
  try {
    const reponse = await fetch('/api/analyse', { method: 'POST', body: donnees });
    const corps = await reponse.json().catch(() => ({}));
    if (!reponse.ok) return afficher(corps.erreur ?? 'Envoi impossible, réessaie dans un instant.', 'erreur');
    afficher('');
    montrerResultat(corps);
  } catch {
    afficher('Connexion impossible. Vérifie ta connexion et réessaie.', 'erreur');
  } finally {
    zone.classList.remove('occupee');
    champ.value = '';
    champPhoto.value = '';
  }
}

const voiture = creerVoiture3D(document.querySelector('#vue3d'), { surVoyant: (index) => activerDefaut(index) });
const choixCarrosserie = document.querySelector('#choix-carrosserie');

function choisirCarrosserie(carrosserie) {
  choixCarrosserie.value = carrosserie;
  voiture.changerCarrosserie(carrosserie).catch(() => afficher('Modèle 3D indisponible.', 'erreur'));
}
choixCarrosserie.addEventListener('change', () => choisirCarrosserie(choixCarrosserie.value));

// Un défaut est mis en avant dans la liste, et la caméra vise sa zone.
function activerDefaut(index) {
  const li = zoneResultat.querySelector(`[data-index="${index}"]`);
  if (!li) return;
  zoneResultat.querySelectorAll('.defaut.actif').forEach((el) => el.classList.remove('actif'));
  li.classList.add('actif');
  li.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  voiture.viserZone(li.dataset.zone);
}

function montrerResultat({ exemple, resultat }) {
  zoneResultat.hidden = false;
  // La scène était cachée à sa création : on la dimensionne maintenant qu'elle est visible.
  voiture.redimensionner();
  zoneResultat.querySelector('.bandeau').hidden = !exemple;
  zoneResultat.querySelector('#vide').hidden = resultat.defauts.length > 0;
  const bilan = verdict(resultat.defauts);
  const tampon = zoneResultat.querySelector('#tampon');
  tampon.textContent = bilan.titre;
  tampon.dataset.niveau = bilan.niveau;
  zoneResultat.querySelector('#compte').textContent =
    `Critiques : ${bilan.compte.critique} · Majeurs : ${bilan.compte.majeure} · Mineurs : ${bilan.compte.mineure}`;
  zoneResultat.querySelector('#defauts').replaceChildren(
    ...resultat.defauts.map((d, index) => {
      const li = document.createElement('li');
      li.className = `defaut ${d.gravite}`;
      li.dataset.index = index;
      li.dataset.zone = d.zone;
      li.tabIndex = 0;
      li.textContent = `${LIBELLES[d.gravite]} · ${d.libelle} (${d.code})`;
      li.addEventListener('click', () => activerDefaut(index));
      li.addEventListener('keydown', (event) => event.key === 'Enter' && activerDefaut(index));
      return li;
    }),
  );
  voiture.afficherDefauts(resultat.defauts);
  choisirCarrosserie(resultat.carrosserie);
  zoneResultat.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

for (const entree of [champ, champPhoto]) {
  entree.addEventListener('change', () => entree.files[0] && envoyer(entree.files[0]));
}
document.querySelector('#choisir').addEventListener('click', () => champ.click());
document.querySelector('#prendre-photo').addEventListener('click', () => champPhoto.click());
document.querySelector('#exemple').addEventListener('click', async () => {
  afficher('Chargement de l’exemple…');
  try {
    const reponse = await fetch('/api/exemple');
    montrerResultat(await reponse.json());
    afficher('');
  } catch {
    afficher('Impossible de charger l’exemple.', 'erreur');
  }
});

// Un fichier lâché à côté de la zone ne doit pas ouvrir le PDF à la place du site.
window.addEventListener('dragover', (event) => {
  event.preventDefault();
  zone.classList.add('survol');
});
window.addEventListener('dragleave', (event) => {
  if (!event.relatedTarget) zone.classList.remove('survol');
});
window.addEventListener('drop', (event) => {
  event.preventDefault();
  zone.classList.remove('survol');
  const [fichier] = event.dataTransfer.files;
  if (fichier) envoyer(fichier);
});
