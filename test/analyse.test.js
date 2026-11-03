import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normaliserReponse, exempleCt } from '../lib/analyse.js';

test('écarte les défauts hors listes fermées sans perdre les bons', () => {
  const resultat = normaliserReponse({
    carrosserie: 'soucoupe',
    defauts: [
      { code: '1', libelle: 'ok', gravite: 'majeure', zone: 'roue_avd' },
      { code: '2', libelle: 'zone inventée', gravite: 'mineure', zone: 'toit' },
      { code: '3', libelle: 'gravité inventée', gravite: 'grave', zone: 'moteur' },
    ],
  });
  assert.equal(resultat.carrosserie, 'berline');
  assert.deepEqual(resultat.defauts.map((d) => d.code), ['1']);
});

test('tolère une réponse vide ou mal formée', () => {
  assert.deepEqual(normaliserReponse(null), { carrosserie: 'berline', defauts: [] });
  assert.deepEqual(normaliserReponse({ defauts: 'n’importe quoi' }).defauts, []);
});

test('l’exemple de référence passe la validation sans rien perdre', async () => {
  const exemple = await exempleCt();
  assert.equal(exemple.defauts.length, 4);
  assert.equal(exemple.carrosserie, 'break');
});
