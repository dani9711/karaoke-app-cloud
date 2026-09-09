// Serveur de la soirée karaoké — AUCUNE dépendance externe requise.
// - Sert la page (public/index.html) aux chanteurs et à l'animateur.
// - Garde le catalogue et la file d'attente en mémoire, sauvegardés
//   dans des fichiers JSON (data/) pour survivre à un redémarrage.
//
// Deux modes, sans rien changer au code :
// - Mode Wi-Fi local (par défaut) : tout le monde doit être sur le même
//   réseau Wi-Fi que cet ordinateur — aucun compte, aucune connexion
//   internet nécessaire pendant la soirée.
// - Mode hébergement cloud : si la variable d'environnement PUBLIC_URL
//   est définie (ex: https://soireekaraoke.onrender.com), l'app l'utilise
//   pour le lien/QR code des chanteurs à la place de l'adresse Wi-Fi
//   locale — les chanteurs peuvent alors se connecter depuis n'importe
//   quel réseau (4G/5G compris). Voir README-CLOUD.md.
//
// Le QR code affiché sur l'écran animateur est un bonus optionnel : si
// le petit paquet "qrcode" est installé (npm install), il s'affiche ;
// sinon l'app fonctionne quand même, il suffit de taper l'adresse
// affichée dans le navigateur du téléphone.
//
// Protection optionnelle : si la variable d'environnement HOST_PIN est
// définie, les actions "animateur" (ajouter un titre, marquer chanté,
// retirer, vider la file) demandent ce code — utile en mode cloud, où
// n'importe qui trouvant le lien pourrait sinon gérer la file. Si
// HOST_PIN n'est pas définie, tout reste ouvert comme avant.

const http = require('http');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

let QRCode = null;
try { QRCode = require('qrcode'); } catch (e) { /* optionnel, tant pis */ }

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
// PUBLIC_URL (optionnel) : ex. "https://soireekaraoke.onrender.com".
// Si défini, sert de base au lien/QR code des chanteurs à la place de
// l'adresse Wi-Fi locale — permet de rejoindre depuis n'importe quel réseau.
const PUBLIC_URL = process.env.PUBLIC_URL ? process.env.PUBLIC_URL.replace(/\/+$/, '') : null;
// HOST_PIN (optionnel) : code demandé pour les actions animateur.
const HOST_PIN = process.env.HOST_PIN ? String(process.env.HOST_PIN) : null;
// DATA_DIR (optionnel) : par défaut à côté du code ; sur un hébergeur
// cloud sans disque persistant, ce dossier est réinitialisé à chaque
// redéploiement/redémarrage (voir README-CLOUD.md). Si l'hébergeur
// fournit un disque persistant monté ailleurs, pointer DATA_DIR dessus.
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');
const CATALOG_FILE = path.join(DATA_DIR, 'catalog.json');
const QUEUE_FILE = path.join(DATA_DIR, 'queue.json');

const STARTER_CATALOG = [
  { t: 'Formidable', a: 'Stromae', l: 'fr' },
  { t: 'Papaoutai', a: 'Stromae', l: 'fr' },
  { t: 'Djadja', a: 'Aya Nakamura', l: 'fr' },
  { t: 'Pookie', a: 'Aya Nakamura', l: 'fr' },
  { t: "L'envie d'aimer", a: 'Daniel Levi', l: 'fr' },
  { t: "Comme d'habitude", a: 'Claude François', l: 'fr' },
  { t: 'Ma direction', a: 'Kaaris', l: 'fr' },
  { t: 'Je te promets', a: 'Johnny Hallyday', l: 'fr' },
  { t: 'La Boheme', a: 'Charles Aznavour', l: 'fr' },
  { t: 'Dernière danse', a: 'Indila', l: 'fr' },
  { t: 'Zouk la se sel medikaman nou ni', a: "Kassav'", l: 'cr' },
  { t: 'Syé Bwè', a: "Kassav'", l: 'cr' },
  { t: 'Ba Y Sa Y Vlé', a: 'Admiral T', l: 'cr' },
  { t: 'Chirurgien', a: 'Admiral T', l: 'cr' },
  { t: 'Ti Sourit', a: 'Perle Lama', l: 'cr' },
  { t: 'Bwa Patat', a: 'Francky Vincent', l: 'cr' },
  { t: 'Zouk Party', a: 'Francky Vincent', l: 'cr' },
  { t: 'An Ba Chenn Lan', a: 'Krys', l: 'cr' },
  { t: 'Séré Mwen', a: 'Fanny J', l: 'cr' },
  { t: 'Ay Manman', a: 'Tanya St-Val', l: 'cr' },
  { t: 'Bohemian Rhapsody', a: 'Queen', l: 'en' },
  { t: "Don't Stop Me Now", a: 'Queen', l: 'en' },
  { t: 'Shape of You', a: 'Ed Sheeran', l: 'en' },
  { t: 'Perfect', a: 'Ed Sheeran', l: 'en' },
  { t: 'Halo', a: 'Beyoncé', l: 'en' },
  { t: 'Rolling in the Deep', a: 'Adele', l: 'en' },
  { t: 'Someone Like You', a: 'Adele', l: 'en' },
  { t: 'I Want It That Way', a: 'Backstreet Boys', l: 'en' },
  { t: 'My Way', a: 'Frank Sinatra', l: 'en' },
  { t: 'Uptown Funk', a: 'Bruno Mars', l: 'en' },
  { t: "Sweet Child O' Mine", a: "Guns N' Roses", l: 'en' },
  { t: 'Billie Jean', a: 'Michael Jackson', l: 'en' }
];

function uid() {
  return 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadJson(file, fallback) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (e) {
    console.error('Lecture impossible de ' + file + ', on repart de zéro.', e.message);
  }
  return fallback;
}

function saveJson(file, data) {
  ensureDataDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

ensureDataDir();

let catalog = loadJson(CATALOG_FILE, null);
if (!catalog || !Array.isArray(catalog) || !catalog.length) {
  catalog = STARTER_CATALOG.map((s) => ({ id: uid(), title: s.t, artist: s.a, lang: s.l }));
  saveJson(CATALOG_FILE, catalog);
}

let queue = loadJson(QUEUE_FILE, []);
if (!Array.isArray(queue)) queue = [];

// Un ordinateur a souvent plusieurs réseaux actifs à la fois (Wi-Fi,
// Ethernet, VPN...). On les liste tous : la première sert d'adresse
// par défaut, les autres sont proposées en secours si le QR code ne
// fonctionne pas (mauvais réseau détecté en premier).
function getLanIps() {
  const ifaces = os.networkInterfaces();
  const preferredNames = [];
  const otherNames = [];
  for (const name of Object.keys(ifaces)) {
    if (/^(wi-?fi|wlan|en0|en1)/i.test(name)) preferredNames.push(name);
    else otherNames.push(name);
  }
  const ips = [];
  for (const name of preferredNames.concat(otherNames)) {
    for (const iface of ifaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal && ips.indexOf(iface.address) === -1) {
        ips.push(iface.address);
      }
    }
  }
  return ips.length ? ips : ['127.0.0.1'];
}

function getLanIp() {
  return getLanIps()[0];
}

// ---- petit routeur maison (pas de dépendance à express) ----

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function hostPinOk(req) {
  if (!HOST_PIN) return true; // pas de protection configurée : comportement inchangé
  return req.headers['x-host-pin'] === HOST_PIN;
}

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data)
  });
  res.end(data);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 1024 * 1024) { reject(new Error('corps trop volumineux')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch (e) { reject(new Error('JSON invalide')); }
    });
    req.on('error', reject);
  });
}

function serveStatic(req, res, pathname) {
  let rel = pathname === '/' ? '/index.html' : pathname;
  // sécurité minimale : pas de remontée de dossier
  rel = rel.replace(/\.\.+/g, '');
  const filePath = path.join(PUBLIC_DIR, rel);
  if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end('Interdit'); }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Introuvable'); }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  let pathname;
  try {
    pathname = new URL(req.url, 'http://localhost').pathname;
  } catch (e) {
    res.writeHead(400); return res.end('Requête invalide');
  }
  const method = req.method;

  try {
    // GET /api/catalog
    if (method === 'GET' && pathname === '/api/catalog') {
      return sendJson(res, 200, { catalog });
    }

    // POST /api/catalog  { title, artist, lang }  — action animateur
    if (method === 'POST' && pathname === '/api/catalog') {
      if (!hostPinOk(req)) return sendJson(res, 401, { error: 'code animateur requis ou incorrect' });
      const body = await readJsonBody(req);
      const title = String(body.title || '').trim();
      const artist = String(body.artist || '').trim();
      const lang = String(body.lang || 'fr').trim();
      if (!title || !artist) return sendJson(res, 400, { error: 'title et artist sont requis' });
      const song = { id: uid(), title, artist, lang };
      catalog.push(song);
      saveJson(CATALOG_FILE, catalog);
      return sendJson(res, 200, { ok: true, song });
    }

    // GET /api/queue
    if (method === 'GET' && pathname === '/api/queue') {
      return sendJson(res, 200, { queue });
    }

    // POST /api/queue  { pseudo, title, artist, phone, wa }
    if (method === 'POST' && pathname === '/api/queue') {
      const body = await readJsonBody(req);
      const pseudo = String(body.pseudo || '').trim();
      const title = String(body.title || '').trim();
      const artist = String(body.artist || '').trim();
      const phone = String(body.phone || '').trim();
      const wa = !!(body.wa && phone);
      if (!pseudo || !title || !artist) return sendJson(res, 400, { error: 'pseudo, title et artist sont requis' });
      const entry = { id: uid(), pseudo, title, artist, phone, wa, ts: Date.now(), status: 'attente' };
      queue.push(entry);
      saveJson(QUEUE_FILE, queue);
      return sendJson(res, 200, { ok: true, entry });
    }

    // POST /api/queue/:id/done — action animateur
    let m = pathname.match(/^\/api\/queue\/([^/]+)\/done$/);
    if (method === 'POST' && m) {
      if (!hostPinOk(req)) return sendJson(res, 401, { error: 'code animateur requis ou incorrect' });
      const id = decodeURIComponent(m[1]);
      let found = false;
      queue = queue.map((x) => { if (x.id === id) { found = true; return Object.assign({}, x, { status: 'done' }); } return x; });
      if (!found) return sendJson(res, 404, { error: 'introuvable' });
      saveJson(QUEUE_FILE, queue);
      return sendJson(res, 200, { ok: true });
    }

    // DELETE /api/queue/:id — action animateur
    m = pathname.match(/^\/api\/queue\/([^/]+)$/);
    if (method === 'DELETE' && m) {
      if (!hostPinOk(req)) return sendJson(res, 401, { error: 'code animateur requis ou incorrect' });
      const id = decodeURIComponent(m[1]);
      const before = queue.length;
      queue = queue.filter((x) => x.id !== id);
      if (queue.length === before) return sendJson(res, 404, { error: 'introuvable' });
      saveJson(QUEUE_FILE, queue);
      return sendJson(res, 200, { ok: true });
    }

    // POST /api/queue/clear — action animateur
    if (method === 'POST' && pathname === '/api/queue/clear') {
      if (!hostPinOk(req)) return sendJson(res, 401, { error: 'code animateur requis ou incorrect' });
      queue = [];
      saveJson(QUEUE_FILE, queue);
      return sendJson(res, 200, { ok: true });
    }

    // GET /api/join-info
    if (method === 'GET' && pathname === '/api/join-info') {
      let url, alternateUrls, ip;
      if (PUBLIC_URL) {
        // Mode cloud : un seul lien public, valable depuis n'importe quel réseau.
        url = PUBLIC_URL + '/?role=singer';
        alternateUrls = [];
        ip = null;
      } else {
        // Mode Wi-Fi local (comportement d'origine, inchangé).
        const ips = getLanIps();
        ip = ips[0];
        url = 'http://' + ip + ':' + PORT + '/?role=singer';
        alternateUrls = ips.slice(1).map((altIp) => 'http://' + altIp + ':' + PORT + '/?role=singer');
      }
      let qrDataUrl = null;
      if (QRCode) {
        try { qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 260 }); }
        catch (e) { qrDataUrl = null; }
      }
      return sendJson(res, 200, { url, qrDataUrl, ip, port: PORT, alternateUrls, cloud: !!PUBLIC_URL, requirePin: !!HOST_PIN });
    }

    // le reste : fichiers statiques (page unique)
    if (method === 'GET') {
      return serveStatic(req, res, pathname);
    }

    res.writeHead(404); res.end('Introuvable');
  } catch (e) {
    console.error(e);
    sendJson(res, 500, { error: e.message || 'erreur serveur' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('🎤  Soirée karaoké prête !');
  console.log('');
  if (PUBLIC_URL) {
    console.log('   Mode cloud — lien valable depuis n\'importe quel réseau :');
    console.log('   Écran animateur : ' + PUBLIC_URL + '/?role=host');
    console.log('   Chanteurs       : ' + PUBLIC_URL + '/?role=singer');
    if (HOST_PIN) console.log('   Code animateur activé (HOST_PIN).');
    else console.log('   Aucun code animateur configuré — toute personne avec le lien peut gérer la file (voir README-CLOUD.md).');
  } else {
    const ips = getLanIps();
    console.log('   Sur cet ordinateur (écran animateur) : http://localhost:' + PORT + '/?role=host');
    console.log('   Pour les chanteurs (même Wi-Fi)      : http://' + ips[0] + ':' + PORT + '/?role=singer');
    if (ips.length > 1) {
      console.log('   (si ça ne marche pas, essaie plutôt : ' + ips.slice(1).map((i) => 'http://' + i + ':' + PORT + '/?role=singer').join(' ou ') + ')');
    }
  }
  console.log('');
  if (!QRCode) {
    console.log('   (Astuce : lance "npm install" puis relance le serveur pour afficher');
    console.log('    aussi un QR code à scanner sur l\'écran animateur.)');
    console.log('');
  }
});
