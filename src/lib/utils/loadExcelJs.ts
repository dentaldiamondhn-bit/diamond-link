/**
 * ExcelJS is a heavy one-off library: it is only needed when the user exports
 * the financial report. Keeping the loader in its own module means neither the
 * page bundle nor the test harness pulls the library in eagerly.
 */
export async function loadExcelJs() {
  const mod = await import('exceljs');
  return (mod.default ?? mod) as typeof import('exceljs');
}
