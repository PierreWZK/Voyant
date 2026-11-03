import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { positionZone } from './zones3d.js';

const COULEURS = { mineure: '#d9730d', majeure: '#b8322a', critique: '#b8322a' };
// Kenney n'a ni break ni 4x4 : le break prend la citadine sportive, le 4x4 partage le SUV.
const MODELES = { berline: 'sedan.glb', break: 'hatchback-sports.glb', suv: 'suv.glb', '4x4': 'suv.glb', camionnette: 'van.glb' };
const LONGUEUR = 4.4;

const chargeur = new GLTFLoader();
const cacheModeles = new Map();

function charger(fichier) {
  if (!cacheModeles.has(fichier)) cacheModeles.set(fichier, chargeur.loadAsync(`/models/${fichier}`));
  return cacheModeles.get(fichier);
}

// Pose le modèle sur le sol, centré, longueur alignée sur x, à la taille du cahier des charges.
function normaliser(modele) {
  const groupe = new THREE.Group();
  groupe.add(modele);
  groupe.updateMatrixWorld(true);
  let boite = new THREE.Box3().setFromObject(groupe);
  const taille = boite.getSize(new THREE.Vector3());
  if (taille.z > taille.x) {
    modele.rotation.y = Math.PI / 2;
    groupe.updateMatrixWorld(true);
    boite = new THREE.Box3().setFromObject(groupe);
  }
  groupe.scale.setScalar(LONGUEUR / boite.getSize(new THREE.Vector3()).x);
  groupe.updateMatrixWorld(true);
  boite = new THREE.Box3().setFromObject(groupe);
  const centre = boite.getCenter(new THREE.Vector3());
  groupe.position.set(-centre.x, -boite.min.y, -centre.z);
  return { groupe, dimensions: boite.getSize(new THREE.Vector3()) };
}

// Halo lumineux, dessiné une fois puis partagé par tous les voyants.
function creerHalo() {
  const toile = document.createElement('canvas');
  toile.width = toile.height = 128;
  const ctx = toile.getContext('2d');
  const degrade = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  degrade.addColorStop(0, 'rgba(255,255,255,1)');
  degrade.addColorStop(0.35, 'rgba(255,255,255,0.8)');
  degrade.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = degrade;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(toile);
}

export function creerVoiture3D(conteneur, { surVoyant } = {}) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(4.5, 2.4, 6);

  const rendu = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  rendu.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  conteneur.replaceChildren(rendu.domElement);

  scene.add(new THREE.HemisphereLight('#ffffff', '#8a8273', 1.6));
  const soleil = new THREE.DirectionalLight('#ffffff', 1.4);
  soleil.position.set(4, 6, 5);
  scene.add(soleil);

  const commandes = new OrbitControls(camera, rendu.domElement);
  commandes.enableDamping = true;
  commandes.minDistance = 3;
  commandes.maxDistance = 10;
  commandes.target.set(0, 0.7, 0);
  commandes.maxPolarAngle = Math.PI * 0.49;

  const halo = creerHalo();
  const voyants = new Map();
  let defauts = [];
  let dimensions = { longueur: LONGUEUR, hauteur: 1.5, largeur: 1.8 };
  let modeleActuel = null;
  let cibleCamera = null;
  let demande = 0;

  function ajusterTaille() {
    const { clientWidth: l, clientHeight: h } = conteneur;
    rendu.setSize(l, h, false);
    camera.aspect = l / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(ajusterTaille).observe(conteneur);

  // Un clic sur un voyant renvoie son défaut à la liste.
  const rayon = new THREE.Raycaster();
  const pointeur = new THREE.Vector2();
  rendu.domElement.addEventListener('click', (event) => {
    const { left, top, width, height } = rendu.domElement.getBoundingClientRect();
    pointeur.set(((event.clientX - left) / width) * 2 - 1, -((event.clientY - top) / height) * 2 + 1);
    rayon.setFromCamera(pointeur, camera);
    const touche = rayon.intersectObjects([...voyants.values()])[0];
    if (touche) surVoyant?.(touche.object.userData.index);
  });

  // Chaque défaut a son voyant, posé sur sa zone dans les dimensions du modèle affiché.
  function placerVoyants() {
    defauts.forEach((d, index) => {
      const voyant = voyants.get(index);
      if (voyant) voyant.position.set(...positionZone(d.zone, dimensions));
    });
  }

  function afficherDefauts(nouveaux) {
    for (const voyant of voyants.values()) scene.remove(voyant);
    voyants.clear();
    defauts = nouveaux;
    defauts.forEach((d, index) => {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: COULEURS[d.gravite], depthTest: false, transparent: true }));
      sprite.scale.set(0.34, 0.34, 1);
      sprite.renderOrder = 1;
      sprite.userData = { index, critique: d.gravite === 'critique' };
      voyants.set(index, sprite);
      scene.add(sprite);
    });
    placerVoyants();
  }

  // Charge le modèle de la carrosserie ; si un choix plus récent arrive entre-temps, il l'emporte.
  async function changerCarrosserie(carrosserie) {
    const numero = ++demande;
    const gltf = await charger(MODELES[carrosserie] ?? MODELES.berline);
    if (numero !== demande) return;
    if (modeleActuel) scene.remove(modeleActuel);
    const { groupe, dimensions: nouvelles } = normaliser(gltf.scene.clone(true));
    dimensions = { longueur: nouvelles.x, hauteur: nouvelles.y, largeur: nouvelles.z };
    modeleActuel = groupe;
    scene.add(groupe);
    placerVoyants();
  }

  // Tourne la caméra vers une zone, sans toucher au zoom.
  function viserZone(zone) {
    cibleCamera = new THREE.Vector3(...positionZone(zone, dimensions));
  }

  rendu.setAnimationLoop((temps) => {
    for (const voyant of voyants.values()) {
      if (voyant.userData.critique) {
        const pouls = 1 + Math.sin(temps / 220) * 0.25;
        voyant.scale.set(0.34 * pouls, 0.34 * pouls, 1);
      }
    }
    if (cibleCamera) {
      commandes.target.lerp(cibleCamera, 0.12);
      if (commandes.target.distanceTo(cibleCamera) < 0.01) cibleCamera = null;
    }
    commandes.update();
    rendu.render(scene, camera);
  });

  ajusterTaille();
  return { afficherDefauts, changerCarrosserie, viserZone, redimensionner: ajusterTaille };
}
