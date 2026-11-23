// ai.js — Captain Mirelle, the AI opponent.
//
// Mirelle is greedy but tide-aware: she scores every card she can afford
// by its effective damage, by how far it drags the tide toward her
// element, and by its effect, then plays the best one while it is worth
// playing. She never plays a card that would hand you the tide bonus
// unless the damage is worth it — the tide is the game, and she knows it.

import { cardDef, effectivePower } from './cards.js';
import { favouredElement } from './tide.js';

// Score one card in hand on the current tide. Higher is better.
export function scoreCard(game, who, index) {
  const player = who === 'you' ? game.you : game.ai;
  const def = cardDef(player.hand[index]);
  const power = effectivePower(def, game.tide);
  let score = power * 2;

  // Tide positioning: pushing the tide toward an extreme you favour is
  // worth almost a hit; pushing it toward the enemy's extreme is costly.
  // Which extreme she favours is the element she holds most of.
  const after = Math.max(-5, Math.min(5, game.tide + def.tide));
  const suns = player.hand.filter((id) => cardDef(id).element === 'sun').length;
  const moons = player.hand.filter((id) => cardDef(id).element === 'moon').length;
  const myElement = moons > suns ? 'moon' : 'sun';
  const favouredAfter = favouredElement(after);
  if (favouredAfter === myElement) score += 3;
  if (favouredAfter && favouredAfter !== myElement) score -= 3;
  if (def.effect === 'flip' && game.tide !== 0) score += 2.5;
  if (def.effect === 'still' && Math.abs(game.tide) >= 3) score += 2;
  if (def.effect === 'surge') score += 2;
  if (def.effect === 'draw1') score += 1.5;
  if (def.effect === 'draw2') score += 3;
  if (def.effect === 'heal2') score += player.hp < player.maxHp ? 2 : 0.5;
  if (def.effect === 'discard1') score -= 1;

  // A cheap card that does the same job beats an expensive one.
  score -= def.cost * 0.4;
  return score;
}

// Choose the best card index for `who` to play now, or -1 to pass.
export function choosePlay(game, who) {
  const player = who === 'you' ? game.you : game.ai;
  let best = -1;
  let bestScore = 1.5; // below this, holding the card beats playing it
  for (let i = 0; i < player.hand.length; i++) {
    const def = cardDef(player.hand[i]);
    if (def.cost > player.shells) continue;
    const score = scoreCard(game, who, i);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

// Play Mirelle's whole turn through the engine: play while a good card
// exists, then end the turn. Returns the list of plays she made.
export function playAiTurn(game, playCardFn, endTurnFn) {
  const plays = [];
  for (let guard = 0; guard < 12; guard++) {
    if (game.phase !== 'play' || game.active !== 'ai') break;
    const index = choosePlay(game, 'ai');
    if (index < 0) break;
    const played = playCardFn(game, 'ai', index);
    if (!played) break;
    plays.push(played);
  }
  if (game.phase === 'play' && game.active === 'ai') endTurnFn(game, 'ai');
  return plays;
}
