import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { TAILLE_MAX, detecterType } from './lib/fichier.js';
import { analyserAvecGemini, exempleCt } from './lib/analyse.js';
import { creerLimite } from './lib/limite.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const port = process.env.PORT || 3000;

const app = express();
// Derrière le proxy de Coolify : l'adresse du visiteur est dans X-Forwarded-For.
app.set('trust proxy', 1);
// Le palier gratuit de Gemini est plafonné : 10 analyses par heure et par adresse.
const autoriser = creerLimite({ max: 10, fenetreMs: 60 * 60 * 1000 });

// La clé Gemini ne quitte jamais le serveur : on dit seulement si elle est posée.
app.get('/api/health', (req, res) => {
  res.json({ ok: true, gemini: Boolean(process.env.GEMINI_API_KEY) });
});

// Le PV reste en mémoire le temps de la requête : rien n'est écrit sur le disque.
const envoi = multer({ storage: multer.memoryStorage(), limits: { fileSize: TAILLE_MAX, files: 1 } });

app.get('/api/exemple', async (req, res) => {
  res.json({ exemple: true, resultat: await exempleCt() });
});

app.post('/api/analyse', envoi.single('fichier'), async (req, res) => {
  if (!req.file) return res.status(400).json({ erreur: 'Aucun fichier reçu.' });
  const type = detecterType(req.file.buffer);
  if (!type) return res.status(415).json({ erreur: 'Format refusé : envoie un PDF ou une photo (JPEG, PNG, HEIC).' });

  const cle = process.env.GEMINI_API_KEY;
  // Sans clé, on ne prétend pas lire le fichier : on renvoie l'exemple, signalé comme tel.
  if (!cle) return res.json({ exemple: true, resultat: await exempleCt() });
  if (!autoriser(req.ip)) return res.status(429).json({ erreur: 'Trop d’analyses depuis ton adresse : réessaie dans une heure.' });
  try {
    res.json({ resultat: await analyserAvecGemini(req.file.buffer, type, cle) });
  } catch (error) {
    console.error(error);
    res.status(502).json({ erreur: 'L’analyse a échoué côté IA. Réessaie dans un instant.' });
  }
});

app.use('/api', (error, req, res, next) => {
  if (!(error instanceof multer.MulterError)) return next(error);
  if (error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ erreur: 'Fichier trop lourd : 10 Mo au maximum.' });
  res.status(400).json({ erreur: 'Envoi refusé : un seul fichier à la fois.' });
});

if (isProd) {
  app.use(express.static(path.join(root, 'dist')));
} else {
  // En développement, Vite sert la page et le rechargement à chaud, sur le même port.
  const { createServer } = await import('vite');
  const vite = await createServer({ root, server: { middlewareMode: true }, appType: 'custom' });
  app.use(vite.middlewares);
  // Vite ne sert pas la page d'accueil seul en mode middleware : on la transforme ici.
  app.use(async (req, res, next) => {
    if (!req.accepts('html')) return next();
    try {
      const html = await fs.readFile(path.join(root, 'index.html'), 'utf8');
      res.type('html').send(await vite.transformIndexHtml(req.originalUrl, html));
    } catch (error) {
      vite.ssrFixStacktrace(error);
      next(error);
    }
  });
}

app.listen(port, () => console.log(`Voyant sur http://localhost:${port}`));
