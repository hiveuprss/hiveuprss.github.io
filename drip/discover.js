// Pure helpers for post selection, account names, and Keychain results.
// No DOM or network access, so the rules can be tested on their own.

export const MIN_BODY_LENGTH = 280
export const NSFW_TAGS = ['porn', 'dporn', 'xxx', 'nsfw', 'nsfw-art']
export const SNAP_POINTS = [25, 50, 75, 100]
export const SNAP_THRESHOLD = 8
export const REPUTATION_OPTIONS = [0, 25, 35, 50, 60]

const SPAM_TITLE = /\b(airdrop|giveaway|claim your|send hive to|follow(?:\s+me)?\s+for\s+a)\b/i

export function hiveReputation(raw) {
  const rep = typeof raw === 'number' ? raw : parseFloat(raw)
  if (!Number.isFinite(rep) || rep === 0) return 25
  const neg = rep < 0
  let out = Math.log10(Math.abs(rep))
  out = Math.max(out - 9, 0)
  if (neg) out = -out
  out = out * 9 + 25
  return out
}

export function normalizeHiveAccount(value) {
  return String(value || '').trim().replace(/^@+/, '').toLowerCase()
}

export function isValidHiveAccount(name) {
  return /^[a-z][a-z0-9-]{1,14}[a-z0-9]$/.test(name) && !name.includes('--')
}

export function normalizeTag(value) {
  return String(value || '')
    .trim()
    .replace(/^#+/, '')
    .toLowerCase()
    .replace(/\s+/g, '')
}

export function isValidTag(tag) {
  if (tag === '') return true
  return /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(tag)
}

export function clampVoteWeight(value) {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return 100
  return Math.min(100, Math.max(1, n))
}

export function snapVoteWeight(value) {
  const n = clampVoteWeight(value)
  let best = n
  let bestDist = SNAP_THRESHOLD + 1
  for (const point of SNAP_POINTS) {
    const dist = Math.abs(point - n)
    if (dist <= SNAP_THRESHOLD && dist < bestDist) {
      best = point
      bestDist = dist
    }
  }
  return best
}

export function normalizeTitle(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function getPostTags(post) {
  const found = []
  try {
    const meta = JSON.parse(post?.json_metadata || '{}')
    if (Array.isArray(meta.tags)) {
      for (const tag of meta.tags) {
        const clean = normalizeTag(tag)
        if (clean) found.push(clean)
      }
    }
  } catch {
    /* metadata is free-form; ignore broken JSON */
  }
  const category = normalizeTag(post?.category || '')
  if (category && !found.includes(category)) found.unshift(category)
  return found
}

export function postSlug(post) {
  return `${post.author}/${post.permlink}`
}

export function contentShape(body) {
  const text = String(body || '')
  const images = (text.match(/!\[[^\]]*\]\([^)]*\)|<img\b/gi) || []).length
  const withoutImages = text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/<img\b[^>]*>/gi, ' ')
  const urls = (withoutImages.match(/https?:\/\/\S+/g) || []).length
  const words = withoutImages
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\[[^\]]*\]\([^)]*\)/g, ' ')
    .split(/\s+/)
    .filter((word) => /[\p{L}\p{N}]/u.test(word)).length
  return { images, urls, words }
}

function capsRatio(title) {
  const letters = String(title || '').replace(/[^A-Za-z]/g, '')
  if (!letters.length) return 0
  const caps = letters.replace(/[^A-Z]/g, '').length
  return caps / letters.length
}

export function voteSignal(post) {
  if (typeof post?.net_votes === 'number' && Number.isFinite(post.net_votes)) {
    return post.net_votes
  }
  const votes = Array.isArray(post?.active_votes) ? post.active_votes : []
  let score = 0
  for (const vote of votes) {
    const weight = Number(vote?.percent ?? vote?.rshares ?? 0)
    if (weight > 0) score += 1
    else if (weight < 0) score -= 1
  }
  return score
}

export function isHardReject(post, ctx = {}) {
  if (!post || !post.author || !post.permlink) return 'invalid'
  if (post.parent_author) return 'reply'
  if (Number(post.depth) > 0) return 'reply'

  const body = String(post.body || '')
  const reported = Math.max(Number(post.body_length) || 0, body.length)
  if (reported < MIN_BODY_LENGTH) return 'short'

  const tags = getPostTags(post)
  const category = normalizeTag(post.category || '')
  if (NSFW_TAGS.includes(category) || tags.some((tag) => NSFW_TAGS.includes(tag))) return 'nsfw'

  const rep = hiveReputation(post.author_reputation)
  if (rep < 0) return 'flagged'
  const minReputation = Number(ctx.minReputation) || 0
  if (rep < minReputation) return 'reputation'

  const slug = postSlug(post)
  if (ctx.seenSlugs && ctx.seenSlugs.has(slug)) return 'seen'
  if (ctx.dislikedAuthors && ctx.dislikedAuthors.has(post.author)) return 'disliked'

  const titleNorm = normalizeTitle(post.title)
  if (!titleNorm) return 'title'
  if (titleNorm.length >= 12 && ctx.seenTitles && ctx.seenTitles.has(titleNorm)) return 'duplicate'

  if (SPAM_TITLE.test(post.title || '') && rep < 45) return 'spam'
  // Letter or digit runs. Markdown rules (----, ____) are normal and ignored.
  if (/([A-Za-z0-9])\1{16,}/.test(body)) return 'spam'

  const bodyLooksComplete = body.length >= reported * 0.8 || body.length >= 400
  if (bodyLooksComplete) {
    const shape = contentShape(body)
    if (shape.words < 25 && shape.images === 0 && shape.urls >= 3) return 'spam'
  }

  return null
}

export function scorePost(post, prefs = {}) {
  const tags = getPostTags(post)
  const rep = hiveReputation(post.author_reputation)
  const length = Math.max(Number(post.body_length) || 0, String(post.body || '').length)
  let score = 1

  if (rep >= 35 && rep < 70) score += 1.4
  else if (rep >= 70) score += 0.55
  else if (rep < 28) score -= 0.45

  if (length >= 600 && length <= 12000) score += 1
  else if (length >= MIN_BODY_LENGTH) score += 0.25
  if (length > 20000) score -= 0.35

  const votes = voteSignal(post)
  if (votes >= 1 && votes <= 40) score += 0.45
  if (votes < 0) score -= 0.9

  const shape = contentShape(post.body || '')
  if (shape.images > 0) score += 0.2
  if (shape.words >= 80) score += 0.35
  else if (shape.words < 30 && shape.images === 0) score -= 0.35

  if (String(post.max_accepted_payout || '').startsWith('0.000')) score += 0.15

  const letters = String(post.title || '').replace(/[^A-Za-z]/g, '')
  if (letters.length > 20 && capsRatio(post.title) > 0.75) score *= 0.45
  if (SPAM_TITLE.test(post.title || '')) score *= 0.35

  if (prefs.recentAuthors && prefs.recentAuthors.has(post.author)) score *= 0.3

  const likedAuthors = prefs.likedAuthors || {}
  const likedTags = prefs.likedTags || {}
  const dislikedTags = prefs.dislikedTags || {}
  score += Math.min(6, (likedAuthors[post.author] || 0) * 2)
  for (const tag of tags) {
    score += Math.min(3, likedTags[tag] || 0)
    score -= Math.min(3, dislikedTags[tag] || 0) * 0.5
  }

  return Math.max(0.05, score)
}

export function weightedPick(posts, prefs = {}) {
  if (!posts || !posts.length) return null
  const scores = posts.map((post) => scorePost(post, prefs))
  const total = scores.reduce((sum, score) => sum + score, 0)
  const rng = typeof prefs.random === 'function' ? prefs.random : Math.random
  let cursor = rng() * total
  for (let i = 0; i < posts.length; i++) {
    cursor -= scores[i]
    if (cursor <= 0) return posts[i]
  }
  return posts[posts.length - 1]
}

export function selectCandidate(posts, ctx = {}, prefs = {}) {
  const viable = []
  const rejected = []
  for (const post of posts || []) {
    const reason = isHardReject(post, ctx)
    if (reason) rejected.push(reason)
    else viable.push(post)
  }
  return {
    post: weightedPick(viable, prefs),
    rejected,
    considered: viable.length,
  }
}

export function describeKeychainResult(response) {
  if (!response || typeof response !== 'object') {
    return { ok: false, message: 'Hive Keychain did not respond.' }
  }
  if (response.success) {
    return { ok: true, message: response.message || 'Confirmed in Hive Keychain.' }
  }
  const raw = response.message || response.error || response.data?.message || 'Request was rejected.'
  const text = typeof raw === 'string' ? raw : (raw.message || 'Request was rejected.')
  if (/cancel/i.test(text)) {
    return { ok: false, cancelled: true, message: 'Cancelled in Hive Keychain.' }
  }
  return { ok: false, message: text }
}

export function effectiveVests(account) {
  const num = (value) => {
    const n = parseFloat(String(value || '0').split(' ')[0])
    return Number.isFinite(n) ? n : 0
  }
  if (!account) return 0
  return num(account.vesting_shares) - num(account.delegated_vesting_shares) + num(account.received_vesting_shares)
}

export function hivePowerFromVests(vests, props) {
  const fund = parseFloat(props?.total_vesting_fund_hive)
  const shares = parseFloat(props?.total_vesting_shares)
  if (!Number.isFinite(vests) || !Number.isFinite(fund) || !Number.isFinite(shares) || shares === 0) return 0
  return vests * (fund / shares)
}

export function formatHivePower(hp) {
  if (!Number.isFinite(hp) || hp < 0) return ''
  if (hp >= 100) return `${Math.round(hp).toLocaleString()} HP`
  if (hp >= 1) return `${hp.toFixed(1)} HP`
  return `${hp.toFixed(3)} HP`
}

export function relativeTime(created, now = Date.now()) {
  if (!created) return ''
  const then = new Date(`${created}Z`).getTime()
  if (!Number.isFinite(then)) return ''
  const seconds = Math.max(0, Math.round((now - then) / 1000))
  if (seconds < 45) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 36) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

export function payoutLabel(post) {
  const pending = parseFloat(post?.pending_payout_value || '0')
  if (Number.isFinite(pending) && pending > 0) return String(post.pending_payout_value)
  const paid = parseFloat(post?.total_payout_value || '0') + parseFloat(post?.curator_payout_value || '0')
  if (Number.isFinite(paid) && paid > 0) return `${paid.toFixed(3)} HBD`
  return ''
}

export function userHasVoted(post, account) {
  if (!account || !Array.isArray(post?.active_votes)) return false
  return post.active_votes.some((vote) => vote.voter === account && Number(vote.percent ?? vote.rshares ?? 0) !== 0)
}
