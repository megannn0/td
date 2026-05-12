// This file re‑exports the selection hook and provider from the TSX
// implementation.  Keeping this file free of JSX prevents
// TypeScript errors when compiling with older configurations.  All
// consumers should import from ``useSelection`` and will receive
// definitions from ``useSelection.tsx``.

export * from './useSelection.tsx';
