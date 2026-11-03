import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detecterType } from '../lib/fichier.js';

const remplir = (debut) => Buffer.concat([Buffer.from(debut), Buffer.alloc(16)]);

test('reconnaît les formats acceptés par leurs premiers octets', () => {
  assert.equal(detecterType(remplir('%PDF-1.7')), 'application/pdf');
  assert.equal(detecterType(remplir([0xff, 0xd8, 0xff, 0xe0])), 'image/jpeg');
  assert.equal(detecterType(remplir([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'image/png');
  assert.equal(detecterType(remplir([0, 0, 0, 0x18, ...Buffer.from('ftypheic')])), 'image/heic');
});

test('refuse le reste, même renommé', () => {
  assert.equal(detecterType(remplir('GIF89a')), null);
  assert.equal(detecterType(remplir('<html>')), null);
  assert.equal(detecterType(Buffer.from('%PDF')), null);
  assert.equal(detecterType(undefined), null);
});
