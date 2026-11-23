// rng.js — a tiny seeded random number generator (mulberry32) plus a
// Fisher-Yates shuffle that takes its randomness from it. The whole game
// runs off one seed, so a match can be replayed exactly: same seed, same
// draws, same result. The headless playthrough test leans on this.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Shuffle a copy of `items` using `rand` and return the shuffled copy.
export function shuffle(items, rand) {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

// Pick an integer in [min, max] from `rand`.
export function rollInt(rand, min, max) {
  return min + Math.floor(rand() * (max - min + 1));
}
