import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { detectImportType } from '../core/parsers/detect';

export async function processFile(file, expectedType, config, dispatch, logs) {
  logs.push({ type: "Info", message: `Reading file ${file.name}...` });
  dispatch({ type: 'SET_RAW_INPUT', payload: file });

  const text = await file.text();
  const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

  let firstRows = [];
  let headers = [];

  // Parse based on file type
  if (fileExtension === '.csv') {
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    firstRows = parsed.data.slice(0, 50);
    headers = parsed.meta.fields || Object.keys(firstRows[0] || {});
  } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const parsed = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    if (parsed.length > 0) {
      headers = parsed[0];
      firstRows = parsed.slice(1, 51).map(row => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = row[i]);
        return obj;
      });
    }
  } else if (fileExtension === '.pcf' || fileExtension === '.txt') {
    firstRows = text.split(/\r?\n/).slice(0, 50);
  } else {
    throw new Error("Unsupported file extension. Only CSV, XLSX, XLS, PCF, TXT allowed.");
  }

  const detected = detectImportType(headers, firstRows, fileExtension);
  logs.push({ type: "Info", message: `Detected import type: ${detected}` });

  if (detected !== expectedType && detected !== "unknown") {
     logs.push({ type: "Warning", message: `File looks like ${detected} but expected ${expectedType}. Proceeding anyway.` });
  }

  // Load preview data before processing
  dispatch({
    type: 'SET_PREVIEW_MODAL',
    payload: {
      open: true,
      file,
      detected,
      headers,
      firstRows,
      text, // for PCF processing later
    }
  });
}
