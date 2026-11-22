import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildActivity } from './activity.ts'

const NOW = new Date('2026-11-21T12:00:00')

test('counts sent mails by sent day, replies by reply day', () => {
  const sentAt = Math.floor(new Date('2026-11-20T10:00:00').getTime() / 1000)
  const repliedAt = Math.floor(new Date('2026-11-21T09:00:00').getTime() / 1000)
  const out = buildActivity(
    [
      { sent_at: sentAt, status: 'sent', reply_class: 'interested', replied_at: repliedAt },
      { sent_at: sentAt, status: 'sent', reply_class: null, replied_at: null },
    ],
    NOW,
  )
  assert.equal(out.length, 7)
  assert.equal(out[5].day, 'Fri')
  assert.equal(out[5].sent, 2)
  assert.equal(out[5].replies, 0)
  assert.equal(out[6].day, 'Sat')
  assert.equal(out[6].sent, 0)
  assert.equal(out[6].replies, 1)
})

test('drafts, blocked and failed mails count nowhere', () => {
  const sentAt = Math.floor(Date.now() / 1000)
  const out = buildActivity(
    [
      { sent_at: sentAt, status: 'draft', reply_class: null, replied_at: null },
      { sent_at: sentAt, status: 'blocked: bad address', reply_class: null, replied_at: null },
      { sent_at: null, status: 'sent', reply_class: null, replied_at: null },
    ],
    NOW,
  )
  assert.ok(out.every((d) => d.sent === 0 && d.replies === 0))
})

test('a reply without replied_at falls back to the sent day', () => {
  const sentAt = Math.floor(new Date('2026-11-20T10:00:00').getTime() / 1000)
  const out = buildActivity(
    [{ sent_at: sentAt, status: 'sent', reply_class: 'bounce', replied_at: null }],
    NOW,
  )
  assert.equal(out[5].sent, 1)
  assert.equal(out[5].replies, 1)
})

test('mails older than 7 days are outside the window', () => {
  const sentAt = Math.floor(new Date('2026-11-01T10:00:00').getTime() / 1000)
  const out = buildActivity(
    [{ sent_at: sentAt, status: 'sent', reply_class: null, replied_at: null }],
    NOW,
  )
  assert.ok(out.every((d) => d.sent === 0 && d.replies === 0))
})

test('an empty mailbox is seven honest zeroes', () => {
  const out = buildActivity([], NOW)
  assert.equal(out.length, 7)
  assert.ok(out.every((d) => d.sent === 0 && d.replies === 0))
  assert.deepEqual(
    out.map((d) => d.day),
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  )
})
