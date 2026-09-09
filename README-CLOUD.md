# Version cloud — chanteurs connectés depuis n'importe quel réseau

Ce dossier est une **copie** de l'application karaoké, adaptée pour être
hébergée en ligne au lieu de tourner uniquement sur ton Wi-Fi local. Résultat :
les chanteurs peuvent envoyer leur titre depuis n'importe quel réseau (4G,
5G, un autre Wi-Fi...), pas seulement celui de la salle.

Le dossier `karaoke-app` original (Wi-Fi local) n'a pas été touché — il
fonctionne exactement comme avant si tu préfères continuer à l'utiliser
pour des soirées où tout le monde est sur place.

## Ce qui a changé dans le code

- **`PUBLIC_URL`** (variable d'environnement) : si elle est définie, le lien
  et le QR code donnés aux chanteurs pointent vers cette adresse publique
  au lieu de l'IP Wi-Fi locale. Si elle n'est pas définie, l'app se comporte
  exactement comme la version locale (rien de cassé).
- **`HOST_PIN`** (variable d'environnement, optionnelle mais recommandée) :
  un code que l'animateur doit saisir (icône 🔒 sur l'écran animateur) pour
  ajouter un titre, marquer un titre chanté, retirer une demande ou vider la
  file. Utile en ligne, car n'importe qui tombant sur le lien du serveur
  pourrait sinon manipuler la file d'attente. Le formulaire des chanteurs
  (choisir un titre, envoyer sa demande) n'a jamais besoin de ce code.
- **`DATA_DIR`** (optionnelle) : dossier où sont sauvegardés le catalogue et
  la file d'attente. À utiliser seulement si ton hébergeur propose un
  disque persistant (voir plus bas).

## ⚠️ Stockage des données : à savoir avant de choisir un hébergeur

Sur la plupart des offres **gratuites** (Render free, Railway free, Fly.io
free), le disque du serveur est **éphémère** : si le service redémarre, se
met en veille (le plan gratuit de Render s'endort après 15 minutes
d'inactivité) ou est redéployé, le dossier `data/` repart de zéro — le
catalogue redevient la liste de départ, et la file d'attente est vidée.

Pour une soirée karaoké, ce n'est en général pas gênant (on repart de zéro
à chaque soirée de toute façon). Si tu veux que ça survive à un redémarrage
en pleine soirée, il faudra un disque persistant, ce qui est payant chez la
plupart des hébergeurs — dans ce cas, monte-le et pointe `DATA_DIR` dessus.

## Déployer sur Render (gratuit, recommandé pour commencer)

1. Mets ce dossier `karaoke-app-cloud` dans un dépôt Git (GitHub, GitLab...).
   Si tu ne sais pas faire, dis-le moi et je t'accompagne.
2. Va sur [render.com](https://render.com), crée un compte gratuit.
3. "New +" → "Web Service" → connecte ton dépôt Git.
4. Render détecte le `render.yaml` inclus dans ce dossier et pré-remplit
   les réglages (Node, `npm install`, `npm start`). Sinon, renseigne-les
   manuellement :
   - Build command : `npm install`
   - Start command : `npm start`
5. Dans "Environment", ajoute les variables :
   - `PUBLIC_URL` = l'URL que Render t'attribue, ex.
     `https://soiree-karaoke.onrender.com` (visible une fois le premier
     déploiement lancé — tu peux la mettre à jour ensuite si besoin, un
     redéploiement suffit).
   - `HOST_PIN` = un code de ton choix, ex. `4821` (recommandé).
6. Déploie. Une fois prêt, ouvre `https://<ton-adresse>.onrender.com/?role=host`
   sur ton ordinateur/tablette pour l'écran animateur, et partage le QR
   code affiché avec les chanteurs — il fonctionnera depuis n'importe quel
   réseau.

### Alternatives équivalentes

Railway et Fly.io fonctionnent sur le même principe (Node.js, variables
`PUBLIC_URL` et `HOST_PIN`, disque éphémère sur l'offre gratuite) ; les
étapes de déploiement diffèrent légèrement dans leur interface mais le code
de ce dossier fonctionne tel quel sur les deux.

## Utiliser encore le mode Wi-Fi local avec cette même copie

Rien n'empêche de lancer aussi ce dossier `karaoke-app-cloud` en local :
si tu ne définis ni `PUBLIC_URL` ni `HOST_PIN`, `npm start` te donne
exactement l'expérience Wi-Fi local d'origine.
