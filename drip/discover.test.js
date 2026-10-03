import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clampVoteWeight,
  describeKeychainResult,
  effectiveVests,
  hivePowerFromVests,
  hiveReputation,
  isHardReject,
  isValidHiveAccount,
  isValidTag,
  normalizeHiveAccount,
  normalizeTag,
  normalizeTitle,
  payoutLabel,
  relativeTime,
  scorePost,
  selectCandidate,
  snapVoteWeight,
  userHasVoted,
  weightedPick,
} from './discover.js'

const RAW_77 = 643154317820584

function post(overrides = {}) {
  return {
    author: 'alice',
    permlink: 'a-long-enough-story',
    title: 'A quiet morning in the garden',
    body: 'word '.repeat(120),
    body_length: 600,
    author_reputation: RAW_77,
    category: 'gardening',
    json_metadata: JSON.stringify({ tags: ['gardening', 'life'] }),
    parent_author: '',
    depth: 0,
    net_votes: 4,
    ...overrides,
  }
}

test('converts raw Hive reputation', () => {
  assert.equal(hiveReputation(0), 25)
  assert.equal(hiveReputation('0'), 25)
  assert.ok(Math.abs(hiveReputation(RAW_77) - 77.27) < 0.05)
  assert.ok(hiveReputation(-RAW_77) < 0)
})

test('normalizes Hive account names', () => {
  assert.equal(normalizeHiveAccount(' @Alice '), 'alice')
  assert.equal(isValidHiveAccount('alice'), true)
  assert.equal(isValidHiveAccount('ab'), false)
  assert.equal(isValidHiveAccount('a--b'), false)
  assert.equal(isValidHiveAccount('-alice'), false)
  assert.equal(isValidHiveAccount('alice-1'), true)
})

test('normalizes tags', () => {
  assert.equal(normalizeTag(' #Photo '), 'photo')
  assert.equal(isValidTag(''), true)
  assert.equal(isValidTag('hive-13323'), true)
  assert.equal(isValidTag('-nope'), false)
  assert.equal(isValidTag('has space'), false)
})

test('clamps and snaps vote weight', () => {
  assert.equal(clampVoteWeight('80'), 80)
  assert.equal(clampVoteWeight(0), 1)
  assert.equal(clampVoteWeight(140), 100)
  assert.equal(clampVoteWeight('nope'), 100)
  assert.equal(snapVoteWeight(27), 25)
  assert.equal(snapVoteWeight(40), 40)
  assert.equal(snapVoteWeight(96), 100)
})

test('rejects short, seen, duplicate, nsfw, and low-reputation posts', () => {
  const ctx = {
    minReputation: 35,
    seenSlugs: new Set(['bob/old-post-slug']),
    seenTitles: new Set(['a quiet morning in the garden']),
    dislikedAuthors: new Set(['carol']),
  }
  assert.equal(isHardReject(post({ body_length: 40, body: 'tiny' }), ctx), 'short')
  assert.equal(isHardReject(post({ category: 'nsfw', json_metadata: '{"tags":["nsfw"]}' }), ctx), 'nsfw')
  assert.equal(isHardReject(post({ author_reputation: 0 }), ctx), 'reputation')
  assert.equal(isHardReject(post({ author: 'bob', permlink: 'old-post-slug' }), ctx), 'seen')
  assert.equal(isHardReject(post(), ctx), 'duplicate')
  assert.equal(isHardReject(post({ author: 'carol', title: 'Something else entirely' }), ctx), 'disliked')
  assert.equal(isHardReject(post({ parent_author: 'dave', title: 'A reply that is long enough' }), ctx), 'reply')
  assert.equal(isHardReject(post({ title: 'WIN A FREE AIRDROP NOW', author_reputation: 0 }), { minReputation: 0 }), 'spam')
  assert.equal(isHardReject(post({
    title: 'Notes with a markdown divider',
    body: `${'word '.repeat(80)}\n${'-'.repeat(24)}\nmore words here for the story`,
  }), { minReputation: 0 }), null)
  assert.equal(isHardReject(post({
    title: 'Studio notes from today',
    body: `![](https://images.example/a.jpg)\n\nA short caption for the painting.`,
    body_length: 400,
  }), { minReputation: 0 }), null)
  const linkFarm = Array.from({ length: 8 }, (_, i) => `https://example.com/page-${i}-with-a-long-path`).join('\n')
  assert.equal(isHardReject(post({
    title: 'Read these links',
    body: linkFarm,
    body_length: linkFarm.length,
  }), { minReputation: 0 }), 'spam')
})

test('keeps a normal recent post', () => {
  const result = selectCandidate([
    post({ body_length: 20, body: 'no' }),
    post({ author: 'bea', permlink: 'fresh-notes', title: 'Fresh notes from the market' }),
  ], { minReputation: 25, seenSlugs: new Set(), seenTitles: new Set(), dislikedAuthors: new Set() })
  assert.equal(result.post.author, 'bea')
  assert.equal(result.considered, 1)
})

test('scores liked authors above strangers and can pick by weight', () => {
  const liked = post({ author: 'bea', permlink: 'liked-one', title: 'Notes from a liked author' })
  const other = post({ author: 'zoe', permlink: 'other-one', title: 'Notes from somebody else' })
  const prefs = { likedAuthors: { bea: 3 }, likedTags: {}, dislikedTags: {}, recentAuthors: new Set() }
  assert.ok(scorePost(liked, prefs) > scorePost(other, prefs))
  assert.equal(weightedPick([other, liked], { ...prefs, random: () => 0 }).author, 'zoe')
  assert.equal(weightedPick([other, liked], { ...prefs, random: () => 0.999 }).author, 'bea')
})

test('describes Keychain success, cancel, and failure', () => {
  assert.equal(describeKeychainResult({ success: true }).ok, true)
  assert.equal(describeKeychainResult({ success: false, error: 'user_cancel' }).cancelled, true)
  assert.match(describeKeychainResult({ success: false, message: 'Account not found' }).message, /not found/i)
  assert.equal(describeKeychainResult(null).ok, false)
})

test('estimates effective Hive Power', () => {
  const vests = effectiveVests({
    vesting_shares: '2000.000000 VESTS',
    delegated_vesting_shares: '500.000000 VESTS',
    received_vesting_shares: '100.000000 VESTS',
  })
  assert.equal(vests, 1600)
  const hp = hivePowerFromVests(vests, {
    total_vesting_fund_hive: '200000000.000 HIVE',
    total_vesting_shares: '400000000000.000000 VESTS',
  })
  assert.ok(Math.abs(hp - 0.8) < 0.0001)
})

test('formats time, payout, and existing votes', () => {
  const now = Date.parse('2026-10-03T16:00:00Z')
  assert.equal(relativeTime('2026-10-03T15:10:00', now), '50m ago')
  assert.equal(payoutLabel({ pending_payout_value: '1.250 HBD' }), '1.250 HBD')
  assert.equal(payoutLabel({ pending_payout_value: '0.000 HBD', total_payout_value: '2.000 HBD', curator_payout_value: '0.500 HBD' }), '2.500 HBD')
  assert.equal(userHasVoted({ active_votes: [{ voter: 'alice', percent: 10000 }] }, 'alice'), true)
  assert.equal(userHasVoted({ active_votes: [{ voter: 'alice', percent: 0 }] }, 'alice'), false)
  assert.equal(normalizeTitle('Hello, World!!'), 'hello world')
})
