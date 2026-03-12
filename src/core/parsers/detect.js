import { fuzzyMatchHeader } from '../../utils/fuzzy';

export function detectImportType(headers, firstRows, fileExtension) {
  // PCF text file
  if (fileExtension === '.pcf' || fileExtension === '.txt') {
    if (firstRows[0]?.includes('ISOGEN-FILES') || firstRows[0]?.includes('UNITS-')) {
      return "pcf_text";
    }
  }

  // Element-based CSV/Excel: has EP1/EP2 columns
  // Need mapping config for fuzzy matching
  const aliases = {
    ep1: ["EP1 COORDS", "EP1", "Start Point", "From", "From Coord", "Start Coord"],
    ep2: ["EP2 COORDS", "EP2", "End Point", "To", "To Coord", "End Coord"],
    point: ["Point"],
    type: ["Type", "Real_Type", "Component", "Comp Type", "Component Type", "Fitting", "Item"],
    east: ["East", "X Coordinate", "X"],
  };

  // Point-based CSV/Excel: has "Point" column with values {0,1,2,3}
  const pointCol = fuzzyMatchHeader("Point", aliases);

  if (pointCol) {
    const pointValues = new Set(firstRows.map(r => r[pointCol]).filter(Boolean));
    if (pointValues.has('0') || pointValues.has('1') || pointValues.has('3')) {
      return "point_csv";
    }
  }

  // Try element fallback
  const hasEp1 = headers.some(h => fuzzyMatchHeader(h, {ep1: aliases.ep1}));
  const hasEp2 = headers.some(h => fuzzyMatchHeader(h, {ep2: aliases.ep2}));
  if (hasEp1 && hasEp2) return "element_csv";

  // Fallback: check for Real_Type + coordinates (minimal point data)
  const hasType = headers.some(h => fuzzyMatchHeader(h, {type: aliases.type}));
  const hasEast = headers.some(h => fuzzyMatchHeader(h, {east: aliases.east}));

  if (hasType && hasEast) return "point_csv";

  return "unknown";
}
