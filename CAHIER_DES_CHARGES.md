# Jour 21/30 — Voyant, ton contrôle technique en 3D

> Stack : **JavaScript**, **Vite**, **Three.js**, **Node.js** (petite API) · IA de vision **Gemini** (palier gratuit) · hébergement **Coolify**, sous-domaine `voyant.projectp.fr`.
> Durée visée : **2 h 45** pour le MVP, les bonus ensuite.
> **Simple avant tout** : un fichier à déposer, une attente, une voiture. Rien d'autre à comprendre.

Ce document est notre contrat : on le suit étape par étape, et toute décision qui s'en écarte est d'abord notée ici.

Révision du 3 novembre 2026 : le projet « Jauge » (visualiseur de données automobiles, Chart.js) est remplacé par **Voyant**. Le dossier passe de `day-21-car-data-viz` à `day-21-voyant`.

## 0. Décisions du 3 novembre

- **Nom** : Voyant, comme le témoin qui s'allume au tableau de bord.
- **Lecture du PV** : IA de vision. **Gemini** (Google AI Studio, palier gratuit, sans carte bancaire) lit le PDF ou la photo et rend les défauts en JSON. OpenAI n'a pas d'API gratuite, d'où Gemini. Si le palier gratuit ne suffit pas, on passe sur une clé payante (même code, autre clé).
- **Clé API** : dans les variables d'environnement du serveur, jamais dans le front. **Rappel pour Claude : me demander de créer et poser la clé au moment des tests réels.** D'ici là, on travaille avec un contrôle technique d'exemple et des réponses de test (section 4).
- **Voitures 3D** : rendu **réaliste**. Une silhouette générée en code avec Three.js reste stylisée (low-poly), elle ne peut pas être « super réaliste ». On utilise donc des **modèles 3D gratuits** (glTF, licence CC0 ou CC-BY créditée), éclairés par un environnement HDRI (Poly Haven, CC0).
- **Carrosseries** : citadine/berline, break, SUV, 4x4, camionnette. L'IA lit la carrosserie sur le PV et choisit le modèle ; un sélecteur permet d'en changer.
- **Look** : atelier / fiche technique. Papier millimétré clair, traits de plan, tampons « FAVORABLE » / « CONTRE-VISITE », étiquettes façon fiche d'atelier. La voiture réaliste trône au centre, comme posée sur la table à dessin.
- **Pas de jeu du jour** sur ce projet.
- **Données** : rien n'est stocké. Le fichier est analysé en mémoire puis jeté. Le dernier résultat reste dans le navigateur (localStorage) pour le revoir. Pas de compte, pas de base de données. Le site prévient que le palier gratuit de Gemini peut servir à Google pour améliorer ses modèles.

## 1. L'idée

Tu reçois ton procès-verbal de contrôle technique : trois pages de codes et de jargon. **Voyant** le lit pour toi. Tu déposes le PDF ou une photo du PV, tu patientes quelques secondes, et ta voiture apparaît en 3D avec ses défauts allumés là où ils sont : **orange** pour les défaillances mineures, **rouge** pour les majeures et les critiques. Tu tournes autour, tu zoomes, tu cliques un voyant pour lire le défaut en clair.

## 2. MVP — ce qui doit fonctionner à la fin

On avance étape par étape, chacune validée avant la suivante.

1. **Socle** : Vite (front) + Express (API) dans un seul service. Page d'accueil = page d'import, au look atelier. Une phrase d'explication, la zone de dépôt, un bouton « Essayer avec un exemple », une courte FAQ en dessous.
2. **Import** : glisser-déposer ou bouton, et sur téléphone « Prendre en photo ». PDF, JPEG, PNG, HEIC, 10 Mo au plus.
3. **Analyse** : `POST /api/analyse` envoie le fichier à Gemini avec un schéma de sortie imposé. Écran d'attente animé (le PV qui se fait « scanner »). Sans clé : réponse d'exemple, signalée comme telle.
4. **Voiture 3D** : modèle de la bonne carrosserie, rotation et déplacement à la souris ou au doigt, zoom à la molette ou au pincement. Les défauts apparaissent en voyants sur les zones concernées.
5. **Liste des défauts** à côté (en dessous sur mobile) : intitulé en clair, code, gravité, zone. Cliquer un défaut fait tourner la caméra vers sa zone ; cliquer un voyant ouvre le défaut dans la liste.
6. **Verdict** : tampon « FAVORABLE », « DÉFAVORABLE — contre-visite » ou « CRITIQUE — contre-visite sous 24 h », avec le compte des défauts par gravité.
7. En ligne sur Coolify, avec un README à jour et un aperçu de lien (Open Graph).

### Périmètre volontairement limité

- Contrôles techniques **français** des véhicules légers (catégories M1 / N1).
- Un PV à la fois, pas d'historique ni de comparaison.
- Pas de devis ni d'estimation de prix de réparation.

### À trancher pendant l'étape 4

- **Teinte des voitures** : carrosserie d'origine des modèles, ou toutes passées en blanc satiné (« maquette d'atelier ») pour que les cinq modèles aient le même rendu et que les voyants ressortent. Je proposerai les deux en capture.
- **Sources des modèles** : je proposerai une liste (lien, licence, poids) avant tout téléchargement, à valider.

## 3. Cahier des charges fonctionnel

### Gravité et couleurs

| Gravité (réforme 2018) | Conséquence | Couleur |
|---|---|---|
| Mineure | Pas de contre-visite | Orange |
| Majeure | Contre-visite sous 2 mois | Rouge |
| Critique | Contre-visite, circulation limitée au jour du contrôle | Rouge qui pulse |

Les simples observations (« à surveiller ») sont listées sans voyant.

### Des codes aux zones de la voiture

Un défaut du PV a un code de la forme `5.2.3.a.1`. Le premier chiffre donne la fonction, le libellé et la mention de côté (`AVG`, `AVD`, `ARG`, `ARD`, `AV`, `AR`, `G`, `D`) donnent l'endroit. L'IA renvoie une zone parmi une liste fermée ; si elle hésite, la fonction tranche.

| Fonction | Zones par défaut |
|---|---|
| 0 · Identification | Plaques avant/arrière, numéro de série (pied de caisse) |
| 1 · Freinage | Roues (disques, étriers) selon le côté, frein de stationnement (habitacle) |
| 2 · Direction | Train avant, volant |
| 3 · Visibilité | Pare-brise, rétroviseurs, essuie-glaces |
| 4 · Feux et électricité | Optiques avant/arrière selon le côté, batterie (moteur) |
| 5 · Essieux, roues, pneus, suspension | Roue ou train concerné |
| 6 · Châssis et carrosserie | Soubassement, carrosserie, portes, sièges |
| 7 · Équipements | Habitacle (ceintures, airbags, avertisseur) |
| 8 · Nuisances | Échappement, moteur (pollution, fuites) |

Zones fermées : `moteur`, `train_avant`, `train_arriere`, `roue_avg`, `roue_avd`, `roue_arg`, `roue_ard`, `optique_avg`, `optique_avd`, `optique_arg`, `optique_ard`, `pare_brise`, `retro_g`, `retro_d`, `habitacle`, `carrosserie`, `soubassement`, `echappement`, `plaque_av`, `plaque_ar`.

### Voiture 3D

- Contrôles d'orbite : rotation, déplacement, zoom bornés (on ne passe pas sous le sol ni dans la voiture).
- Voyants : petite pastille lumineuse + halo sur la zone, toujours lisibles (pas cachés derrière la carrosserie : légère transparence au survol).
- Plusieurs défauts sur une même zone : une seule pastille avec un chiffre.
- Bouton « Recentrer ». Rotation lente automatique tant que l'utilisateur n'a pas touché la voiture.

### Interface

- Une seule page, trois états : import → analyse → résultat. « Analyser un autre PV » ramène à l'import.
- Erreurs en clair : fichier trop lourd, format refusé, « ce document ne ressemble pas à un contrôle technique », IA indisponible (avec le bouton « Essayer avec un exemple »).
- Mobile : la voiture en haut, la liste en dessous, pas de défilement horizontal.
- Accessibilité : la liste des défauts est la version complète et lisible au clavier ; la 3D est un complément.

## 4. Cahier des charges technique

- **Front** : Vite, modules JavaScript sans framework, Three.js (`GLTFLoader`, `OrbitControls`, `RGBELoader`), compression Draco ou meshopt pour garder chaque modèle sous ~3 Mo.
- **API** : Node.js + Express, `multer` en mémoire (aucun fichier écrit sur disque), SDK `@google/genai`, modèle Gemini Flash. Sortie JSON imposée par schéma, puis validée côté serveur (gravité, zone dans la liste fermée) avant d'être renvoyée.
- **Ancrages** : chaque modèle a un petit fichier de correspondance zone → point 3D (position relative à la boîte englobante), pour placer les voyants sans retoucher les modèles.
- **Protection** : limite de taille, types MIME vérifiés, limitation du nombre d'analyses par adresse IP et par heure (le palier gratuit est plafonné).
- **Exemple et tests** : un PV fictif (`fixtures/ct-exemple.pdf` et sa photo `ct-exemple.jpg`, sans vraies données) et la réponse attendue (`fixtures/ct-exemple.json`). Tests `node --test` sur la validation de la réponse et le choix des zones.
- **Déploiement** : un seul conteneur sur Coolify, Express sert le front construit et `/api`. Mise en ligne à chaque push sur la branche principale.

## 5. Critères de réussite

- [ ] Du dépôt du fichier à la voiture affichée, sans aucune explication nécessaire.
- [ ] Le PV d'exemple (PDF et photo) donne les bons défauts, aux bonnes zones, avec les bonnes couleurs.
- [ ] La voiture se manipule à la souris et au doigt, et reste fluide sur un téléphone moyen.
- [ ] Aucun fichier conservé sur le serveur.
- [ ] Sans clé Gemini, le site fonctionne en mode exemple.

## 6. Bonus facultatifs

- Explication en langage courant de chaque défaut (« ce que ça veut dire, est-ce grave, quoi faire »).
- Export PNG de la voiture avec ses voyants.
- Vue éclatée / transparence de la carrosserie pour voir les trains et les freins.
- Lecture du kilométrage et de la date de contre-visite, avec rappel à ajouter à l'agenda (.ics).

## 7. Définition du « terminé »

Le MVP fonctionne, les critères de la section 5 sont cochés, le site est en ligne sur `voyant.projectp.fr`, le README a son lien et sa capture, et la carte du projet passe à « terminé » sur la vitrine.

## 8. À me demander pendant le projet

1. **La clé Gemini**, au moment des tests réels (section 0).
2. **Les modèles 3D** : liste des sources et licences avant téléchargement (section 2).
3. **La teinte des voitures**, sur captures (section 2).

## 9. Aperçu du lien (à faire sans me le redemander)

- Image Open Graph **1200 × 630** stylisée aux couleurs du projet : nom, accroche, technos et capture, générée avec `scripts/og/build-og.py` (ajouter le projet à la liste).
- Sur chaque page publique : `og:title`, `og:description`, `og:url`, `og:image` (adresse absolue), `og:image:width`, `og:image:height`, `og:image:alt` et `twitter:card` = `summary_large_image`.
- Vérifier en ligne que l'image répond en 200 et que les balises sont servies.

## 10. Indexation (à faire sans me le redemander)

- `robots.txt` : routes techniques (`/api`) en `Disallow`, lien vers le sitemap.
- `sitemap.xml` : les pages publiques uniquement.
- Balise `canonical` sur chaque page publique.
- Données structurées JSON-LD sur l'accueil : `WebApplication`, avec `isPartOf` ProjectP (https://projectp.fr/).
- Lien « 30 jours, 30 projets » vers https://projectp.fr/ dans le pied de page, avec les crédits des modèles 3D et de l'HDRI.
- Vérifier en ligne, puis me rappeler de soumettre `https://voyant.projectp.fr/sitemap.xml` dans Google Search Console.

## 11. Vitrine 30days30projects (avec ma validation)

Une fois le projet en ligne, **me demander mon accord**, puis seulement :

- `projects.js` : l'entrée du jour 21 passe à `status: 'done'`, avec `folder: 'day-21-voyant'`, `name: 'Voyant'`, `url`, `repo`, `image` et `description`.
- `preview-days-images/day21_voyant.png` : la capture de l'accueil, en 1600 × 900.
- `README.md` (racine et vitrine) : la ligne du jour 21 dans le tableau des 30 projets, nouveau nom et nouveau dossier.
- `scripts/specs/projects.py` : l'entrée du jour 21 suit le nouveau projet.
- Commit et push du dépôt `30days30projects`.
