// engine.js — the pure game state machine of Tidebound. No DOM, no audio,
// no randomness except through the seeded `rand` passed in, so the headless
// playthrough test can run whole matches in Node and a match can be
// replayed exactly from its seed.
//
// A match: you versus Captain Mirelle, the AI. Each side starts with 30
// harbour health and a 30-card deck. On your turn you draw 1, gain 3
// shells (capped at 10), and play as many cards as you can afford; each
// card's power hits the other harbour, its tide push moves the shared
// tide, and its effect fires. First harbour to 0 loses. Drawing from an
// empty deck costs 2 health (fatigue) instead.

import { buildDeck, cardDef, effectivePower } from './cards.js';
import { applyTideEffect, applyTidePush, clampTide } from './tide.js';
import { mulberry32 } from './rng.js';

export const START_HP = 30;
export const START_HAND = 4;
export const MAX_HAND = 7;
export const SHELLS_PER_TURN = 3;
export const MAX_SHELLS = 10;
export const FATIGUE_DAMAGE = 2;

export function newPlayer(deck, handSize) {
  return {
    hp: START_HP,
    deck: deck.slice(),
    hand: [],
    discard: [],
    shells: 0,
    maxHp: START_HP,
    handSize,
  };
}

// Start a match. `seed` fixes every shuffle and draw of the match.
export function newGame(seed) {
  const rand = mulberry32(seed);
  const game = {
    seed,
    rand,
    turn: 1,
    tide: 0,
    phase: 'play', // 'play' | 'over'
    active: 'you', // whose turn it is: 'you' | 'ai'
    winner: null, // 'you' | 'ai' once phase is 'over'
    log: [],
    you: newPlayer(buildDeck(rand), START_HAND),
    ai: newPlayer(buildDeck(rand), START_HAND),
    table: { you: [], ai: [] }, // cards played this round, for the view
    chain: { element: null, count: 0 }, // tide chain: consecutive same-element plays this turn
    stats: { cardsPlayed: 0, damageDealt: 0, turnsPlayed: 0 },
  };
  drawCards(game, game.you, START_HAND);
  drawCards(game, game.ai, START_HAND);
  startTurn(game, 'you');
  return game;
}

function say(game, text) {
  game.log.push(`Turn ${game.turn} — ${text}`);
  if (game.log.length > 40) game.log.shift();
}

export function sideOf(game, who) {
  return who === 'you' ? game.you : game.ai;
}

function otherOf(who) {
  return who === 'you' ? 'ai' : 'you';
}

// Draw `n` cards for `who`, taking fatigue damage on an empty deck.
export function drawCards(game, player, n) {
  for (let i = 0; i < n; i++) {
    if (player.hand.length >= MAX_HAND) {
      if (player.deck.length) player.discard.push(player.deck.pop());
      continue; // hand full: the drawn card is discarded unseen
    }
    if (player.deck.length === 0) {
      player.hp -= FATIGUE_DAMAGE;
      say(game, `${player === game.you ? 'You' : 'Mirelle'} draw from an empty deck and take ${FATIGUE_DAMAGE} fatigue.`);
      continue;
    }
    player.hand.push(player.deck.pop());
  }
}

// Begin `who`'s turn: fresh shells, one draw, empty the table and chain.
export function startTurn(game, who) {
  const player = sideOf(game, who);
  game.active = who;
  game.table = { you: [], ai: [] };
  game.chain = { element: null, count: 0 };
  player.shells = Math.min(MAX_SHELLS, player.shells + SHELLS_PER_TURN);
  drawCards(game, player, 1);
  game.stats.turnsPlayed += 1;
  say(game, `${who === 'you' ? 'Your' : "Mirelle's"} turn begins — ${player.shells} shells, tide ${game.tide >= 0 ? '+' : ''}${game.tide}.`);
}

// Can `who` legally play the card at hand index `i` right now?
export function canPlay(game, who, i) {
  if (game.phase !== 'play' || game.active !== who) return false;
  const player = sideOf(game, who);
  const id = player.hand[i];
  if (id === undefined) return false;
  return player.shells >= cardDef(id).cost;
}

// Play the card at hand index `i` for `who`. Returns the play record, or
// null when the play is illegal.
export function playCard(game, who, i) {
  if (!canPlay(game, who, i)) return null;
  const player = sideOf(game, who);
  const foe = sideOf(game, otherOf(who));
  const id = player.hand[i];
  const def = cardDef(id);
  // Power is read on the tide and chain as they stand before this play.
  const power = effectivePower(def, game.tide, game.chain);
  const chained = game.chain.element === def.element ? Math.min(game.chain.count, 2) : 0;

  player.shells -= def.cost;
  player.hand.splice(i, 1);
  player.discard.push(id);
  game.table[who].push({ id, power, tideAfter: null });

  // The chain grows: same element as the last play extends it, anything
  // else starts a fresh one.
  if (game.chain.element === def.element) game.chain.count += 1;
  else game.chain = { element: def.element, count: 1 };

  // The tide moves first: the bonus was read on the tide before the push.
  game.tide = applyTidePush(game.tide, def.tide);
  game.tide = applyTideEffect(game.tide, def.effect);
  game.tide = clampTide(game.tide);
  game.table[who][game.table[who].length - 1].tideAfter = game.tide;

  // Then the card's power lands on the other harbour.
  foe.hp -= power;
  game.stats.cardsPlayed += 1;
  if (who === 'you') game.stats.damageDealt += power;
  say(game, `${who === 'you' ? 'You play' : 'Mirelle plays'} ${def.name} for ${power}${chained > 0 ? ` (chain +${chained})` : ''} (tide now ${game.tide >= 0 ? '+' : ''}${game.tide}).`);

  // Then its effect fires.
  if (def.effect === 'draw1') drawCards(game, player, 1);
  if (def.effect === 'draw2') drawCards(game, player, 2);
  if (def.effect === 'heal2') {
    player.hp = Math.min(player.maxHp, player.hp + 2);
    say(game, `${who === 'you' ? 'You heal' : 'Mirelle heals'} 2 harbour.`);
  }
  if (def.effect === 'discard1' && player.hand.length > 0) {
    const drop = Math.floor(game.rand() * player.hand.length);
    const lost = player.hand.splice(drop, 1)[0];
    player.discard.push(lost);
    say(game, `${who === 'you' ? 'You discard' : 'Mirelle discards'} ${cardDef(lost).name} to the gull.`);
  }

  checkEnd(game);
  return { id, power, tide: game.tide };
}

// End `who`'s turn and hand over to the other side.
export function endTurn(game, who) {
  if (game.phase !== 'play' || game.active !== who) return false;
  const next = otherOf(who);
  if (next === 'you') game.turn += 1;
  startTurn(game, next);
  checkEnd(game);
  return true;
}

// Decide whether the match is over.
export function checkEnd(game) {
  if (game.phase === 'over') return;
  if (game.you.hp <= 0 && game.ai.hp <= 0) {
    game.winner = game.you.hp >= game.ai.hp ? 'you' : 'ai';
  } else if (game.you.hp <= 0) {
    game.winner = 'ai';
  } else if (game.ai.hp <= 0) {
    game.winner = 'you';
  }
  if (game.winner) {
    game.phase = 'over';
    game.you.hp = Math.max(0, game.you.hp);
    game.ai.hp = Math.max(0, game.ai.hp);
    say(game, game.winner === 'you' ? 'You rule the tide — victory!' : 'Mirelle rules the tide — defeat.');
  }
}

// A plain snapshot of the match for the view and the save file.
export function snapshot(game) {
  return {
    seed: game.seed,
    turn: game.turn,
    tide: game.tide,
    phase: game.phase,
    active: game.active,
    winner: game.winner,
    log: game.log.slice(-6),
    you: { hp: game.you.hp, maxHp: game.you.maxHp, shells: game.you.shells, hand: game.you.hand.slice(), deck: game.you.deck.length, discard: game.you.discard.length },
    ai: { hp: game.ai.hp, maxHp: game.ai.maxHp, shells: game.ai.shells, hand: game.ai.hand.length, deck: game.ai.deck.length, discard: game.ai.discard.length },
    table: { you: game.table.you.slice(), ai: game.table.ai.slice() },
    chain: { ...game.chain },
    stats: { ...game.stats },
  };
}
