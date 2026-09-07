// tsx runs app modules through the CJS loader, where the `server-only`
// package throws (it expects a React Server Components bundler condition).
// One-off scripts that exercise server modules (sweeps, backfills) preload
// this stub: NODE_OPTIONS="--require ./scripts/dev-server-only-stub.cjs".
const Module = require("module");
const originalLoad = Module._load;
Module._load = function (request, ...rest) {
  if (request === "server-only") return {};
  return originalLoad.call(this, request, ...rest);
};
