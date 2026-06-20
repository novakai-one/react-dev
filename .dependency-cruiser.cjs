// dependency-cruiser config for Novakai.
// Encodes: no cycles, WorkspaceArea-as-conduit, no decisions-in-containers.
// Path regexes corrected to the ACTUAL src layout (spec used stale names).
//   selectionManager -> NEWSelectionManager  (src/selection/NewSelectionManager/)
//   store path is deeper: src/components/store/useBlockEventStore
//
// To add a coupling exception later: add it here explicitly AND record a
// SHARED MODULE JUSTIFICATION in the design block. Silent additions fail.

module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'No circular dependencies.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'workspacearea-is-conduit',
      severity: 'error',
      comment:
        'WorkspaceArea must not import manager decision modules directly ' +
        'beyond the receive* routing entrypoints it is allowed to call.',
      from: { path: 'components/workspace/WorkspaceArea\\.tsx$' },
      to: {
        path: '(blockMutations|blockManager|NEWSelectionManager|collisionManager|DragManager)',
        pathNot: 'receive', // routing entrypoints are allowed
      },
    },
    {
      name: 'no-orphan-decisions-in-containers',
      severity: 'error',
      comment: 'Container components must not import stores to branch on state.',
      from: { path: '(WorkspaceArea|ContentArea|CanvasArea)\\.tsx$' },
      to: { path: 'components/store/useBlockEventStore' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
  },
};
