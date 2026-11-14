#!/bin/sh
# Bot balance check: 27 runs (heroes Гестия, Медуза, Аполлон × maps 1–3 × seeds 33/44/55), base account (no gear, no runes).
# Prints wins out of 27. Takes ~3–5 minutes. Usage: sh tools/bal.sh
# Note: the bot keeps its distance from enemies, so close-range skills (spheres, auras) look weaker for it than for a player.
cd "$(dirname "$0")/.." || exit 1
w=0; n=0
for h in prometheus hydra apollo; do for m in 1 2 3; do for sd in 33 44 55; do
  r=$(timeout 120 npx tsx tools/headless.ts $m $h $sd 2>/dev/null | grep -c 'Победа!')
  n=$((n+1)); w=$((w+r))
done; done; done
echo "wins $w / $n"
