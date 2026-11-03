import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

export const GRAVITES = ['mineure', 'majeure', 'critique'];
export const ZONES = [
  'moteur', 'train_avant', 'train_arriere', 'roue_avg', 'roue_avd', 'roue_arg', 'roue_ard',
  'optique_avg', 'optique_avd', 'optique_arg', 'optique_ard', 'pare_brise', 'retro_g', 'retro_d',
  'habitacle', 'carrosserie', 'soubassement', 'echappement', 'plaque_av', 'plaque_ar',
];
export const CARROSSERIES = ['berline', 'break', 'suv', '4x4', 'camionnette'];

const PROMPT = `Tu lis un procès-verbal de contrôle technique français (véhicule léger).
Pour chaque défaut relevé (défaillance mineure, majeure ou critique), donne son code, son libellé,
sa gravité, la zone de la voiture concernée parmi la liste imposée, et la carrosserie du véhicule.
Ignore les simples observations. Si tu ne sais pas où situer un défaut, choisis la zone la plus proche
de la fonction indiquée par le premier chiffre du code. N'invente aucun défaut.`;

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    carrosserie: { type: Type.STRING, enum: CARROSSERIES },
    defauts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          code: { type: Type.STRING },
          libelle: { type: Type.STRING },
          gravite: { type: Type.STRING, enum: GRAVITES },
          zone: { type: Type.STRING, enum: ZONES },
        },
        required: ['code', 'libelle', 'gravite', 'zone'],
      },
    },
  },
  required: ['carrosserie', 'defauts'],
};

// La réponse de l'IA n'est pas une source sûre : on ne garde que ce qui est dans les listes fermées.
export function normaliserReponse(brut) {
  const defauts = Array.isArray(brut?.defauts) ? brut.defauts : [];
  return {
    carrosserie: CARROSSERIES.includes(brut?.carrosserie) ? brut.carrosserie : 'berline',
    defauts: defauts
      .filter((d) => GRAVITES.includes(d?.gravite) && ZONES.includes(d?.zone))
      .map(({ code, libelle, gravite, zone }) => ({
        code: String(code ?? '').slice(0, 20),
        libelle: String(libelle ?? '').slice(0, 200),
        gravite,
        zone,
      })),
  };
}

export async function exempleCt() {
  const brut = await fs.readFile(path.join(root, 'fixtures', 'ct-exemple.json'), 'utf8');
  return normaliserReponse(JSON.parse(brut));
}

// Le fichier est envoyé à Gemini puis oublié : rien n'est gardé côté serveur.
export async function analyserAvecGemini(octets, type, cle) {
  const ia = new GoogleGenAI({ apiKey: cle });
  const reponse = await ia.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{
      role: 'user',
      parts: [{ inlineData: { mimeType: type, data: octets.toString('base64') } }, { text: PROMPT }],
    }],
    config: { responseMimeType: 'application/json', responseSchema: SCHEMA },
  });
  return normaliserReponse(JSON.parse(reponse.text));
}
