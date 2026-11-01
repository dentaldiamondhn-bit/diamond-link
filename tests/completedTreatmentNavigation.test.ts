import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { buildNewTreatmentUrl } from '../src/lib/treatments/completedTreatmentNavigation.ts';

describe('buildNewTreatmentUrl', () => {
  test('returns null when no patient is selected', () => {
    assert.equal(buildNewTreatmentUrl(null), null);
    assert.equal(buildNewTreatmentUrl(undefined), null);
    assert.equal(buildNewTreatmentUrl(''), null);
  });

  test('targets the new-treatment form for the selected patient', () => {
    assert.equal(
      buildNewTreatmentUrl('abc-123'),
      '/tratamientos-completados/new?paciente_id=abc-123',
    );
  });

  test('encodes a patient id that contains URL-special characters', () => {
    assert.equal(
      buildNewTreatmentUrl('a b&c'),
      '/tratamientos-completados/new?paciente_id=a%20b%26c',
    );
  });
});
