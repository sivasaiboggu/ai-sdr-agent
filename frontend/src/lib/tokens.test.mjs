import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const tokens = JSON.parse(readFileSync(new URL('./tokens.json', import.meta.url), 'utf8'))
const css = readFileSync(new URL('../tokens.css', import.meta.url), 'utf8')

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map((channel) => parseInt(channel, 16) / 255)
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
}

test('the ledger ships a twelve-step neutral ramp and two full themes', () => {
  assert.match(tokens.name, /AI SDR Agent/)
  assert.match(tokens.signature.idea, /copper/)
  assert.equal(Object.keys(tokens.color.neutral).length, 12)
  assert.deepEqual(Object.keys(tokens.color.modes.light), Object.keys(tokens.color.modes.dark))
})

test('every palette entry has a valid OKLCH color and matching CSS fallbacks', () => {
  const groups = [
    [tokens.color.neutral, 'neutral-'],
    ...Object.values(tokens.color.modes).map((group) => [group, '']),
  ]
  for (const [colors, prefix] of groups) {
    for (const [key, color] of Object.entries(colors)) {
      assert.match(color.oklch, /^oklch\(\d\.\d{5} \d\.\d{5} \d+\.\d{3}\)$/)
      assert.match(color.hex, /^#[0-9a-f]{6}$/)
      const variable = `--${prefix}${key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)}`
      assert.ok(css.includes(`${variable}: ${color.oklch};`))
      assert.ok(css.includes(`${variable}: ${color.hex};`))
    }
  }
})

test('published WCAG ratios match the shipped colors in both themes', () => {
  assert.ok(tokens.contrast.pairs.length >= 10)
  for (const pair of tokens.contrast.pairs) {
    for (const [theme, colors] of Object.entries(tokens.color.modes)) {
      const a = luminance(colors[pair.foreground].hex)
      const b = luminance(colors[pair.background].hex)
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
      assert.equal(Number(ratio.toFixed(2)), pair[theme])
      assert.ok(ratio >= pair.minimum, `${theme}: ${pair.foreground} on ${pair.background} = ${ratio}`)
    }
  }
})
