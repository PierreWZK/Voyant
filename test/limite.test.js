import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creerLimite } from '../lib/limite.js';

test('refuse au-delà du plafond, puis rouvre quand la fenêtre est passée', () => {
  const autoriser = creerLimite({ max: 2, fenetreMs: 1000 });
  assert.equal(autoriser('ip', 0), true);
  assert.equal(autoriser('ip', 10), true);
  assert.equal(autoriser('ip', 20), false);
  assert.equal(autoriser('autre-ip', 20), true);
  assert.equal(autoriser('ip', 1015), true);
});
