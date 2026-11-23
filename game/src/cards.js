// cards.js — the card pool of Tidebound and the deck builder.
import { shuffle } from './rng.js';
//
// Every card has an element (sun / moon / storm), a shell cost, a base
// power, a tide push (how far it moves the shared tide when played) and an
// optional effect. The tide is the game's original mechanic: Sun cards hit
// harder at high tide, Moon cards at low tide, so a card's value depends on
// the table, not just on the card.
//
// Elements:
//   sun   — pushes the tide up (+), favoured at high tide (+3 or more)
//   moon  — pushes the tide down (-), favoured at low tide (-3 or less)
//   storm — tide tricks: flip it, still it, or shove it to an extreme

export const ELEMENTS = {
  sun: { label: 'Sun', bonusTide: 3, color: '#ffb347' },
  moon: { label: 'Moon', bonusTide: -3, color: '#7ec8ff' },
  storm: { label: 'Storm', bonusTide: null, color: '#c9a7ff' },
};

// The full pool: 15 unique cards. A deck holds two copies of each (30).
export const CARD_POOL = [
  // ---- Sun: ride the tide up ----
  { id: 'solar-flare', name: 'Solar Flare', element: 'sun', cost: 3, power: 5, tide: 2, effect: null, text: 'A blazing arc of noon light.' },
  { id: 'ember-cutlass', name: 'Ember Cutlass', element: 'sun', cost: 2, power: 3, tide: 1, effect: null, text: 'A blade that burns as it swings.' },
  { id: 'sunken-gold', name: 'Sunken Gold', element: 'sun', cost: 1, power: 2, tide: 1, effect: 'draw1', text: 'Draw a card. Fortune favours the bold.' },
  { id: 'high-noon', name: 'High Noon', element: 'sun', cost: 4, power: 6, tide: 2, effect: null, text: 'The sun stands still — and strikes.' },
  { id: 'coral-spark', name: 'Coral Spark', element: 'sun', cost: 1, power: 1, tide: 2, effect: 'heal2', text: 'Heal 2 harbour. Warm light mends hulls.' },
  // ---- Moon: drag the tide down ----
  { id: 'moonlit-tide', name: 'Moonlit Tide', element: 'moon', cost: 3, power: 5, tide: -2, effect: null, text: 'Silver water, cold and certain.' },
  { id: 'deep-current', name: 'Deep Current', element: 'moon', cost: 2, power: 3, tide: -1, effect: null, text: 'What the deep takes, it keeps.' },
  { id: 'pearl-dive', name: 'Pearl Dive', element: 'moon', cost: 1, power: 2, tide: -1, effect: 'heal2', text: 'Heal 2 harbour. A pearl for the wounded.' },
  { id: 'eclipse', name: 'Eclipse', element: 'moon', cost: 4, power: 6, tide: -2, effect: null, text: 'The moon swallows the sun whole.' },
  { id: 'tidepool-lure', name: 'Tidepool Lure', element: 'moon', cost: 1, power: 1, tide: -2, effect: 'draw1', text: 'Draw a card. Something glints below.' },
  // ---- Storm: bend the tide itself ----
  { id: 'maelstrom', name: 'Maelstrom', element: 'storm', cost: 3, power: 4, tide: 0, effect: 'flip', text: 'Flip the tide: high becomes low.' },
  { id: 'anchor-drop', name: 'Anchor Drop', element: 'storm', cost: 2, power: 2, tide: 0, effect: 'still', text: 'Still the tide back to calm (0).' },
  { id: 'sirens-call', name: "Siren's Call", element: 'storm', cost: 2, power: 1, tide: -1, effect: 'draw2', text: 'Draw 2 cards. The song is hard to resist.' },
  { id: 'storm-surge', name: 'Storm Surge', element: 'storm', cost: 4, power: 3, tide: 0, effect: 'surge', text: 'Shove the tide to its extreme in its current direction.' },
  { id: 'gulls-gambit', name: "Gull's Gambit", element: 'storm', cost: 0, power: 2, tide: 1, effect: 'discard1', text: 'Free to play — but discard a random card.' },
];

export const DECK_SIZE = 30;
export const COPIES_PER_CARD = 2;

// Build a fresh 30-card deck: two copies of every pool card, shuffled.
export function buildDeck(rand) {
  const cards = [];
  for (const def of CARD_POOL) {
    for (let n = 0; n < COPIES_PER_CARD; n++) cards.push(def.id);
  }
  return shuffle(cards, rand);
}

// Look a card definition up by id.
export function cardDef(id) {
  return CARD_POOL.find((c) => c.id === id);
}

// The tide bonus a card enjoys right now: +2 power when the tide favours
// its element, 0 otherwise. Storm cards never take the bonus.
export function tideBonus(def, tide) {
  if (def.element === 'sun' && tide >= 3) return 2;
  if (def.element === 'moon' && tide <= -3) return 2;
  return 0;
}

// Effective power of a card on the current tide.
export function effectivePower(def, tide) {
  return def.power + tideBonus(def, tide);
}
