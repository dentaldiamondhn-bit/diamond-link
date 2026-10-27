import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { loadExcelJs } from '../src/lib/utils/loadExcelJs.ts';
import { loadJsPdf } from '../src/services/pdfAssets.ts';

describe('lazy heavy libraries', () => {
  test('loadExcelJs resolves the exceljs module on demand', async () => {
    const ExcelJS = await loadExcelJs();
    assert.equal(typeof ExcelJS.Workbook, 'function');
  });

  test('loadJsPdf resolves the jsPDF constructor on demand', async () => {
    const JsPDF = await loadJsPdf();
    assert.equal(typeof JsPDF, 'function');
  });
});
