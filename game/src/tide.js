// tide.js — the shared tide gauge, the one original mechanic of Tidebound.
//
// The tide is a single number from -5 (low, moonlit) to +5 (high, sunlit)
// that both players fight over. Every card moves it when played; at the
// extremes (+3 or more, -3 or less) the favoured element's cards strike
// +2 harder. Owning the tide is worth more than any single card.

export const TIDE_MIN = -5;
export const TIDE_MAX = 5;
export const TIDE_BONUS_AT = 3;
export const TIDE_BONUS = 2;

export function clampTide(value) {
  if (value < TIDE_MIN) return TIDE_MIN;
  if (value > TIDE_MAX) return TIDE_MAX;
  return value;
}

// Which element, if any, the tide currently favours: 'sun', 'moon' or null.
export function favouredElement(tide) {
  if (tide >= TIDE_BONUS_AT) return 'sun';
  if (tide <= -TIDE_BONUS_AT) return 'moon';
  return null;
}

// Apply a card's tide push to the gauge and return the new tide.
export function applyTidePush(tide, push) {
  return clampTide(tide + push);
}

// Apply a card's tide effect (flip / still / surge) and return the new tide.
export function applyTideEffect(tide, effect) {
  if (effect === 'flip') return clampTide(-tide);
  if (effect === 'still') return 0;
  if (effect === 'surge') {
    if (tide > 0) return TIDE_MAX;
    if (tide < 0) return TIDE_MIN;
    return TIDE_MAX; // a calm sea surges toward the sun by default
  }
  return tide;
}

// A short label for the gauge, e.g. "HIGH TIDE +4 — Sun favoured".
export function tideLabel(tide) {
  const favoured = favouredElement(tide);
  const sign = tide > 0 ? '+' : '';
  if (favoured === 'sun') return `HIGH TIDE ${sign}${tide} — Sun cards +${TIDE_BONUS}`;
  if (favoured === 'moon') return `LOW TIDE ${sign}${tide} — Moon cards +${TIDE_BONUS}`;
  if (tide === 0) return 'CALM SEA 0 — no element favoured';
  return tide > 0 ? `RISING TIDE ${sign}${tide}` : `EBBING TIDE ${sign}${tide}`;
}
