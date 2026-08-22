// Stub for the "server-only" guard package so app modules can run under tsx
// in standalone scripts (the real package throws outside the Next.js RSC
// runtime). Referenced by scripts/tsconfig.json paths — never imported by the
// app itself.
export {};
