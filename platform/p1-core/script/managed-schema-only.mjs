console.error(
  "P1 uses reviewed p1-migrations SQL. Direct schema push is disabled because it can remove deferred constraints and cannot preserve SQL-owned recovery controls. Add and validate a migration through the P1 migration runner; see docs/implementation/blog-publication-consolidation.md in the repository root.",
);
process.exitCode = 1;
