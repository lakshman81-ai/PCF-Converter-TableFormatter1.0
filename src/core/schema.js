import { z } from 'zod';

export const CoordSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number()
}).nullable().optional();

export const DataTable42Schema = z.array(z.object({
  _rowIndex: z.number().optional(),
  _source: z.string().optional(),
  _modified: z.record(z.any()).optional(),
  _logTags: z.array(z.string()).optional(),

  csvSeqNo: z.union([z.string(), z.number()]).nullable().optional(),
  pipelineRef: z.string().nullable().optional(),
  type: z.string(),
  text: z.string().nullable().optional(),
  refNo: z.string().nullable().optional(),
  bore: z.number().nullable().optional(),
  branchBore: z.number().nullable().optional(),

  ep1: CoordSchema,
  ep2: CoordSchema,
  cp: CoordSchema,
  bp: CoordSchema,

  skey: z.string().nullable().optional(),

  supportCoor: CoordSchema,
  supportName: z.string().nullable().optional(),
  supportGuid: z.string().nullable().optional(),

  ca: z.record(z.any()).nullable().optional(),

  len1: z.number().nullable().optional(),
  len2: z.number().nullable().optional(),
  len3: z.number().nullable().optional(),

  axis1: z.string().nullable().optional(),
  axis2: z.string().nullable().optional(),
  axis3: z.string().nullable().optional(),

  fixingAction: z.string().nullable().optional(),
  fixingActionTier: z.union([z.string(), z.number()]).nullable().optional(),
  fixingActionRuleId: z.string().nullable().optional(),

  // Strict catch-all allowing extra metadata for internal processing
}).passthrough());

export function enforceDataTableSchema(table) {
  // Ensure the table structure conforms rigidly
  return DataTable42Schema.parse(table);
}
