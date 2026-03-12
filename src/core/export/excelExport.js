/**
 * EXCEL EXPORT (Using ExcelJS)
 * Requires styled cells and formatting.
 */

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver'; // Needed for browser save

import { enforceDataTableSchema } from '../schema.js';

export async function exportToExcel(dataTable) {
  const validatedTable = enforceDataTableSchema(dataTable);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Data Table', { views: [{ state: 'frozen', ySplit: 1 }] });

  // Define columns based on Data Table structure
  sheet.columns = [
    { header: '#', key: '_rowIndex', width: 5 },
    { header: 'CSV SEQ NO', key: 'csvSeqNo', width: 15 },
    { header: 'Type', key: 'type', width: 20 },
    { header: 'TEXT', key: 'text', width: 40 },
    { header: 'Fixing Action', key: 'fixingAction', width: 40 },
    { header: 'REF NO.', key: 'refNo', width: 20 },
    { header: 'BORE', key: 'bore', width: 10 },
    { header: 'EP1 X', key: 'ep1x', width: 15 },
    { header: 'EP1 Y', key: 'ep1y', width: 15 },
    { header: 'EP1 Z', key: 'ep1z', width: 15 },
    { header: 'EP2 X', key: 'ep2x', width: 15 },
    { header: 'EP2 Y', key: 'ep2y', width: 15 },
    { header: 'EP2 Z', key: 'ep2z', width: 15 },
    { header: 'CP X', key: 'cpx', width: 15 },
    { header: 'CP Y', key: 'cpy', width: 15 },
    { header: 'CP Z', key: 'cpz', width: 15 },
    { header: 'BP X', key: 'bpx', width: 15 },
    { header: 'BP Y', key: 'bpy', width: 15 },
    { header: 'BP Z', key: 'bpz', width: 15 },
    { header: 'SKEY', key: 'skey', width: 10 },
    { header: 'SUPPORT COOR', key: 'supportCoor', width: 20 },
    { header: 'LEN 1', key: 'len1', width: 15 },
    { header: 'AXIS 1', key: 'axis1', width: 15 },
    { header: 'CA1', key: 'ca1', width: 15 },
    { header: 'CA3', key: 'ca3', width: 15 },
    { header: 'CA8', key: 'ca8', width: 15 },
  ];

  // Header styles
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

  // Add rows with styling
  for (const row of validatedTable) {
    const sheetRow = sheet.addRow({
      _rowIndex: row._rowIndex,
      csvSeqNo: row.csvSeqNo,
      type: row.type,
      text: row.text,
      fixingAction: row.fixingAction || "",
      refNo: row.refNo,
      bore: row.bore,
      ep1x: row.ep1?.x, ep1y: row.ep1?.y, ep1z: row.ep1?.z,
      ep2x: row.ep2?.x, ep2y: row.ep2?.y, ep2z: row.ep2?.z,
      cpx: row.cp?.x, cpy: row.cp?.y, cpz: row.cp?.z,
      bpx: row.bp?.x, bpy: row.bp?.y, bpz: row.bp?.z,
      skey: row.skey,
      supportCoor: row.supportCoor ? `${row.supportCoor.x}, ${row.supportCoor.y}, ${row.supportCoor.z}` : "",
      len1: row.len1,
      axis1: row.axis1,
      ca1: row.ca?.[1],
      ca3: row.ca?.[3],
      ca8: row.ca?.[8],
    });

    // Apply colors based on _modified, _logTags, etc.
    sheetRow.eachCell((cell, colNumber) => {
      const colKey = sheet.getColumn(colNumber).key;
      let baseCoord = null;
      if (colKey.startsWith('ep1')) baseCoord = 'ep1';
      else if (colKey.startsWith('ep2')) baseCoord = 'ep2';
      else if (colKey.startsWith('cp')) baseCoord = 'cp';
      else if (colKey.startsWith('bp')) baseCoord = 'bp';

      const modifiedKey = baseCoord || colKey;

      if (row._modified && row._modified[modifiedKey]) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } }; // Amber
      } else if (row._logTags?.includes("Calculated") && colKey !== "type") {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1ECF1' } }; // Cyan
      } else if (row._logTags?.includes("Mock")) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7DA' } }; // Red
      } else if (row._source === "PTE" && row.type === "PIPE" && row._logTags?.includes("Implicit")) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E3F1' } }; // Lavender
      }
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const filename = `PCF_DataTable_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
  saveAs(blob, filename);
}
