// view.js — everything the player sees: the table, the cards, the tide
// gauge, the overlays. It renders a snapshot from engine.js and turns
// clicks into engine calls. It also stages the four screenshot scenes
// (?shot=start|play|lowtide|victory) so the cover images are deterministic.
//
// Visual rule (pattern 14): the whole game must read in ONE frame —
// opponent, tide, table, hand, health and shells are all visible at once,
// in a deep-sea palette with gold trim and a tide gauge you can read
// from across the room.

import { cardDef, effectivePower } from './cards.js';
import { tideLabel } from './tide.js';
import { snapshot } from './engine.js';
import { sfx, setMuted, isMuted } from './audio.js';

const $ = (id) => document.getElementById(id);

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function tideArrow(push) {
  if (push > 0) return `▲ ${push}`;
  if (push < 0) return `▼ ${Math.abs(push)}`;
  return '—';
}

// One card face. `playable` marks cards the player may click right now;
// `spotlight` is the staged-screenshot highlight.
export function cardNode(id, tide, { playable = false, spotlight = false, small = false } = {}) {
  const def = cardDef(id);
  const power = effectivePower(def, tide);
  const boosted = power > def.power;
  const card = el('div', `card el-${def.element}${playable ? ' playable' : ''}${spotlight ? ' spotlight' : ''}${small ? ' small' : ''}`);
  card.dataset.cardId = id;
  const cost = el('div', 'cost', `● ${def.cost}`);
  card.appendChild(cost);
  // Element glyph: suits are told apart by colour AND shape, never by
  // text alone (criterion 4) — sun ☀, moon ☾, storm ⛈.
  const glyph = el('div', 'elem-glyph', def.element === 'sun' ? '☀' : def.element === 'moon' ? '☾' : '⛈');
  card.appendChild(glyph);
  const powerNode = el('div', `power${boosted ? ' boosted' : ''}`, `⚔ ${power}`);
  card.appendChild(powerNode);
  card.appendChild(el('div', 'card-name', def.name));
  card.appendChild(el('div', 'card-tide', `Tide ${tideArrow(def.tide)}`));
  if (def.effect) card.appendChild(el('div', 'card-effect', def.text));
  else card.appendChild(el('div', 'card-effect', def.text));
  return card;
}

function hpBar(who, hp, maxHp) {
  const wrap = el('div', 'hpbar');
  const fill = el('div', 'hpfill');
  fill.style.width = `${Math.max(0, (hp / maxHp) * 100)}%`;
  if (hp <= 8) fill.classList.add('low');
  wrap.appendChild(fill);
  wrap.appendChild(el('span', 'hptext', `♥ ${hp} / ${maxHp}`));
  return wrap;
}

export class View {
  constructor(root, callbacks) {
    this.root = root;
    this.cb = callbacks; // { onPlay(i), onEndTurn(), onNewGame(), onPause(), onMute() }
    this.build();
  }

  build() {
    this.root.innerHTML = '';
    const table = el('div', 'table');
    // Top bar
    const top = el('div', 'topbar');
    top.appendChild(el('div', 'brand', '⚓ TIDEBOUND'));
    this.scoreNode = el('div', 'score', '');
    top.appendChild(this.scoreNode);
    const btns = el('div', 'topbtns');
    this.muteBtn = el('button', 'tbtn', '♪ Sound on');
    this.muteBtn.addEventListener('click', () => this.cb.onMute());
    this.pauseBtn = el('button', 'tbtn', '⏸ Pause');
    this.pauseBtn.addEventListener('click', () => this.cb.onPause());
    this.helpBtn = el('button', 'tbtn', '? How to play');
    this.helpBtn.addEventListener('click', () => this.toggleHelp(true));
    btns.append(this.muteBtn, this.pauseBtn, this.helpBtn);
    top.appendChild(btns);
    table.appendChild(top);

    // Opponent row
    const foe = el('div', 'foe-row');
    const foeInfo = el('div', 'foe-info');
    foeInfo.appendChild(el('div', 'portrait foe-portrait', '🧜‍♀️'));
    const foeMeta = el('div', 'foe-meta');
    foeMeta.appendChild(el('div', 'foe-name', 'Captain Mirelle'));
    this.foeHp = el('div', 'hp-slot');
    foeMeta.appendChild(this.foeHp);
    this.foeCounts = el('div', 'counts', '');
    foeMeta.appendChild(this.foeCounts);
    foeInfo.appendChild(foeMeta);
    foe.appendChild(foeInfo);
    this.foeHand = el('div', 'foe-hand');
    foe.appendChild(this.foeHand);
    table.appendChild(foe);

    // Tide gauge + table
    const middle = el('div', 'middle');
    const gauge = el('div', 'gauge');
    gauge.appendChild(el('div', 'gauge-title', '— THE TIDE —'));
    this.gaugeBar = el('div', 'gauge-bar');
    for (let v = -5; v <= 5; v++) {
      const tick = el('div', `tick${v === 0 ? ' zero' : ''}`);
      tick.style.left = `${((v + 5) / 10) * 100}%`;
      this.gaugeBar.appendChild(tick);
    }
    this.gaugeMarker = el('div', 'gauge-marker');
    this.gaugeBar.appendChild(this.gaugeMarker);
    gauge.appendChild(this.gaugeBar);
    this.gaugeLabel = el('div', 'gauge-label', '');
    gauge.appendChild(this.gaugeLabel);
    middle.appendChild(gauge);

    this.banner = el('div', 'banner', '');
    middle.appendChild(this.banner);

    const played = el('div', 'played');
    this.playedYou = el('div', 'played-col');
    this.playedYou.appendChild(el('div', 'played-title', 'Your plays'));
    this.playedAi = el('div', 'played-col');
    this.playedAi.appendChild(el('div', 'played-title', "Mirelle's plays"));
    played.append(this.playedAi, this.playedYou);
    middle.appendChild(played);
    table.appendChild(middle);

    // Player row
    const me = el('div', 'me-row');
    const meInfo = el('div', 'me-info');
    meInfo.appendChild(el('div', 'portrait me-portrait', '🏴‍☠️'));
    const meMeta = el('div', 'me-meta');
    meMeta.appendChild(el('div', 'me-name', 'You — Tide Captain'));
    this.meHp = el('div', 'hp-slot');
    meMeta.appendChild(this.meHp);
    this.meCounts = el('div', 'counts', '');
    meMeta.appendChild(this.meCounts);
    meInfo.appendChild(meMeta);
    me.appendChild(meInfo);
    this.shellsNode = el('div', 'shells', '');
    me.appendChild(this.shellsNode);
    this.endBtn = el('button', 'endbtn', 'End turn ⏎');
    this.endBtn.addEventListener('click', () => this.cb.onEndTurn());
    me.appendChild(this.endBtn);
    table.appendChild(me);

    // Hand
    this.handNode = el('div', 'hand');
    table.appendChild(this.handNode);

    // Log
    this.logNode = el('div', 'gamelog', '');
    table.appendChild(this.logNode);

    // Overlays
    this.overlay = el('div', 'overlay hidden');
    this.overlayCard = el('div', 'overlay-card');
    this.overlay.appendChild(this.overlayCard);
    table.appendChild(this.overlay);

    this.root.appendChild(table);
  }

  render(game, stats) {
    const snap = snapshot(game);
    document.body.dataset.tide = snap.tide >= 3 ? 'high' : snap.tide <= -3 ? 'low' : 'calm';
    this.scoreNode.textContent = `Wins ${stats.wins} · Losses ${stats.losses} · Streak ${stats.streak}`;
    this.muteBtn.textContent = isMuted() ? '♪ Muted' : '♪ Sound on';

    // Opponent
    this.foeHp.innerHTML = '';
    this.foeHp.appendChild(hpBar('ai', snap.ai.hp, snap.ai.maxHp));
    this.foeCounts.textContent = `🂠 ${snap.ai.hand} in hand · Deck ${snap.ai.deck} · Discard ${snap.ai.discard}`;
    this.foeHand.innerHTML = '';
    for (let i = 0; i < Math.min(snap.ai.hand, 7); i++) {
      this.foeHand.appendChild(el('div', 'card-back'));
    }

    // Tide gauge
    const pct = ((snap.tide + 5) / 10) * 100;
    this.gaugeMarker.style.left = `${pct}%`;
    this.gaugeMarker.textContent = snap.tide >= 0 ? `+${snap.tide}` : `${snap.tide}`;
    this.gaugeLabel.textContent = tideLabel(snap.tide);

    // Banner
    if (snap.phase === 'over') {
      this.banner.textContent = snap.winner === 'you' ? '🏆 You rule the tide!' : '💀 Mirelle rules the tide.';
    } else if (snap.active === 'you') {
      this.banner.textContent = `Your turn — play cards, then end your turn. Turn ${snap.turn}`;
    } else {
      this.banner.textContent = 'Mirelle is thinking…';
    }

    // Played cards
    const fillPlayed = (node, plays) => {
      node.querySelectorAll('.card').forEach((c) => c.remove());
      for (const p of plays) node.appendChild(cardNode(p.id, snap.tide, { small: true }));
      if (plays.length === 0) node.appendChild(el('div', 'played-empty', '—'));
    };
    fillPlayed(this.playedAi, snap.table.ai);
    fillPlayed(this.playedYou, snap.table.you);

    // Player
    this.meHp.innerHTML = '';
    this.meHp.appendChild(hpBar('you', snap.you.hp, snap.you.maxHp));
    this.meCounts.textContent = `Deck ${snap.you.deck} · Discard ${snap.you.discard}`;
    this.shellsNode.textContent = `Shells ${'●'.repeat(snap.you.shells)}${'○'.repeat(10 - snap.you.shells)} (${snap.you.shells})`;
    this.endBtn.disabled = !(snap.phase === 'play' && snap.active === 'you');

    // Hand
    this.handNode.innerHTML = '';
    snap.you.hand.forEach((id, i) => {
      const def = cardDef(id);
      const playable = snap.phase === 'play' && snap.active === 'you' && snap.you.shells >= def.cost;
      const node = cardNode(id, snap.tide, { playable, spotlight: this.spotlightId === id });
      node.addEventListener('click', () => this.cb.onPlay(i));
      this.handNode.appendChild(node);
    });

    // Log
    this.logNode.textContent = snap.log[snap.log.length - 1] || '';
  }

  showOverlay(html, buttons) {
    this.overlayCard.innerHTML = '';
    const title = el('h1', null, html.title);
    this.overlayCard.appendChild(title);
    if (html.body) {
      const p = el('p', null);
      p.innerHTML = html.body;
      this.overlayCard.appendChild(p);
    }
    const row = el('div', 'overlay-btns');
    for (const b of buttons) {
      const btn = el('button', 'bigbtn', b.label);
      btn.addEventListener('click', b.onClick);
      row.appendChild(btn);
    }
    this.overlayCard.appendChild(row);
    this.overlay.classList.remove('hidden');
  }

  hideOverlay() {
    this.overlay.classList.add('hidden');
  }

  toggleHelp(show) {
    if (show) {
      this.showOverlay(
        {
          title: 'How to play Tidebound',
          body: 'You duel Captain Mirelle, harbour against harbour (30 ♥ each).<br><br>'
            + '<b>The tide is everything.</b> Every card moves the shared tide (−5 to +5). '
            + 'At <b>high tide (+3 or more)</b> Sun cards strike +2; at <b>low tide (−3 or less)</b> Moon cards strike +2. '
            + 'Play to own the tide, not just to hit hard.<br><br>'
            + 'Each turn: draw 1, gain 3 shells ● (max 10), play as many cards as you can afford, then end your turn. '
            + 'Storm cards bend the tide itself — flip it, still it, or surge it to an extreme.<br><br>'
            + 'First harbour to 0 loses. Drawing from an empty deck costs 2 ♥.<br><br>'
            + 'Keys: <b>E</b> end turn · <b>P</b> pause · <b>M</b> sound · <b>N</b> new game.',
        },
        [{ label: 'Back to the table', onClick: () => this.hideOverlay() }],
      );
    } else {
      this.hideOverlay();
    }
  }

  showTitle(onStart) {
    this.showOverlay(
      {
        title: '⚓ TIDEBOUND',
        body: '<i>Duel of the Rising Tide</i><br><br>A card duel where every card moves the sea. '
          + 'Own the tide — high for the Sun, low for the Moon — and your cards strike twice as hard. '
          + 'Beat Captain Mirelle before she sinks your harbour.',
      },
      [{ label: '▶ Set sail — start the duel', onClick: onStart }],
    );
  }

  showGameOver(winner, stats, onAgain) {
    const win = winner === 'you';
    this.showOverlay(
      {
        title: win ? '🏆 You rule the tide!' : '💀 Mirelle rules the tide',
        body: win
          ? `Your harbour stands. Wins <b>${stats.wins}</b> · streak <b>${stats.streak}</b> — the tide remembers its captain.`
          : `Your harbour sinks beneath the waves. Wins <b>${stats.wins}</b> · Losses <b>${stats.losses}</b> — the tide will turn.`,
      },
      [{ label: '↻ Duel again', onClick: onAgain }],
    );
  }

  showPause(onResume, onRestart) {
    this.showOverlay(
      { title: '⏸ Paused', body: 'The tide waits for no one — except now.' },
      [
        { label: '▶ Resume', onClick: onResume },
        { label: '↻ Restart duel', onClick: onRestart },
      ],
    );
  }
}

// Stage a deterministic screenshot scene on a fresh game. Returns the
// staged game; the view highlights one card with .spotlight.
export function stageShot(game, name) {
  const g = game;
  if (name === 'start') {
    // Opening table, one exchange already played: the whole game reads
    // in one frame — opponent, tide, table, hand, health, shells.
    g.tide = 1;
    g.you.hp = 30;
    g.ai.hp = 27;
    g.you.shells = 3;
    g.turn = 1;
    g.table.you = [{ id: 'ember-cutlass', power: 3, tideAfter: 1 }];
    g.table.ai = [{ id: 'deep-current', power: 3, tideAfter: 0 }];
    g.you.hand = ['solar-flare', 'sunken-gold', 'coral-spark', 'maelstrom', 'deep-current'];
    g.ai.hand = ['x', 'x', 'x', 'x'];
    g.log.push('Turn 1 — You play Ember Cutlass for 3 (tide now +1).');
    return g;
  }
  if (name === 'play') {
    // High tide, mid-duel: you ahead on damage, Sun favoured, a Solar
    // Flare in hand glowing with its tide bonus.
    g.tide = 4;
    g.you.hp = 18;
    g.ai.hp = 14;
    g.you.shells = 5;
    g.turn = 5;
    g.table.you = [{ id: 'ember-cutlass', power: 3, tideAfter: 3 }, { id: 'sunken-gold', power: 2, tideAfter: 4 }];
    g.table.ai = [{ id: 'deep-current', power: 3, tideAfter: 2 }];
    g.you.hand = ['solar-flare', 'high-noon', 'coral-spark', 'maelstrom', 'deep-current'];
    g.ai.hand = ['x', 'x', 'x', 'x'];
    g.log.push('Turn 5 — You play Sunken Gold for 4 (tide now +4).');
    return g;
  }
  if (name === 'lowtide') {
    // Low tide, moonlit: Mirelle ahead, Moon favoured, an Eclipse glowing.
    g.tide = -4;
    g.you.hp = 12;
    g.ai.hp = 16;
    g.you.shells = 6;
    g.turn = 7;
    g.table.you = [{ id: 'pearl-dive', power: 2, tideAfter: -3 }];
    g.table.ai = [{ id: 'moonlit-tide', power: 7, tideAfter: -4 }, { id: 'eclipse', power: 8, tideAfter: -4 }];
    g.you.hand = ['eclipse', 'moonlit-tide', 'tidepool-lure', 'anchor-drop', 'storm-surge'];
    g.ai.hand = ['x', 'x', 'x', 'x', 'x'];
    g.log.push('Turn 7 — Mirelle plays Eclipse for 8 (tide now -4).');
    return g;
  }
  if (name === 'victory') {
    g.tide = 5;
    g.you.hp = 9;
    g.ai.hp = 0;
    g.phase = 'over';
    g.winner = 'you';
    g.table.you = [{ id: 'high-noon', power: 8, tideAfter: 5 }];
    g.table.ai = [];
    g.log.push('Turn 9 — You play High Noon for 8 (tide now +5).');
    g.log.push('Turn 9 — You rule the tide — victory!');
    return g;
  }
  return g;
}
