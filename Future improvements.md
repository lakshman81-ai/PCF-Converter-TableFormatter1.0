# Future Improvements

## Branch Validation (R-BRN-05) & Connectivity Strategy
Per user guidance on 2026-03-10, for significantly disconnected branch start elements (as tested in `BM-SF-50`), the graph builder (both `strict_sequential` and `spatial`) is expected to fail to link the branch. Rather than artificially coercing a connection just so `R-BRN-05` flags the gap, the system should correctly fall back to reporting an `orphan` element or a `dead-end` error (`R-TOP-01` / `R-TOP-02`).

This keeps the graph builder topology strict and preserves true spatial logic without writing hacky exemptions for branches.
