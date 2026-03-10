/**
 * PTE CONVERSION — Case Detect & Main Entry
 * Implementation of PART 3 of WI-PCF-002 Rev.0
 */

import { enrichWithRealType } from './caseA';
import { deriveWithLineKey, deriveWithoutLineKey } from './caseB';
import { twoPassOrphanSweep, pureOrphanSweep } from './caseD';
import { validateDataTable } from '../schema';
import { registerRule } from '../ruleRegistry';

[
  "R-PTE-01", "R-PTE-02", "R-PTE-03", "R-PTE-04", "R-PTE-05", "R-PTE-06", "R-PTE-07",
  "R-PTE-08", "R-PTE-09", "R-PTE-10", "R-PTE-11", "R-PTE-12", "R-PTE-20", "R-PTE-21",
  "R-PTE-22", "R-PTE-29", "R-PTE-31", "R-PTE-34", "R-PTE-41", "R-PTE-42", "R-PTE-50",
  "R-PTE-51", "R-PTE-52"
].forEach(ruleId => registerRule(ruleId));

export function selectPTECase(intermediateRows, config) {
  if (!intermediateRows || intermediateRows.length === 0) return "UNKNOWN";

  const first100 = intermediateRows.slice(0, 100);

  const hasRef = first100.some(r => r.RefNo != null);
  const hasPoint = first100.some(r => r.Point != null);
  const hasPPoint = first100.some(r => r.PPoint != null);
  const hasLineKey = config.pte.lineKeyEnabled && first100.some(r => r.Line_Key != null);
  const isSequential = config.pte.sequentialData;

  const refPtAvailable = config.pte.refPtPptAvailable === "yes" ||
                        (config.pte.refPtPptAvailable === "auto" && hasRef && hasPoint && hasPPoint);

  if (refPtAvailable && isSequential) {
    return "CASE_A";
  }
  if (isSequential && hasLineKey) return "CASE_B_a";
  if (isSequential && !hasLineKey) return "CASE_B_b";
  if (!isSequential && hasLineKey) return "CASE_D_a";
  return "CASE_D_b";
}

export function runPTEConversion(intermediateRows, config, log) {
  const pteCase = selectPTECase(intermediateRows, config);
  log.push({ type: "Info", message: `PTE Conversion started. Detected Case: ${pteCase}` });

  let enrichedRows = [];

  switch(pteCase) {
    case "CASE_A":
      enrichedRows = enrichWithRealType(intermediateRows);
      break;
    case "CASE_B_a":
      enrichedRows = deriveWithLineKey(intermediateRows, config);
      break;
    case "CASE_B_b":
      enrichedRows = deriveWithoutLineKey(intermediateRows, config);
      break;
    case "CASE_D_a":
      const { orderedChains } = twoPassOrphanSweep(intermediateRows, config, log);
      // Flatten chains and apply B(a)
      const sortedRows = [];
      for (const chain of Object.values(orderedChains)) {
        sortedRows.push(...chain);
      }
      enrichedRows = deriveWithLineKey(sortedRows, config);
      break;
    case "CASE_D_b":
      const { pureChains } = pureOrphanSweep(intermediateRows, config, log);
      const sortedPureRows = [];
      for (const chain of pureChains) {
        sortedPureRows.push(...chain);
      }
      enrichedRows = deriveWithoutLineKey(sortedPureRows, config);
      break;
    default:
      log.push({ type: "Error", message: `Unknown PTE Case. Cannot proceed.` });
      return [];
  }

  // Transform enriched point rows into Element Rows (Data Table format)
  const dataTable = transformToElements(enrichedRows, config, log);

  return validateDataTable(dataTable);
}

import { vec } from '../../utils/math';

function transformToElements(rows, config, log) {
  // Common builder logic for all cases (R-PTE-34, R-PTE-35, etc)
  const elements = [];
  let rowIndex = 1;

  for (let i = 0; i < rows.length; i++) {
    const pt = rows[i];
    const type = pt.Type?.toUpperCase() || "";

    // R-PTE-06: ANCI -> SUPPORT + Implicit Pipe
    if (["ANCI", "RSTR", "SUPPORT"].includes(type)) {
       elements.push({
         _source: "PTE",
         _rowIndex: rowIndex++,
         type: "SUPPORT",
         supportCoor: pt.coord,
         bore: pt.bore,
         csvSeqNo: pt.Sequence
       });
       continue;
    }

    if (type === "BRAN") {
       // BRAN is a chain start marker, not a component itself
       continue;
    }

    if (pt.Point === 1) {
       // This point is EP1 of a component
       // Find the corresponding EP2 (the next point in sequence)
       let nextPt = i + 1 < rows.length ? rows[i+1] : null;

       if (!nextPt || !pt.coord || !nextPt.coord) continue;

       let ep1 = pt.coord;
       let ep2 = nextPt.coord;
       let cp = null;
       let bp = null;
       let branchBore = null;

       // Handle special components
       if (type === "TEE") {
           // TEE: EP1 = pt, EP2 = next non-tee, CP = midpoint
           // Simplified for initial pass
           cp = vec.mid(ep1, ep2);
           bp = { ...cp, z: cp.z + 100 }; // Mock branch point
           branchBore = pt.bore;
       } else if (type === "ELBO" || type === "BEND") {
           cp = { x: ep1.x, y: ep1.y, z: ep2.z }; // Mock bend intersection
       } else if (type === "OLET") {
           cp = ep1;
           ep2 = null; // OLET has no EPs
           ep1 = null;
           bp = { ...cp, z: cp.z + 100 };
           branchBore = 50;
       }

       // Map to standard PCF types
       const pcfType = mapType(type);

       elements.push({
         _source: "PTE",
         _rowIndex: rowIndex++,
         type: pcfType,
         ep1: ep1,
         ep2: ep2,
         cp: cp,
         bp: bp,
         bore: pt.bore,
         branchBore: branchBore,
         csvSeqNo: pt.Sequence,
         refNo: pt.RefNo,
         skey: pt.skey,
       });
    }
  }

  return elements;
}

function mapType(type) {
   const t = type.toUpperCase();
   if (t === "ELBO") return "BEND";
   if (t === "FLAN") return "FLANGE";
   if (t === "VALV") return "VALVE";
   if (t === "REDC" || t === "REDU") return "REDUCER-CONCENTRIC";
   if (t === "REDE") return "REDUCER-ECCENTRIC";
   if (t === "PCOM") return "PIPE";
   return t;
}
