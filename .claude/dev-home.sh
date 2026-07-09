#!/bin/bash
# Preview launcher for packages/home — ensures Node 22 (repo engine) is used
# even if the invoking shell has an older node on PATH. Respects PORT so the
# preview can run beside a manually started `pnpm dev` (3002).
export PATH="$HOME/.nvm/versions/node/v22.19.0/bin:$PATH"
cd "$(dirname "$0")/.." || exit 1
exec node packages/home/node_modules/next/dist/bin/next dev -p "${PORT:-3002}" packages/home
