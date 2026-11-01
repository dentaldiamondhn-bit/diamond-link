import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDoctorOptions,
  collectTreatmentDoctors,
  isValidDateRange,
  matchesDateRange,
  matchesDoctorFilter,
  normalizeDoctorName,
} from '../src/lib/treatments/completedTreatmentFilters.ts';
import type { FilterableTreatment } from '../src/lib/treatments/completedTreatmentFilters.ts';

describe('normalizeDoctorName', () => {
  test('trims, lowercases and collapses internal whitespace so the same doctor matches', () => {
    assert.equal(normalizeDoctorName('  Dr.   Juan   Pérez '), 'dr. juan pérez');
  });

  test('returns an empty string for names that carry no information', () => {
    assert.equal(normalizeDoctorName(undefined), '');
    assert.equal(normalizeDoctorName(null), '');
    assert.equal(normalizeDoctorName('   '), '');
  });
});

describe('collectTreatmentDoctors', () => {
  test('collects the assigned doctor and every treating doctor, assigned first', () => {
    const treatment: FilterableTreatment = {
      paciente: { doctor: 'Dra. Ana Ruiz' },
      tratamientos_realizados: [{ doctor_name: 'Dr. Luis Paz' }],
    };

    assert.deepEqual(collectTreatmentDoctors(treatment), [
      { key: 'dra. ana ruiz', label: 'Dra. Ana Ruiz' },
      { key: 'dr. luis paz', label: 'Dr. Luis Paz' },
    ]);
  });

  test('skips empty names and the "No especificado" placeholder', () => {
    const treatment: FilterableTreatment = {
      paciente: { doctor: 'No especificado' },
      tratamientos_realizados: [{ doctor_name: '  ' }, { doctor_name: 'Dr. Luis Paz' }],
    };

    assert.deepEqual(collectTreatmentDoctors(treatment), [
      { key: 'dr. luis paz', label: 'Dr. Luis Paz' },
    ]);
  });

  test('lists a doctor once when the same person is assigned and treating', () => {
    const treatment: FilterableTreatment = {
      paciente: { doctor: 'Dr. Luis Paz' },
      tratamientos_realizados: [{ doctor_name: 'dr. luis paz' }, { doctor_name: 'Dr. Luis Paz' }],
    };

    assert.deepEqual(collectTreatmentDoctors(treatment), [
      { key: 'dr. luis paz', label: 'Dr. Luis Paz' },
    ]);
  });

  test('returns an empty list when the treatment carries no doctor at all', () => {
    assert.deepEqual(collectTreatmentDoctors({}), []);
  });
});

describe('buildDoctorOptions', () => {
  test('counts each treatment once per doctor and sorts the options alphabetically', () => {
    const options = buildDoctorOptions([
      [{ key: 'ana ruiz', label: 'Ana Ruiz' }, { key: 'luis paz', label: 'Luis Paz' }],
      [{ key: 'ana ruiz', label: 'Ana Ruiz' }],
      [{ key: 'luis paz', label: 'Luis Paz' }, { key: 'maría sol', label: 'María Sol' }],
    ]);

    assert.deepEqual(options, [
      { value: 'ana ruiz', label: 'Ana Ruiz', count: 2 },
      { value: 'luis paz', label: 'Luis Paz', count: 2 },
      { value: 'maría sol', label: 'María Sol', count: 1 },
    ]);
  });

  test('uses the most common spelling as the option label', () => {
    const options = buildDoctorOptions([
      [{ key: 'ana ruiz', label: 'Ana Ruiz' }],
      [{ key: 'ana ruiz', label: 'Ana Ruiz' }],
      [{ key: 'ana ruiz', label: 'ana ruiz' }],
    ]);

    assert.deepEqual(options, [{ value: 'ana ruiz', label: 'Ana Ruiz', count: 3 }]);
  });

  test('returns no options when no treatment carries a doctor', () => {
    assert.deepEqual(buildDoctorOptions([[], []]), []);
  });
});

describe('matchesDoctorFilter', () => {
  test('keeps every treatment when no doctor is selected', () => {
    assert.equal(matchesDoctorFilter([{ key: 'ana ruiz', label: 'Ana Ruiz' }], ''), true);
  });

  test('matches a treatment whose assigned doctor is the selection', () => {
    const refs = collectTreatmentDoctors({ paciente: { doctor: 'Ana Ruiz' } });
    assert.equal(matchesDoctorFilter(refs, 'ana ruiz'), true);
  });

  test('matches a treatment whose treating doctor is the selection', () => {
    const refs = collectTreatmentDoctors({ tratamientos_realizados: [{ doctor_name: 'Luis Paz' }] });
    assert.equal(matchesDoctorFilter(refs, 'luis paz'), true);
  });

  test('rejects a treatment that mentions neither the selected nor another doctor', () => {
    const refs = collectTreatmentDoctors({ paciente: { doctor: 'Ana Ruiz' } });
    assert.equal(matchesDoctorFilter(refs, 'luis paz'), false);
  });
});

describe('matchesDateRange', () => {
  test('keeps every treatment when no bound is set', () => {
    assert.equal(matchesDateRange('2026-02-10', '', ''), true);
  });

  test('keeps a treatment whose date equals the lower bound', () => {
    assert.equal(matchesDateRange('2026-02-10', '2026-02-10', ''), true);
  });

  test('keeps a treatment whose date equals the upper bound', () => {
    assert.equal(matchesDateRange('2026-02-10', '', '2026-02-10'), true);
  });

  test('rejects a treatment that falls before the lower bound', () => {
    assert.equal(matchesDateRange('2026-02-09', '2026-02-10', ''), false);
  });

  test('rejects a treatment that falls after the upper bound', () => {
    assert.equal(matchesDateRange('2026-02-11', '', '2026-02-10'), false);
  });

  test('rejects a treatment without a date once a bound is set', () => {
    assert.equal(matchesDateRange('', '2026-02-10', ''), false);
  });

  test('keeps a treatment without a date when no bound is set', () => {
    assert.equal(matchesDateRange('', '', ''), true);
  });
});

describe('isValidDateRange', () => {
  test('accepts a range whose lower bound is not after its upper bound', () => {
    assert.equal(isValidDateRange('2026-02-10', '2026-02-12'), true);
  });

  test('accepts an open-ended range', () => {
    assert.equal(isValidDateRange('2026-02-10', ''), true);
    assert.equal(isValidDateRange('', '2026-02-12'), true);
  });

  test('rejects a range whose lower bound is after its upper bound', () => {
    assert.equal(isValidDateRange('2026-02-13', '2026-02-12'), false);
  });
});
