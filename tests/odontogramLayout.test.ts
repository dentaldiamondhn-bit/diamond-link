import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  aplicaATodaLaPieza,
  buscarRegistroPorId,
  buscarRegistroPorVersion,
  construirHistorialOleary,
  construirHistorialRegular,
  detectarTipoPorHistorial,
  esLayoutDenticionAdulta,
  esLayoutOleary,
  etiquetaTipoOdontograma,
  filtrarRegistrosPorTipo,
  filtrarRegistrosOlearyPorTipo,
  obtenerRegistroActual,
  obtenerRegistroActualOleary,
  obtenerTipoLayoutOleary,
  obtenerTipoOdontograma,
} from '../src/lib/odontogram/odontogramLayout.ts';

const registro = (overrides: Record<string, any> = {}) => ({
  id: 'id-1',
  version: 1,
  fecha_creacion: '2026-01-01T00:00:00.000Z',
  datos_odontograma: { tipo: 'adulto', fecha: '2026-01-01' },
  ...overrides,
});

describe('obtenerTipoOdontograma', () => {
  test('reads the layout stored in the odontogram data', () => {
    assert.equal(obtenerTipoOdontograma({ tipo: 'nino' }), 'nino');
    assert.equal(obtenerTipoOdontograma({ tipo: 'oleary_adulto' }), 'oleary_adulto');
    assert.equal(obtenerTipoOdontograma({ tipo: 'oleary_nino' }), 'oleary_nino');
    assert.equal(obtenerTipoOdontograma({ tipo: 'adulto' }), 'adulto');
  });

  test('falls back to adulto when the layout is missing', () => {
    assert.equal(obtenerTipoOdontograma({}), 'adulto');
    assert.equal(obtenerTipoOdontograma(null), 'adulto');
    assert.equal(obtenerTipoOdontograma(undefined), 'adulto');
  });

  test('falls back to adulto for an unknown layout', () => {
    assert.equal(obtenerTipoOdontograma({ tipo: 'inventado' }), 'adulto');
  });

  test('falls back to adulto for a non-string layout', () => {
    assert.equal(obtenerTipoOdontograma({ tipo: 123 }), 'adulto');
  });
});

describe('aplicaATodaLaPieza', () => {
  test('aplica Ausente a toda la pieza en el layout O\'Leary', () => {
    assert.equal(aplicaATodaLaPieza('ausente', true), true);
  });

  test('aplica Placa solo a un cuadrante en el layout O\'Leary', () => {
    assert.equal(aplicaATodaLaPieza('placa', true), false);
  });

  test('aplica Sano solo a un cuadrante en el layout O\'Leary', () => {
    assert.equal(aplicaATodaLaPieza('sano', true), false);
  });

  test('aplica Cariado solo a un cuadrante en los layouts regulares', () => {
    assert.equal(aplicaATodaLaPieza('cariado', false), false);
  });

  test('aplica Ausente a toda la pieza en los layouts regulares', () => {
    assert.equal(aplicaATodaLaPieza('ausente', false), true);
  });

  test('aplica Corona a toda la pieza en los layouts regulares', () => {
    assert.equal(aplicaATodaLaPieza('corona', false), true);
  });
});

describe('etiquetaTipoOdontograma', () => {
  test('labels every layout', () => {
    assert.equal(etiquetaTipoOdontograma('adulto'), 'Adulto');
    assert.equal(etiquetaTipoOdontograma('nino'), 'Niño');
    assert.equal(etiquetaTipoOdontograma('oleary_adulto'), "O'Leary Adulto");
    assert.equal(etiquetaTipoOdontograma('oleary_nino'), "O'Leary Niño");
  });
});

describe('esLayoutOleary', () => {
  test('reconoce los dos layouts de O\'Leary', () => {
    assert.equal(esLayoutOleary('oleary_adulto'), true);
    assert.equal(esLayoutOleary('oleary_nino'), true);
  });

  test('no reconoce los layouts regulares', () => {
    assert.equal(esLayoutOleary('adulto'), false);
    assert.equal(esLayoutOleary('nino'), false);
  });
});

describe('esLayoutDenticionAdulta', () => {
  test('Adulto y O\'Leary Adulto usan denticion permanente', () => {
    assert.equal(esLayoutDenticionAdulta('adulto'), true);
    assert.equal(esLayoutDenticionAdulta('oleary_adulto'), true);
  });

  test('Nino y O\'Leary Nino usan denticion decidua', () => {
    assert.equal(esLayoutDenticionAdulta('nino'), false);
    assert.equal(esLayoutDenticionAdulta('oleary_nino'), false);
  });
});

describe('obtenerTipoLayoutOleary', () => {
  test('detecta O\'Leary Nino', () => {
    assert.equal(
      obtenerTipoLayoutOleary(registro({ datos_odontograma: { tipo: 'oleary_nino' } })),
      'oleary_nino',
    );
  });

  test('detecta O\'Leary Adulto', () => {
    assert.equal(
      obtenerTipoLayoutOleary(registro({ datos_odontograma: { tipo: 'oleary_adulto' } })),
      'oleary_adulto',
    );
  });

  test('trata los registros legacy sin layout como O\'Leary Adulto', () => {
    assert.equal(obtenerTipoLayoutOleary(registro({ datos_odontograma: {} })), 'oleary_adulto');
  });
});

describe('filtrarRegistrosOlearyPorTipo', () => {
  test('separa los registros de cada layout de O\'Leary', () => {
    const historial = [
      registro({ id: 'a', version: 3, datos_odontograma: { tipo: 'oleary_nino' } }),
      registro({ id: 'b', version: 2, datos_odontograma: { tipo: 'oleary_adulto' } }),
      registro({ id: 'c', version: 1, datos_odontograma: {} }),
    ];

    assert.deepEqual(filtrarRegistrosOlearyPorTipo(historial, 'oleary_nino').map((r) => r.id), ['a']);
    assert.deepEqual(filtrarRegistrosOlearyPorTipo(historial, 'oleary_adulto').map((r) => r.id), ['b', 'c']);
  });
});

describe('obtenerRegistroActualOleary', () => {
  test('returns the newest record of the requested oleary layout', () => {
    const historial = [
      registro({ id: 'a', version: 1, datos_odontograma: { tipo: 'oleary_nino' } }),
      registro({ id: 'b', version: 4, datos_odontograma: { tipo: 'oleary_adulto' } }),
      registro({ id: 'c', version: 2, datos_odontograma: { tipo: 'oleary_nino' } }),
    ];

    assert.equal(obtenerRegistroActualOleary(historial, 'oleary_nino')?.id, 'c');
    assert.equal(obtenerRegistroActualOleary(historial, 'oleary_adulto')?.id, 'b');
  });

  test('returns undefined when the layout has no records', () => {
    const historial = [registro({ id: 'a', version: 1, datos_odontograma: { tipo: 'oleary_adulto' } })];

    assert.equal(obtenerRegistroActualOleary(historial, 'oleary_nino'), undefined);
  });
});

describe('obtenerRegistroActual', () => {
  test('returns the newest record of the requested layout', () => {
    const historial = [
      registro({ id: 'a', version: 3, datos_odontograma: { tipo: 'adulto' } }),
      registro({ id: 'b', version: 2, datos_odontograma: { tipo: 'nino' } }),
      registro({ id: 'c', version: 1, datos_odontograma: { tipo: 'adulto' } }),
    ];

    assert.equal(obtenerRegistroActual(historial, 'adulto')?.id, 'a');
  });

  test('returns the newest record even when the history is not sorted', () => {
    const historial = [
      registro({ id: 'a', version: 1, datos_odontograma: { tipo: 'adulto' } }),
      registro({ id: 'c', version: 3, datos_odontograma: { tipo: 'adulto' } }),
      registro({ id: 'b', version: 2, datos_odontograma: { tipo: 'adulto' } }),
    ];

    assert.equal(obtenerRegistroActual(historial, 'adulto')?.id, 'c');
  });

  test('returns undefined when the layout has no records', () => {
    const historial = [registro({ id: 'a', version: 1, datos_odontograma: { tipo: 'nino' } })];

    assert.equal(obtenerRegistroActual(historial, 'adulto'), undefined);
  });
});

describe('buscarRegistroPorId', () => {
  test('finds a record in either table', () => {
    const regular = [registro({ id: 'a', version: 1 })];
    const oleary = [registro({ id: 'b', version: 1, datos_odontograma: { tipo: 'oleary_adulto' } })];

    assert.equal(buscarRegistroPorId(regular, oleary, 'a')?.id, 'a');
    assert.equal(buscarRegistroPorId(regular, oleary, 'b')?.id, 'b');
  });

  test('returns undefined for an unknown id', () => {
    assert.equal(buscarRegistroPorId([registro({ id: 'a' })], [], 'zzz'), undefined);
  });
});

describe('buscarRegistroPorVersion', () => {
  test('finds a record by version number', () => {
    const regular = [
      registro({ id: 'a', version: 1 }),
      registro({ id: 'b', version: 3 }),
    ];

    assert.equal(buscarRegistroPorVersion(regular, [], 3)?.id, 'b');
  });

  test('prefers the regular table when both tables share a version number', () => {
    const regular = [registro({ id: 'a', version: 2 })];
    const oleary = [registro({ id: 'b', version: 2, datos_odontograma: { tipo: 'oleary_adulto' } })];

    assert.equal(buscarRegistroPorVersion(regular, oleary, 2)?.id, 'a');
  });

  test('searches the table of the preferred layout first', () => {
    const regular = [registro({ id: 'a', version: 2 })];
    const oleary = [registro({ id: 'b', version: 2, datos_odontograma: { tipo: 'oleary_nino' } })];

    assert.equal(buscarRegistroPorVersion(regular, oleary, 2, 'oleary_nino')?.id, 'b');
    assert.equal(buscarRegistroPorVersion(regular, oleary, 2, 'adulto')?.id, 'a');
  });

  test('returns undefined for a non-numeric version', () => {
    assert.equal(buscarRegistroPorVersion([registro({ id: 'a', version: 2 })], [], NaN), undefined);
  });
});

describe('filtrarRegistrosPorTipo', () => {
  test('keeps only the records of the requested layout', () => {
    const historial = [
      registro({ id: 'a', version: 3, datos_odontograma: { tipo: 'adulto' } }),
      registro({ id: 'b', version: 2, datos_odontograma: { tipo: 'nino' } }),
      registro({ id: 'c', version: 1, datos_odontograma: { tipo: 'adulto' } }),
    ];

    const adultos = filtrarRegistrosPorTipo(historial, 'adulto');

    assert.deepEqual(adultos.map((r) => r.id), ['a', 'c']);
  });

  test('keeps only the nino records when nino is requested', () => {
    const historial = [
      registro({ id: 'a', version: 3, datos_odontograma: { tipo: 'adulto' } }),
      registro({ id: 'b', version: 2, datos_odontograma: { tipo: 'nino' } }),
    ];

    const ninos = filtrarRegistrosPorTipo(historial, 'nino');

    assert.deepEqual(ninos.map((r) => r.id), ['b']);
  });

  test('treats records without a layout as adulto', () => {
    const historial = [
      registro({ id: 'a', version: 2, datos_odontograma: {} }),
      registro({ id: 'b', version: 1, datos_odontograma: { tipo: 'nino' } }),
    ];

    const adultos = filtrarRegistrosPorTipo(historial, 'adulto');

    assert.deepEqual(adultos.map((r) => r.id), ['a']);
  });
});

describe('construirHistorialRegular', () => {
  test('lists only the versions of the selected layout', () => {
    const historial = [
      registro({ id: 'a', version: 3, datos_odontograma: { tipo: 'adulto', fecha: '2026-03-01' } }),
      registro({ id: 'b', version: 2, datos_odontograma: { tipo: 'nino', fecha: '2026-02-01' } }),
      registro({ id: 'a2', version: 1, datos_odontograma: { tipo: 'adulto', fecha: '2026-01-01' } }),
    ];

    const entradas = construirHistorialRegular(historial, 'adulto');

    assert.deepEqual(entradas.map((e) => e.id), ['a', 'a2']);
    assert.deepEqual(entradas.map((e) => e.tipo), ['adulto', 'adulto']);
  });

  test('marks the newest version of the layout as the current one', () => {
    const historial = [
      registro({ id: 'b', version: 2, datos_odontograma: { tipo: 'nino' } }),
      registro({ id: 'a', version: 1, datos_odontograma: { tipo: 'adulto' } }),
    ];

    const entradas = construirHistorialRegular(historial, 'adulto');

    assert.equal(entradas[0].esActual, true);
    assert.equal(entradas[0].nombre, 'Versión 1 (Actual)');
  });

  test('uses the odontogram date and falls back to the creation date', () => {
    const historial = [
      registro({
        id: 'a',
        version: 2,
        fecha_creacion: '2026-02-10',
        datos_odontograma: { tipo: 'adulto', fecha: '2026-02-05' },
      }),
      registro({
        id: 'b',
        version: 1,
        fecha_creacion: '2026-01-10',
        datos_odontograma: { tipo: 'adulto' },
      }),
    ];

    const entradas = construirHistorialRegular(historial, 'adulto');

    assert.equal(entradas[0].fecha, '2026-02-05');
    assert.equal(entradas[1].fecha, '2026-01-10');
  });

  test('returns an empty list when the layout has no records', () => {
    assert.deepEqual(construirHistorialRegular([], 'adulto'), []);
  });

  test('marks the newest nino version as the current one', () => {
    const historial = [
      registro({ id: 'a', version: 5, datos_odontograma: { tipo: 'adulto' } }),
      registro({ id: 'b', version: 2, datos_odontograma: { tipo: 'nino' } }),
      registro({ id: 'c', version: 1, datos_odontograma: { tipo: 'nino' } }),
    ];

    const entradas = construirHistorialRegular(historial, 'nino');

    assert.equal(entradas[0].id, 'b');
    assert.equal(entradas[0].nombre, 'Versión 2 (Actual)');
  });

  test('orders the versions from newest to oldest', () => {
    const historial = [
      registro({ id: 'a', version: 1, datos_odontograma: { tipo: 'adulto' } }),
      registro({ id: 'c', version: 3, datos_odontograma: { tipo: 'adulto' } }),
      registro({ id: 'b', version: 2, datos_odontograma: { tipo: 'adulto' } }),
    ];

    const entradas = construirHistorialRegular(historial, 'adulto');

    assert.deepEqual(entradas.map(e => e.id), ['c', 'b', 'a']);
    assert.equal(entradas[0].esActual, true);
    assert.equal(entradas[2].esActual, false);
  });
});

describe('construirHistorialOleary', () => {
  test('lists every oleary version as an oleary record', () => {
    const historial = [
      registro({ id: 'a', version: 2, datos_odontograma: { tipo: 'oleary_adulto', fecha: '2026-03-01' } }),
      registro({ id: 'b', version: 1, datos_odontograma: {} }),
    ];

    const entradas = construirHistorialOleary(historial, 'oleary_adulto');

    assert.deepEqual(entradas.map((e) => e.id), ['a', 'b']);
    assert.deepEqual(entradas.map((e) => e.tipo), ['oleary_adulto', 'oleary_adulto']);
  });

  test('lists only the versions of the selected oleary layout', () => {
    const historial = [
      registro({ id: 'a', version: 3, datos_odontograma: { tipo: 'oleary_nino' } }),
      registro({ id: 'b', version: 2, datos_odontograma: { tipo: 'oleary_adulto' } }),
      registro({ id: 'c', version: 1, datos_odontograma: { tipo: 'oleary_nino' } }),
    ];

    const entradas = construirHistorialOleary(historial, 'oleary_nino');

    assert.deepEqual(entradas.map((e) => e.id), ['a', 'c']);
    assert.deepEqual(entradas.map((e) => e.tipo), ['oleary_nino', 'oleary_nino']);
    assert.equal(entradas[0].esActual, true);
    assert.equal(entradas[0].nombre, 'Versión 3 (Actual)');
  });

  test('marks the newest oleary version as the current one', () => {
    const historial = [
      registro({ id: 'a', version: 2, datos_odontograma: {} }),
      registro({ id: 'b', version: 1, datos_odontograma: {} }),
    ];

    const entradas = construirHistorialOleary(historial, 'oleary_adulto');

    assert.equal(entradas[0].esActual, true);
    assert.equal(entradas[0].nombre, 'Versión 2 (Actual)');
    assert.equal(entradas[1].esActual, false);
  });
});

describe('detectarTipoPorHistorial', () => {
  test('detects the layout of the most recent record', () => {
    const pilots = [
      registro({ id: 'a', version: 3, fecha_creacion: '2026-03-01T00:00:00.000Z', datos_odontograma: { tipo: 'nino' } }),
    ];
    const oleary = [
      registro({ id: 'b', version: 1, fecha_creacion: '2026-01-01T00:00:00.000Z', datos_odontograma: {} }),
    ];

    assert.equal(detectarTipoPorHistorial(pilots, oleary), 'nino');
  });

  test('detects oleary when the oleary record is the most recent', () => {
    const pilots = [
      registro({ id: 'a', version: 3, fecha_creacion: '2026-01-01T00:00:00.000Z', datos_odontograma: { tipo: 'adulto' } }),
    ];
    const oleary = [
      registro({ id: 'b', version: 1, fecha_creacion: '2026-03-01T00:00:00.000Z', datos_odontograma: {} }),
    ];

    assert.equal(detectarTipoPorHistorial(pilots, oleary), 'oleary_adulto');
  });

  test('detects oleary nino when its record is the most recent', () => {
    const pilots = [
      registro({ id: 'a', version: 3, fecha_creacion: '2026-01-01T00:00:00.000Z', datos_odontograma: { tipo: 'adulto' } }),
    ];
    const oleary = [
      registro({ id: 'b', version: 1, fecha_creacion: '2026-03-01T00:00:00.000Z', datos_odontograma: { tipo: 'oleary_nino' } }),
    ];

    assert.equal(detectarTipoPorHistorial(pilots, oleary), 'oleary_nino');
  });

  test('returns null when the patient has no records', () => {
    assert.equal(detectarTipoPorHistorial([], []), null);
  });

  test('treats a legacy pilot record without a layout as adulto', () => {
    const pilots = [
      registro({ id: 'a', version: 1, fecha_creacion: '2026-03-01T00:00:00.000Z', datos_odontograma: {} }),
    ];

    assert.equal(detectarTipoPorHistorial(pilots, []), 'adulto');
  });

  test('ignores records without a usable creation date', () => {
    const pilots = [
      registro({ id: 'a', version: 2, fecha_creacion: null, datos_odontograma: { tipo: 'nino' } }),
      registro({ id: 'b', version: 1, fecha_creacion: '2026-01-01T00:00:00.000Z', datos_odontograma: { tipo: 'adulto' } }),
    ];

    assert.equal(detectarTipoPorHistorial(pilots, []), 'adulto');
  });
});
