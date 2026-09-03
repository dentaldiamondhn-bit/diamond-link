import { Workbook, type Row, type Worksheet } from 'exceljs';
import { saveAs } from 'file-saver';
import { FinancialExportPayload } from '@/types/financial';

export async function exportFinancialsToExcel(data: FinancialExportPayload) {
  const workbook = new Workbook();
  workbook.creator = data.clinicName || 'Dental Clinic Management System';
  workbook.created = new Date();

  const currencyFormat = '"L." #,##0.00';

  const applyHeaderStyles = (row: Row) => {
    row.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
    row.alignment = { vertical: 'middle', horizontal: 'center' };
    row.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '1E3A8A' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'medium' },
        right: { style: 'thin' },
      };
    });
    row.height = 24;
  };

  const autoFitColumns = (worksheet: Worksheet) => {
    worksheet.columns.forEach((column) => {
      let maxLen = 12;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const value = cell.value ? cell.value.toString() : '';
        if (value.length > maxLen) {
          maxLen = value.length;
        }
      });
      column.width = Math.min(maxLen + 4, 35);
    });
  };

  const dailySheet = workbook.addWorksheet('Finanzas Diarias');

  dailySheet.columns = [
    { header: 'Fecha', key: 'date' },
    { header: 'Nombre del Paciente', key: 'patientName' },
    { header: 'Procedimiento', key: 'procedure' },
    { header: 'Método de Pago', key: 'paymentMethod' },
    { header: 'Monto (L.)', key: 'amount' },
  ];

  applyHeaderStyles(dailySheet.getRow(1));

  data.daily.forEach((item) => {
    const row = dailySheet.addRow(item);
    row.getCell('amount').numFmt = currencyFormat;
    row.getCell('amount').alignment = { horizontal: 'right' };
  });

  if (data.daily.length > 0) {
    const dailyTotalRowIndex = data.daily.length + 2;
    const dailyTotalRow = dailySheet.addRow({
      paymentMethod: 'TOTAL:',
      amount: { formula: `SUM(E2:E${dailyTotalRowIndex - 1})` },
    });
    dailyTotalRow.font = { bold: true };
    dailyTotalRow.getCell('amount').numFmt = currencyFormat;
  }

  autoFitColumns(dailySheet);

  const monthlySheet = workbook.addWorksheet('Finanzas Mensuales');

  monthlySheet.columns = [
    { header: 'Mes', key: 'month' },
    { header: 'Pacientes Totales', key: 'totalPatients' },
    { header: 'Ingresos Brutos', key: 'grossRevenue' },
    { header: 'Gastos', key: 'expenses' },
    { header: 'Ingresos Netos', key: 'netIncome' },
  ];

  applyHeaderStyles(monthlySheet.getRow(1));

  data.monthly.forEach((item) => {
    const row = monthlySheet.addRow(item);
    row.getCell('grossRevenue').numFmt = currencyFormat;
    row.getCell('expenses').numFmt = currencyFormat;
    row.getCell('netIncome').numFmt = currencyFormat;
  });

  autoFitColumns(monthlySheet);

  const yearlySheet = workbook.addWorksheet('Finanzas Anuales');

  yearlySheet.columns = [
    { header: 'Año', key: 'year' },
    { header: 'Ingresos Totales', key: 'totalRevenue' },
    { header: 'Gastos Totales', key: 'totalExpenses' },
    { header: 'Deducciones Fiscales', key: 'taxDeductions' },
    { header: 'Beneficio Neto', key: 'netProfit' },
  ];

  applyHeaderStyles(yearlySheet.getRow(1));

  data.yearly.forEach((item) => {
    const row = yearlySheet.addRow(item);
    row.getCell('totalRevenue').numFmt = currencyFormat;
    row.getCell('totalExpenses').numFmt = currencyFormat;
    row.getCell('taxDeductions').numFmt = currencyFormat;
    row.getCell('netProfit').numFmt = currencyFormat;
  });

  autoFitColumns(yearlySheet);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const dateRangeLabel = data.dateRange && data.dateRange.startDate && data.dateRange.endDate
    ? `${data.dateRange.startDate}_${data.dateRange.endDate}`
    : new Date().toISOString().split('T')[0];
  saveAs(blob, `Reporte_Financiero_Clinica_Dental_${dateRangeLabel}.xlsx`);
}
