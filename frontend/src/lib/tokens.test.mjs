// Design tokens guard — tokens.json is the single source of truth for
// the dashboard's colour system. Fails if the file is not valid JSON,
// is missing a ramp, or lists a colour that is not a well-formed OKLCH
// value with a hex fallback. Run: npm test
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const tokens = JSON.parse(fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'tokens.json'), 'utf-8'))

const OKLCH_RE = /^oklch\(\d\.\d{3} \d\.\d{3} \d+\.\d{2}\)$/
const HEX_RE = /^#[0-9a-f]{6}$/

test('tokens.json parses and names the system', () => {
  assert.match(tokens.name, /AI SDR Agent/)
  assert.ok(tokens.signature?.idea, 'signature idea required')
  assert.ok(tokens.contrast?.pairs?.length >= 10, 'contrast table required')
})

test('every colour has a hex fallback and a well-formed OKLCH value', () => {
  const check = (obj, where) => {
    for (const [key, v] of Object.entries(obj)) {
      if (v && typeof v === 'object' && 'oklch' in v) {
        assert.match(v.oklch, OKLCH_RE, `${where}.${key} oklch`)
        assert.match(v.hex, HEX_RE, `${where}.${key} hex`)
      } else if (v && typeof v === 'object') {
        check(v, `${where}.${key}`)
      }
    }
  }
  check(tokens.color, 'color')
})

test('brand ramp is complete (50-900) and the accent is indigo', () => {
  for (const step of ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']) {
    assert.ok(tokens.color.brand[step], `brand-${step} missing`)
  }
  // Indigo hue lives around 277deg; a drifted hue means the ramp was
  // edited by hand instead of converted from the hex.
  for (const step of ['500', '600', '700']) {
    const hue = parseFloat(tokens.color.brand[step].oklch.match(/(\d+\.\d{2})\)$/)[1])
    assert.ok(hue >= 270 && hue <= 285, `brand-${step} hue ${hue} is not indigo`)
  }
})

test('contrast table only claims AA where the ratio earns it', () => {
  for (const p of tokens.contrast.pairs) {
    const ratio = parseFloat(p.ratio)
    if (p.aa === 'pass') assert.ok(ratio >= 4.5, `${p.pair} claims pass at ${ratio}`)
    if (p.aa === 'fail-normal-pass-large') assert.ok(ratio >= 3 && ratio < 4.5, `${p.pair} ratio ${ratio}`)
  }
})

test('motion rules ban decorative animation', () => {
  assert.ok(tokens.motion.banned.includes('shimmer'))
  assert.ok(tokens.motion.banned.includes('staggered entrances'))
})
