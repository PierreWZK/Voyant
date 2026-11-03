import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verdict } from '../src/verdict.js';

const d = (gravite) => ({ code: '0', libelle: '', gravite, zone: 'moteur' });

test('un critique rend le verdict critique, même avec des mineurs', () => {
  const v = verdict([d('mineure'), d('critique'), d('majeure')]);
  assert.equal(v.niveau, 'critique');
  assert.deepEqual(v.compte, { critique: 1, majeure: 1, mineure: 1 });
});

test('un majeur sans critique rend le verdict défavorable', () => {
  assert.equal(verdict([d('mineure'), d('majeure')]).niveau, 'defavorable');
});

test('que des mineurs, ou rien, rend le verdict favorable', () => {
  assert.equal(verdict([d('mineure'), d('mineure')]).niveau, 'favorable');
  assert.deepEqual(verdict([]).compte, { critique: 0, majeure: 0, mineure: 0 });
  assert.equal(verdict([]).niveau, 'favorable');
});
