import { z } from "zod";

// Shared primitive schemas
const CoordinateSchema = z.object({
  x: z.number().nullable().optional(),
  y: z.number().nullable().optional(),
  z: z.number().nullable().optional(),
}).nullable().optional();

const ComponentAttributesSchema = z.object({
  1: z.string().nullable().optional(),
  2: z.string().nullable().optional(),
  3: z.string().nullable().optional(),
  4: z.string().nullable().optional(),
  5: z.string().nullable().optional(),
  6: z.string().nullable().optional(),
  7: z.string().nullable().optional(),
  8: z.string().nullable().optional(),
  9: z.string().nullable().optional(),
  10: z.string().nullable().optional(),
  97: z.string().nullable().optional(),
  98: z.string().nullable().optional(),
});

// The single source of truth for a Row object entering the application
export const DataTableRowSchema = z.object({
  _rowIndex: z.number().int().optional(),
  _modified: z.record(z.string(), z.string()).optional(),
  _logTags: z.array(z.string()).optional(),
  _source: z.enum(["PTE", "CSV", "PCF", "Mock", "Unknown"]).optional(),

  // Identity
  csvSeqNo: z.union([z.number(), z.string()]).nullable().optional(),
  type: z.string(),
  text: z.string().nullable().optional(),
  pipelineRef: z.string().nullable().optional(),
  refNo: z.string().nullable().optional(),
  bore: z.number().nullable().optional(),

  // Geometry
  ep1: CoordinateSchema,
  ep2: CoordinateSchema,
  cp: CoordinateSchema,
  bp: CoordinateSchema,
  branchBore: z.number().nullable().optional(),

  // Fitting
  skey: z.string().nullable().optional(),

  // Support
  supportCoor: CoordinateSchema,
  supportName: z.string().nullable().optional(),
  supportGuid: z.string().nullable().optional(),

  // Attributes
  ca: ComponentAttributesSchema.optional(),

  // Calculated
  len1: z.number().nullable().optional(),
  axis1: z.string().nullable().optional(),
  len2: z.number().nullable().optional(),
  axis2: z.string().nullable().optional(),
  len3: z.number().nullable().optional(),
  axis3: z.string().nullable().optional(),
  brlen: z.number().nullable().optional(),
  deltaX: z.number().nullable().optional(),
  deltaY: z.number().nullable().optional(),
  deltaZ: z.number().nullable().optional(),
  diameter: z.number().nullable().optional(),
  wallThick: z.string().nullable().optional(),
  bendPtr: z.number().nullable().optional(),
  rigidPtr: z.number().nullable().optional(),
  intPtr: z.number().nullable().optional(),

  // Smart Fixer properties
  fixingAction: z.string().nullable().optional(),
  fixingActionTier: z.number().nullable().optional(),
  fixingActionRuleId: z.string().nullable().optional(),
});

// Validate an array of rows
export function validateDataTable(rows) {
  try {
    return z.array(DataTableRowSchema).parse(rows);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Zod Validation Error:", error.errors);
      throw new Error(`Data Validation Failed: ${error.errors[0].message}`);
    }
    throw error;
  }
}
