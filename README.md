# Soirée Karaoké 🎤

Une petite application pour organiser une soirée karaoké : chaque chanteur
choisit son titre depuis son téléphone, et la file d'attente s'affiche en
direct sur l'écran de l'animateur (ton ordinateur, branché à la télé ou au
vidéoprojecteur par exemple).

Tout fonctionne **en local, sur ton Wi-Fi** : pas de compte à créer, pas
besoin d'internet pendant la soirée (juste une fois, avant, si tu veux
installer l'option QR code — voir plus bas).

## Installation (à faire une fois, avant la soirée)

Il te faut [Node.js](https://nodejs.org) installé sur l'ordinateur qui
servira d'écran animateur (télécharge la version "LTS").

1. Décompresse ce dossier où tu veux sur ton ordinateur.
2. Ouvre un terminal dans ce dossier.
3. (Optionnel mais recommandé) Installe le petit module qui génère le QR
   code à scanner :
   ```
   npm install
   ```
   Si cette étape échoue ou que tu la sautes, l'application fonctionne
   quand même — il faudra juste taper l'adresse affichée dans le
   navigateur du téléphone au lieu de scanner un QR code.

## Le soir de la soirée

1. Assure-toi que ton ordinateur et les téléphones des chanteurs sont
   connectés **au même réseau Wi-Fi** (la box de la maison, ou un
   partage de connexion si tu es ailleurs).
2. Dans le terminal, toujours dans ce dossier, lance :
   ```
   npm start
   ```
3. Le terminal affiche deux adresses :
   - une pour **l'écran animateur** (à ouvrir dans le navigateur de cet
     ordinateur) ;
   - une pour **les chanteurs** (à scanner en QR code depuis l'écran
     animateur, ou à taper à la main sur leur téléphone).
4. Ouvre l'adresse "écran animateur" dans un navigateur sur ton
   ordinateur, en plein écran si possible. C'est ici que la file
   d'attente s'affiche, et qu'un QR code est proposé aux chanteurs.
5. Les chanteurs scannent le QR code avec l'appareil photo de leur
   téléphone, cherchent leur titre, indiquent leur pseudo, et envoient
   leur demande — elle apparaît aussitôt dans la file de l'animateur.

Pour arrêter le serveur en fin de soirée : `Ctrl+C` dans le terminal.

## Gérer la soirée depuis l'écran animateur

- Chaque demande affiche le pseudo, le titre, l'artiste, et le numéro
  de téléphone si le chanteur l'a laissé (avec une pastille s'il veut
  rejoindre le groupe WhatsApp).
- ✓ marque un titre comme chanté (il reste visible, grisé).
- ✕ retire une demande de la file.
- "Vider la file" repart de zéro.
- "+ Ajouter un titre au catalogue" permet d'enrichir la liste des
  chansons proposées aux chanteurs (français 🇫🇷, anglais, créole),
  pendant que la soirée avance.

## Le catalogue de départ

L'application démarre avec une trentaine de titres (français, anglais,
créole) pour ne pas partir d'une liste vide. Tu peux en ajouter autant
que tu veux depuis l'écran animateur (bouton "+ Ajouter un titre").
Les titres et la file d'attente sont sauvegardés dans le dossier
`data/` — si tu redémarres le serveur, rien n'est perdu (sauf si tu
supprimes ce dossier).

## Si le QR code ne fonctionne pas / mauvaise adresse

Certains ordinateurs ont plusieurs réseaux actifs en même temps (Wi-Fi
+ Ethernet, ou un VPN) : l'application peut alors se tromper sur quelle
adresse donner en premier. Si le QR code ne mène nulle part, l'écran
animateur propose une ou plusieurs adresses de secours à taper à la
main dans le navigateur du téléphone.

## Ça ne marche pas du tout ?

- Vérifie que les téléphones sont bien sur le **même réseau Wi-Fi**
  que l'ordinateur (pas en 4G/5G).
- Certains réseaux Wi-Fi "invités" isolent les appareils entre eux
  (« isolation client ») — dans ce cas les téléphones ne peuvent pas
  joindre l'ordinateur même en étant sur le même Wi-Fi. Utilise plutôt
  le Wi-Fi principal de la maison, ou active un partage de connexion
  depuis un téléphone et connecte-y tout le monde (chanteurs + écran
  animateur).
- Un pare-feu très strict sur l'ordinateur peut aussi bloquer les
  connexions entrantes sur le port 3000 — autorise Node.js si ton
  système te le demande au premier lancement.
