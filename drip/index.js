import { renderPostBody } from 'https://esm.sh/@ecency/render-helper@2.4.21'
import DOMPurify from 'https://esm.sh/dompurify@3.2.3'
import {
  clampVoteWeight,
  describeKeychainResult,
  effectiveVests,
  formatHivePower,
  getPostTags,
  hivePowerFromVests,
  hiveReputation,
  isValidHiveAccount,
  isValidTag,
  normalizeHiveAccount,
  normalizeTag,
  normalizeTitle,
  payoutLabel,
  postSlug,
  relativeTime,
  REPUTATION_OPTIONS,
  selectCandidate,
  snapVoteWeight,
  userHasVoted,
} from './discover.js'

const API_NODES = [
  'https://api.deathwing.me',
  'https://api.hive.blog',
]
const SEEN_SLUGS_KEY = 'rh-seen-slugs'
const SEEN_TITLES_KEY = 'rh-seen-titles'
const DISLIKED_AUTHORS_KEY = 'rh-disliked-authors'
const LIKED_AUTHORS_KEY = 'rh-liked-authors'
const LIKED_TAGS_KEY = 'rh-liked-tags'
const DISLIKED_TAGS_KEY = 'rh-disliked-tags'
const WEIGHT_KEY = 'rh-vote-weight'
const FILTER_TAG_KEY = 'rh-filter-tag'
const FILTER_REP_KEY = 'rh-filter-rep'
const CURSOR_KEY = 'rh-cursor'
const ACCOUNT_KEY = 'hiveaccount'
const SEEN_SLUGS_MAX = 500
const SEEN_TITLES_MAX = 300
const DISLIKED_MAX = 200
const MAX_PAGES = 8
const DECAY_FACTOR = 0.99
const DECAY_KEYS = [LIKED_AUTHORS_KEY, LIKED_TAGS_KEY, DISLIKED_TAGS_KEY]

const $ = (id) => document.getElementById(id)

const els = {
  card: $('post-card'),
  state: $('post-state'),
  content: $('hr-content'),
  status: $('discovery-status'),
  announcer: $('post-announcer'),
  signin: $('signin'),
  username: $('username'),
  signinButton: $('signin-button'),
  chip: $('account-chip'),
  avatar: $('account-avatar'),
  accountName: $('account-name'),
  accountHp: $('account-hp'),
  signout: $('signout'),
  filters: $('filters'),
  tag: $('filter-tag'),
  rep: $('filter-rep'),
  clearFilters: $('clear-filters'),
  resetSeen: $('reset-seen'),
  keychainHint: $('keychain-hint'),
  peakd: $('peakd'),
  hiveblog: $('hiveblog'),
  upvote: $('upvote'),
  follow: $('follow'),
  reblog: $('reblog'),
  nextUp: $('next-up'),
  nextDown: $('next-down'),
  weight: $('vote-weight-slider'),
  weightLabel: $('vote-weight-label'),
  weightBadge: $('vote-weight-badge'),
  toasts: $('toasts'),
  votePopup: $('vote-popup'),
  votePopupSlider: $('vote-popup-slider'),
  votePopupLabel: $('vote-popup-label'),
  votePopupClose: $('vote-popup-close'),
  votePopupConfirm: $('vote-popup-confirm'),
  help: $('help-dialog'),
  helpOpen: $('shortcut-help'),
  helpClose: $('help-close'),
}

const filters = { tag: '', minRep: 25 }
const state = {
  post: null,
  queue: [],
  cursor: null,
  reserved: new Set(),
  reservedTitles: new Set(),
  recentAuthors: [],
  generation: 0,
  actionPending: null,
  follows: false,
  reblogged: false,
  voted: false,
  searching: false,
}
const sessionReblogs = new Set()
let nodeIndex = 0
let tail = Promise.resolve()
let advanceToken = 0
let presentId = 0
let lastFocus = null
let tagMissing = false

window.__dripReady = true
if (els.state) els.state.dataset.ready = '1'

function loadList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : []
  } catch {
    return []
  }
}

function saveList(key, list) {
  try { localStorage.setItem(key, JSON.stringify(list)) } catch { /* private mode */ }
}

function pushCapped(key, value, max) {
  const list = loadList(key).filter((item) => item !== value)
  list.push(value)
  while (list.length > max) list.shift()
  saveList(key, list)
}

function getCountMap(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '{}')
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return value
  } catch {
    return {}
  }
}

function saveCountMap(key, map) {
  const pruned = {}
  for (const [name, score] of Object.entries(map)) {
    if (score >= 0.05) pruned[name] = Math.round(score * 1000) / 1000
  }
  try { localStorage.setItem(key, JSON.stringify(pruned)) } catch { /* private mode */ }
}

function decayCountMaps() {
  for (const key of DECAY_KEYS) {
    const map = getCountMap(key)
    for (const name of Object.keys(map)) map[name] *= DECAY_FACTOR
    saveCountMap(key, map)
  }
}

function incrementCountMap(key, items) {
  const map = getCountMap(key)
  const list = Array.isArray(items) ? items : [items]
  for (const item of list) {
    if (!item) continue
    map[item] = (map[item] || 0) + 1
  }
  saveCountMap(key, map)
}

function recordLike(author, tags) {
  decayCountMaps()
  incrementCountMap(LIKED_AUTHORS_KEY, author)
  if (tags?.length) incrementCountMap(LIKED_TAGS_KEY, tags)
}

function recordDislike(tags) {
  decayCountMaps()
  if (tags?.length) incrementCountMap(DISLIKED_TAGS_KEY, tags)
}

function addDislikedAuthor(author) {
  const list = loadList(DISLIKED_AUTHORS_KEY).filter((item) => item !== author)
  list.push(author)
  while (list.length > DISLIKED_MAX) list.shift()
  saveList(DISLIKED_AUTHORS_KEY, list)
}

function removeDislikedAuthor(author) {
  saveList(DISLIKED_AUTHORS_KEY, loadList(DISLIKED_AUTHORS_KEY).filter((item) => item !== author))
  toast(`@${author} can show up again.`, 'ok')
}

function getAccount() {
  try { return localStorage.getItem(ACCOUNT_KEY) || '' } catch { return '' }
}

function filterSignature() {
  return `${filters.tag}|${filters.minRep}`
}

function persistCursor() {
  try {
    if (!state.cursor) sessionStorage.removeItem(CURSOR_KEY)
    else sessionStorage.setItem(CURSOR_KEY, JSON.stringify(state.cursor))
  } catch { /* ignore */ }
}

function restoreCursor() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(CURSOR_KEY) || 'null')
    if (saved && saved.filter === filterSignature() && saved.author && saved.permlink) state.cursor = saved
  } catch { /* ignore */ }
}

function currentCtx() {
  return {
    minReputation: filters.minRep,
    seenSlugs: new Set([...loadList(SEEN_SLUGS_KEY), ...state.reserved]),
    seenTitles: new Set([...loadList(SEEN_TITLES_KEY), ...state.reservedTitles]),
    dislikedAuthors: new Set(loadList(DISLIKED_AUTHORS_KEY)),
  }
}

function currentPrefs() {
  return {
    likedAuthors: getCountMap(LIKED_AUTHORS_KEY),
    likedTags: getCountMap(LIKED_TAGS_KEY),
    dislikedTags: getCountMap(DISLIKED_TAGS_KEY),
    recentAuthors: new Set(state.recentAuthors),
  }
}

function reserve(post) {
  state.reserved.add(postSlug(post))
  const title = normalizeTitle(post.title)
  if (title.length >= 12) state.reservedTitles.add(title)
}

function unreserve(post) {
  state.reserved.delete(postSlug(post))
  const title = normalizeTitle(post.title)
  if (title) state.reservedTitles.delete(title)
}

function remember(post) {
  pushCapped(SEEN_SLUGS_KEY, postSlug(post), SEEN_SLUGS_MAX)
  const title = normalizeTitle(post.title)
  if (title.length >= 12) pushCapped(SEEN_TITLES_KEY, title, SEEN_TITLES_MAX)
  unreserve(post)
  state.recentAuthors.push(post.author)
  if (state.recentAuthors.length > 8) state.recentAuthors.shift()
}

function dropAuthorFromQueue(author) {
  state.queue = state.queue.filter((item) => {
    if (item.author !== author) return true
    unreserve(item)
    return false
  })
}

function locked(fn) {
  const run = tail.then(fn, fn)
  tail = run.then(() => {}, () => {})
  return run
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timed out')), ms)
    Promise.resolve(promise).then(
      (value) => { clearTimeout(timer); resolve(value) },
      (error) => { clearTimeout(timer); reject(error) },
    )
  })
}

async function hiveCall(method, params) {
  if (typeof hiveTx === 'undefined') {
    throw new Error('The Hive API library did not load. Refresh and try again.')
  }
  const failures = []
  for (let attempt = 0; attempt < API_NODES.length; attempt++) {
    const node = API_NODES[nodeIndex]
    hiveTx.config.node = node
    try {
      const res = await withTimeout(hiveTx.call(method, params), 12000)
      if (!res || res.error) {
        const message = res?.error?.message || res?.error || 'Empty response'
        throw new Error(typeof message === 'string' ? message : 'Hive node error')
      }
      return res.result
    } catch (error) {
      failures.push(error instanceof Error ? error : new Error(String(error?.message || error)))
      nodeIndex = (nodeIndex + 1) % API_NODES.length
    }
  }
  const rpc = failures.find((error) => !isTransportError(error))
  if (rpc) throw rpc
  const reason = failures[0]?.message || 'network error'
  throw new Error(`Couldn't reach Hive (${reason}).`)
}

function isTransportError(error) {
  return /timed out|network|failed to fetch|econn|socket|abort|load failed/i.test(String(error?.message || ''))
}

function isMissingTag(error) {
  return /tag .* does not exist/i.test(String(error?.message || ''))
}

async function fetchPage(gen) {
  const query = { tag: filters.tag, limit: 20 }
  if (state.cursor) {
    query.start_author = state.cursor.author
    query.start_permlink = state.cursor.permlink
  }
  let posts
  try {
    posts = await hiveCall('condenser_api.get_discussions_by_created', [query])
  } catch (error) {
    if (isMissingTag(error)) {
      tagMissing = true
      return []
    }
    throw error
  }
  if (gen !== state.generation) return []
  if (!Array.isArray(posts) || posts.length === 0) return []
  let list = posts
  const cursor = state.cursor
  if (cursor && list[0] && list[0].author === cursor.author && list[0].permlink === cursor.permlink) {
    list = list.slice(1)
  }
  const last = posts[posts.length - 1]
  if (cursor && cursor.author === last.author && cursor.permlink === last.permlink) return []
  state.cursor = { author: last.author, permlink: last.permlink, filter: filterSignature() }
  persistCursor()
  return list
}

async function discoverOne(gen, quiet) {
  let wrapped = false
  tagMissing = false
  for (let page = 0; page < MAX_PAGES; page++) {
    if (gen !== state.generation) return null
    if (!quiet) setStatus(page === 0 ? 'Searching recent posts…' : `Looking further back… (${page + 1})`)
    const batch = await fetchPage(gen)
    if (gen !== state.generation) return null
    if (!batch.length) {
      if (wrapped || tagMissing) return null
      wrapped = true
      state.cursor = null
      persistCursor()
      continue
    }
    const selection = selectCandidate(batch, currentCtx(), currentPrefs())
    if (selection.post) {
      reserve(selection.post)
      return selection.post
    }
  }
  return null
}

function setStatus(text) {
  els.status.textContent = text
}

function updateIdleStatus() {
  const seen = loadList(SEEN_SLUGS_KEY).length
  const parts = [
    filters.tag ? `Tagged #${filters.tag}` : 'Recent posts',
    filters.minRep > 0 ? `reputation ${filters.minRep}+` : 'any reputation',
    `${seen} remembered`,
  ]
  if (state.queue.length) parts.push(`${state.queue.length} ready`)
  setStatus(parts.join(' · '))
}

function setSearching(on) {
  state.searching = on
  els.card.classList.toggle('is-searching', on)
  els.card.setAttribute('aria-busy', on ? 'true' : 'false')
  syncActions()
}

function showSkeleton() {
  els.content.hidden = true
  els.content.innerHTML = ''
  els.state.hidden = false
  els.state.innerHTML = `
    <div class="skeleton" aria-hidden="true">
      <div class="sk sk-title"></div>
      <div class="sk sk-meta"></div>
      <div class="sk sk-line"></div>
      <div class="sk sk-line"></div>
      <div class="sk sk-line short"></div>
    </div>
    <p class="skeleton-label">Looking for a post…</p>`
  els.card.classList.add('is-empty')
  els.announcer.textContent = 'Looking for a post'
}

function showError(error) {
  state.post = null
  els.content.hidden = true
  els.state.hidden = false
  els.state.replaceChildren()
  const wrap = document.createElement('div')
  wrap.className = 'state-card'
  const heading = document.createElement('h1')
  heading.textContent = "Couldn't load a post"
  const copy = document.createElement('p')
  copy.textContent = error?.message || 'Something went wrong while loading a post.'
  const retry = document.createElement('button')
  retry.type = 'button'
  retry.className = 'btn-solid'
  retry.textContent = 'Try again'
  retry.addEventListener('click', () => { void advance() })
  wrap.append(heading, copy, retry)
  els.state.appendChild(wrap)
  els.card.classList.add('is-empty')
  setStatus('Could not reach Hive.')
  document.title = 'Drip'
  syncActions()
}

function showEmpty() {
  state.post = null
  els.content.hidden = true
  els.state.hidden = false
  els.state.replaceChildren()
  const wrap = document.createElement('div')
  wrap.className = 'state-card'
  const heading = document.createElement('h1')
  heading.textContent = 'No post matched'
  const copy = document.createElement('p')
  if (tagMissing) copy.textContent = `#${filters.tag} isn't a Hive tag or community.`
  else if (filters.tag) copy.textContent = `Nothing recent in #${filters.tag} cleared the reputation and quality filters.`
  else copy.textContent = 'Recent posts were already seen, too short, or below your reputation filter.'
  const actions = document.createElement('div')
  actions.className = 'state-actions'
  const again = document.createElement('button')
  again.type = 'button'
  again.className = 'btn-solid'
  again.textContent = 'Keep looking'
  again.addEventListener('click', () => { void advance() })
  const reset = document.createElement('button')
  reset.type = 'button'
  reset.className = 'btn-tiny btn-quiet'
  reset.textContent = 'Reset filters'
  reset.addEventListener('click', () => clearFilters())
  const forget = document.createElement('button')
  forget.type = 'button'
  forget.className = 'btn-tiny btn-quiet'
  forget.textContent = 'Forget seen'
  forget.addEventListener('click', () => forgetSeen())
  actions.append(again, reset, forget)
  wrap.append(heading, copy, actions)
  els.state.appendChild(wrap)
  els.card.classList.add('is-empty')
  setStatus('No matching post.')
  document.title = 'Drip'
  syncActions()
}

function hashFor(post) {
  return `#@${encodeURIComponent(post.author)}/${encodeURIComponent(post.permlink)}`
}

function parseHash() {
  const match = location.hash.match(/^#@([^/]+)\/(.+)$/)
  if (!match) return null
  try {
    return { author: decodeURIComponent(match[1]), permlink: decodeURIComponent(match[2]) }
  } catch {
    return { author: match[1], permlink: match[2] }
  }
}

function setExternal(el, url, label) {
  if (url) {
    el.href = url
    el.removeAttribute('aria-disabled')
    el.tabIndex = 0
    el.setAttribute('aria-label', label)
  } else {
    el.removeAttribute('href')
    el.setAttribute('aria-disabled', 'true')
    el.tabIndex = -1
  }
}

function syncFollowButton() {
  const label = els.follow.querySelector('.btn-label')
  label.textContent = state.follows ? 'Following' : 'Follow'
  els.follow.classList.toggle('is-done', state.follows)
  els.follow.title = state.follows ? 'Unfollow (F)' : 'Follow author (F)'
  els.follow.setAttribute('aria-pressed', state.follows ? 'true' : 'false')
  els.follow.setAttribute('aria-label', state.follows ? 'Unfollow author' : 'Follow author')
}

function syncActions() {
  const post = state.post
  const account = getAccount()
  const signed = Boolean(account)
  const pending = state.actionPending
  document.body.classList.toggle('is-signed-in', signed)
  const ownPost = Boolean(post && account && account === post.author)
  els.upvote.disabled = !post || pending === 'vote' || pending === 'signin'
  els.follow.disabled = !post || ownPost || pending === 'follow' || pending === 'signin'
  els.reblog.disabled = !post || ownPost || state.reblogged || pending === 'reblog' || pending === 'signin'
  els.nextUp.disabled = state.searching && state.queue.length === 0
  els.nextDown.disabled = state.searching && state.queue.length === 0
  els.upvote.classList.toggle('is-done', Boolean(post) && state.voted)
  els.upvote.title = state.voted ? 'Change upvote (V)' : 'Upvote (V)'
  els.reblog.classList.toggle('is-done', state.reblogged)
  els.reblog.title = state.reblogged ? 'Reblogged' : 'Reblog (R)'
  setExternal(els.peakd, post ? `https://peakd.com/@${post.author}/${post.permlink}` : '', post ? `View @${post.author} on PeakD` : 'View on PeakD')
  setExternal(els.hiveblog, post ? `https://hive.blog/@${post.author}/${post.permlink}` : '', post ? `View @${post.author} on Hive.blog` : 'View on Hive.blog')
}

function renderPost(post) {
  const rep = hiveReputation(post.author_reputation)
  const when = relativeTime(post.created)
  const payout = payoutLabel(post)
  const tags = getPostTags(post).slice(0, 8)
  els.content.replaceChildren()

  const title = document.createElement('h1')
  title.id = 'post-title'
  title.textContent = post.title || 'Untitled'

  const byline = document.createElement('p')
  byline.className = 'post-author'
  const author = document.createElement('a')
  author.href = `https://peakd.com/@${post.author}`
  author.target = '_blank'
  author.rel = 'noopener noreferrer'
  author.textContent = `@${post.author}`
  byline.appendChild(author)

  const repBadge = document.createElement('span')
  repBadge.className = 'rep-badge'
  repBadge.title = 'Hive reputation'
  repBadge.textContent = `${rep.toFixed(1)} rep`
  byline.appendChild(repBadge)

  if (when) {
    const time = document.createElement('time')
    time.className = 'post-date'
    time.dateTime = `${post.created}Z`
    time.textContent = when
    time.title = new Date(`${post.created}Z`).toLocaleString()
    byline.appendChild(time)
  }
  if (payout) {
    const pay = document.createElement('span')
    pay.className = 'payout-badge'
    pay.textContent = payout
    byline.appendChild(pay)
  }

  els.content.append(title, byline)

  if (tags.length) {
    const row = document.createElement('div')
    row.className = 'post-tags'
    for (const tag of tags) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'post-tag'
      button.textContent = `#${tag}`
      button.title = `Show recent posts tagged #${tag}`
      button.addEventListener('click', () => applyTag(tag))
      row.appendChild(button)
    }
    els.content.appendChild(row)
  }

  const body = document.createElement('div')
  body.className = 'post-body'
  body.innerHTML = DOMPurify.sanitize(renderPostBody(post, false), {
    FORCE_BODY: true,
    FORBID_TAGS: ['meta', 'base', 'dialog', 'marquee', 'form', 'object', 'embed', 'noscript', 'template'],
    FORBID_ATTR: ['style'],
  })
  body.querySelectorAll('img').forEach((img) => {
    img.loading = 'lazy'
    img.decoding = 'async'
    if (!img.getAttribute('alt')) img.alt = ''
  })
  body.querySelectorAll('a[target="_blank"]').forEach((link) => {
    link.rel = 'noopener noreferrer'
  })
  body.querySelectorAll('iframe').forEach((frame) => {
    if (!frame.title) frame.title = 'Embedded content'
  })
  els.content.appendChild(body)
}

function present(post) {
  remember(post)
  state.post = post
  state.follows = false
  state.reblogged = sessionReblogs.has(postSlug(post))
  state.voted = userHasVoted(post, getAccount())
  els.state.hidden = true
  els.state.replaceChildren()
  els.content.hidden = false
  els.card.classList.remove('is-empty')
  renderPost(post)
  const nextUrl = `${location.pathname}${location.search}${hashFor(post)}`
  if (`${location.pathname}${location.search}${location.hash}` !== nextUrl) {
    history.replaceState(null, '', nextUrl)
  }
  document.title = `${String(post.title || 'Post').slice(0, 80)} — Drip`
  els.announcer.textContent = `Showing ${post.title || 'Untitled'} by @${post.author}`
  syncFollowButton()
  syncActions()
  updateIdleStatus()
  const id = ++presentId
  void refreshRelationship(post, id)
}

async function refreshRelationship(post, id) {
  const account = getAccount()
  if (!account || account === post.author) return
  try {
    const result = await hiveCall('bridge.get_relationship_between_accounts', [account, post.author])
    if (id !== presentId || state.post !== post) return
    state.follows = Boolean(result?.follows)
    syncFollowButton()
  } catch {
    /* relationship lookup is optional */
  }
}

async function pump() {
  const gen = state.generation
  try {
    await locked(async () => {
      let guard = 0
      while (state.queue.length < 2 && gen === state.generation && guard < 3) {
        guard += 1
        const found = await discoverOne(gen, true)
        if (!found || gen !== state.generation) break
        const slug = postSlug(found)
        if (state.post && postSlug(state.post) === slug) break
        if (state.queue.some((item) => postSlug(item) === slug)) break
        state.queue.push(found)
      }
    })
  } catch {
    if (gen === state.generation && state.post) setStatus('Could not prefetch the next post.')
  } finally {
    if (gen === state.generation && state.post && !state.searching) updateIdleStatus()
  }
}

async function advance({ feedback } = {}) {
  const leaving = state.post
  if (leaving && feedback === 'like') recordLike(leaving.author, getPostTags(leaving))
  if (leaving && feedback === 'skip') {
    addDislikedAuthor(leaving.author)
    recordDislike(getPostTags(leaving))
    dropAuthorFromQueue(leaving.author)
    toast(`Hiding posts from @${leaving.author}.`, 'info', {
      label: 'Undo',
      run: () => removeDislikedAuthor(leaving.author),
    })
  }

  if (state.queue.length) {
    present(state.queue.shift())
    void pump()
    return
  }

  const gen = state.generation
  const token = ++advanceToken
  if (!state.post) showSkeleton()
  setSearching(true)
  try {
    const found = await locked(() => discoverOne(gen, false))
    if (token !== advanceToken || gen !== state.generation) return
    if (!found) {
      if (state.post) toast('No other post matched your filters.', 'info')
      else showEmpty()
      return
    }
    present(found)
    void pump()
  } catch (error) {
    if (token !== advanceToken || gen !== state.generation) return
    if (state.post) toast(error.message || 'Could not load another post.', 'error')
    else showError(error)
  } finally {
    if (token === advanceToken) {
      setSearching(false)
      if (state.post) updateIdleStatus()
    }
  }
}

function restart() {
  state.generation += 1
  state.queue = []
  state.reserved.clear()
  state.reservedTitles.clear()
  state.cursor = null
  state.post = null
  persistCursor()
  showSkeleton()
  void advance()
}

async function openSlug(author, permlink) {
  const gen = state.generation
  const token = ++advanceToken
  state.post = null
  showSkeleton()
  setSearching(true)
  try {
    const post = await locked(() => hiveCall('condenser_api.get_content', [author, permlink]))
    if (token !== advanceToken || gen !== state.generation) return
    if (!post?.author || !post?.permlink) {
      showError(new Error('That post could not be found.'))
      return
    }
    present(post)
    void pump()
  } catch (error) {
    if (token === advanceToken && gen === state.generation) showError(error)
  } finally {
    if (token === advanceToken) setSearching(false)
  }
}

function toast(message, kind = 'info', action = null) {
  const item = document.createElement('div')
  item.className = `toast toast-${kind}`
  item.setAttribute('role', kind === 'error' ? 'alert' : 'status')
  const text = document.createElement('p')
  text.textContent = message
  item.appendChild(text)
  if (action) {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = action.label
    button.addEventListener('click', () => {
      action.run()
      item.remove()
    })
    item.appendChild(button)
  }
  els.toasts.appendChild(item)
  while (els.toasts.children.length > 3) els.toasts.firstElementChild.remove()
  window.setTimeout(() => {
    item.classList.add('is-leaving')
    window.setTimeout(() => item.remove(), 220)
  }, action ? 7000 : 4200)
}

function waitForKeychain(ms = 1500) {
  if (window.hive_keychain) return Promise.resolve(window.hive_keychain)
  return new Promise((resolve) => {
    const started = Date.now()
    const timer = window.setInterval(() => {
      if (window.hive_keychain || Date.now() - started >= ms) {
        window.clearInterval(timer)
        resolve(window.hive_keychain || null)
      }
    }, 100)
  })
}

async function callKeychain(method, args) {
  const keychain = await waitForKeychain(700)
  if (!keychain || typeof keychain[method] !== 'function') {
    throw new Error('Hive Keychain was not found. Install the extension, then refresh.')
  }
  return new Promise((resolve, reject) => {
    let settled = false
    const timer = window.setTimeout(() => {
      if (settled) return
      settled = true
      reject(new Error('Hive Keychain timed out. Finish its popup if it is still open, then try again.'))
    }, 90000)
    try {
      keychain[method](...args, (response) => {
        if (settled) return
        settled = true
        window.clearTimeout(timer)
        resolve(response)
      })
    } catch (error) {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      reject(error instanceof Error ? error : new Error('Hive Keychain could not start that request.'))
    }
  })
}

function requireAccount(action) {
  const account = getAccount()
  if (account) return account
  toast(`Sign in with Hive Keychain to ${action}.`, 'info')
  if (!els.signin.hidden) els.username.focus()
  return ''
}

function applyWeight(value, snap) {
  const next = snap ? snapVoteWeight(value) : clampVoteWeight(value)
  try { localStorage.setItem(WEIGHT_KEY, String(next)) } catch { /* ignore */ }
  els.weight.value = String(next)
  els.votePopupSlider.value = String(next)
  els.weightLabel.textContent = `${next}%`
  els.votePopupLabel.textContent = `${next}%`
  els.weightBadge.textContent = `${next}%`
  els.weight.setAttribute('aria-valuenow', String(next))
  els.weight.setAttribute('aria-valuetext', `${next} percent`)
}

function readWeight() {
  return clampVoteWeight(els.weight.value)
}

function openModal(modal, focusEl) {
  lastFocus = document.activeElement
  modal.hidden = false
  if (focusEl) focusEl.focus()
}

function closeModal(modal) {
  if (modal.hidden) return
  modal.hidden = true
  if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus()
}

function openVotePopup() {
  applyWeight(readWeight(), false)
  openModal(els.votePopup, els.votePopupSlider)
}

async function castVote(post, percent) {
  const account = requireAccount('upvote')
  if (!account || !post || state.actionPending) return
  state.actionPending = 'vote'
  syncActions()
  try {
    const response = await callKeychain('requestVote', [
      account,
      post.permlink,
      post.author,
      Math.round(percent * 100),
    ])
    const result = describeKeychainResult(response)
    if (!result.ok) {
      toast(result.message, result.cancelled ? 'info' : 'error')
      return
    }
    if (state.post === post) state.voted = true
    toast(`Upvoted @${post.author} at ${percent}%.`, 'ok')
  } catch (error) {
    toast(error.message || 'Upvote failed.', 'error')
  } finally {
    state.actionPending = null
    syncActions()
  }
}

async function toggleFollow(post) {
  const account = requireAccount('follow')
  if (!account || !post || state.actionPending) return
  if (account === post.author) {
    toast('That post is already yours.', 'info')
    return
  }
  const follow = !state.follows
  state.actionPending = 'follow'
  syncActions()
  try {
    const json = JSON.stringify(['follow', {
      follower: account,
      following: post.author,
      what: follow ? ['blog'] : [],
    }])
    const response = await callKeychain('requestCustomJson', [
      account,
      'follow',
      'Posting',
      json,
      follow ? `Follow @${post.author}` : `Unfollow @${post.author}`,
    ])
    const result = describeKeychainResult(response)
    if (!result.ok) {
      toast(result.message, result.cancelled ? 'info' : 'error')
      return
    }
    if (state.post === post) state.follows = follow
    syncFollowButton()
    toast(follow ? `Following @${post.author}.` : `Unfollowed @${post.author}.`, 'ok')
  } catch (error) {
    toast(error.message || 'Follow failed.', 'error')
  } finally {
    state.actionPending = null
    syncActions()
  }
}

async function reblog(post) {
  const account = requireAccount('reblog')
  if (!account || !post || state.actionPending) return
  if (account === post.author) {
    toast('You cannot reblog your own post.', 'info')
    return
  }
  state.actionPending = 'reblog'
  syncActions()
  try {
    const json = JSON.stringify(['reblog', {
      account,
      author: post.author,
      permlink: post.permlink,
    }])
    const response = await callKeychain('requestCustomJson', [
      account,
      'reblog',
      'Posting',
      json,
      `Reblog @${post.author}/${post.permlink}`,
    ])
    const result = describeKeychainResult(response)
    if (!result.ok) {
      toast(result.message, result.cancelled ? 'info' : 'error')
      return
    }
    sessionReblogs.add(postSlug(post))
    if (state.post === post) state.reblogged = true
    toast(`Reblogged @${post.author}.`, 'ok')
  } catch (error) {
    toast(error.message || 'Reblog failed.', 'error')
  } finally {
    state.actionPending = null
    syncActions()
  }
}

function onUpvote() {
  if (!state.post) return
  if (!requireAccount('upvote')) return
  if (window.matchMedia('(max-width: 640px)').matches) {
    openVotePopup()
    return
  }
  void castVote(state.post, readWeight())
}

async function loadHivePower(name) {
  try {
    const accounts = await hiveCall('condenser_api.get_accounts', [[name]])
    if (getAccount() !== name) return
    const props = await hiveCall('condenser_api.get_dynamic_global_properties', [])
    if (getAccount() !== name) return
    const account = Array.isArray(accounts) ? accounts[0] : null
    if (!account) {
      els.accountHp.textContent = 'Signed in'
      return
    }
    const hp = hivePowerFromVests(effectiveVests(account), props)
    els.accountHp.textContent = formatHivePower(hp) || 'Signed in'
  } catch {
    if (getAccount() === name) els.accountHp.textContent = 'Signed in'
  }
}

function applySession(name) {
  const signed = Boolean(name)
  els.signin.hidden = signed
  els.chip.hidden = !signed
  if (signed) {
    els.accountName.textContent = `@${name}`
    els.avatar.textContent = name.slice(0, 1).toUpperCase()
    els.accountHp.textContent = 'Checking HP…'
    els.signout.setAttribute('aria-label', `Sign out @${name}`)
    void loadHivePower(name)
  }
  syncActions()
}

async function signIn(rawName) {
  const name = normalizeHiveAccount(rawName)
  els.username.value = name
  if (!isValidHiveAccount(name)) {
    els.username.setAttribute('aria-invalid', 'true')
    toast('Enter a Hive username, like alice.', 'error')
    els.username.focus()
    return
  }
  els.username.removeAttribute('aria-invalid')
  if (state.actionPending) return
  state.actionPending = 'signin'
  els.signinButton.disabled = true
  els.signinButton.textContent = 'Wait…'
  syncActions()
  try {
    const accounts = await hiveCall('condenser_api.get_accounts', [[name]])
    const account = Array.isArray(accounts) ? accounts[0] : null
    if (!account) {
      toast(`@${name} was not found on Hive.`, 'error')
      return
    }
    const response = await callKeychain('requestSignBuffer', [
      name,
      'drip sign in - no broadcast',
      'Posting',
    ])
    const result = describeKeychainResult(response)
    if (!result.ok) {
      toast(result.message, result.cancelled ? 'info' : 'error')
      return
    }
    try { localStorage.setItem(ACCOUNT_KEY, name) } catch { /* ignore */ }
    applySession(name)
    toast(`Signed in as @${name}.`, 'ok')
    if (state.post) {
      state.voted = userHasVoted(state.post, name)
      syncActions()
      void refreshRelationship(state.post, presentId)
    }
  } catch (error) {
    toast(error.message || 'Sign-in failed.', 'error')
  } finally {
    state.actionPending = null
    els.signinButton.disabled = false
    els.signinButton.textContent = 'Sign in'
    syncActions()
  }
}

function signOut() {
  const name = getAccount()
  try { localStorage.removeItem(ACCOUNT_KEY) } catch { /* ignore */ }
  applySession('')
  if (name) els.username.value = name
  state.follows = false
  state.voted = false
  syncFollowButton()
  toast('Signed out.', 'info')
  els.username.focus()
}

function saveFilters() {
  try {
    localStorage.setItem(FILTER_TAG_KEY, filters.tag)
    localStorage.setItem(FILTER_REP_KEY, String(filters.minRep))
  } catch { /* ignore */ }
}

function restoreFilters() {
  let tag = ''
  let rep = 25
  try {
    tag = normalizeTag(localStorage.getItem(FILTER_TAG_KEY) || '')
    rep = Number(localStorage.getItem(FILTER_REP_KEY) ?? 25)
  } catch { /* ignore */ }
  if (!isValidTag(tag)) tag = ''
  if (!REPUTATION_OPTIONS.includes(rep)) rep = 25
  filters.tag = tag
  filters.minRep = rep
  els.tag.value = tag
  els.rep.value = String(rep)
}

function applyFiltersFromForm() {
  const tag = normalizeTag(els.tag.value)
  if (!isValidTag(tag)) {
    toast('Tags use letters, numbers, and hyphens.', 'error')
    els.tag.focus()
    return
  }
  const minRep = Number(els.rep.value)
  const nextRep = REPUTATION_OPTIONS.includes(minRep) ? minRep : 25
  const changed = tag !== filters.tag || nextRep !== filters.minRep
  filters.tag = tag
  filters.minRep = nextRep
  els.tag.value = tag
  els.rep.value = String(nextRep)
  saveFilters()
  if (changed) restart()
  else updateIdleStatus()
}

function applyTag(tag) {
  els.tag.value = tag
  applyFiltersFromForm()
}

function clearFilters() {
  els.tag.value = ''
  els.rep.value = '25'
  applyFiltersFromForm()
}

function forgetSeen() {
  try {
    localStorage.removeItem(SEEN_SLUGS_KEY)
    localStorage.removeItem(SEEN_TITLES_KEY)
  } catch { /* ignore */ }
  toast('Seen posts cleared.', 'ok')
  restart()
}

function shortcutAllowed(event) {
  if (event.metaKey || event.ctrlKey || event.altKey) return false
  const target = event.target
  if (target && target.closest && target.closest('input, textarea, select, [contenteditable="true"]')) return false
  return true
}

function bind() {
  els.signin.addEventListener('submit', (event) => {
    event.preventDefault()
    void signIn(els.username.value)
  })
  els.username.addEventListener('input', () => {
    const next = normalizeHiveAccount(els.username.value)
    if (els.username.value !== next) {
      const pos = els.username.selectionStart
      els.username.value = next
      if (pos != null) els.username.setSelectionRange(pos, pos)
    }
  })
  els.signout.addEventListener('click', signOut)
  els.filters.addEventListener('submit', (event) => {
    event.preventDefault()
    applyFiltersFromForm()
  })
  els.clearFilters.addEventListener('click', clearFilters)
  els.resetSeen.addEventListener('click', forgetSeen)
  els.upvote.addEventListener('click', onUpvote)
  els.follow.addEventListener('click', () => { void toggleFollow(state.post) })
  els.reblog.addEventListener('click', () => { void reblog(state.post) })
  els.nextUp.addEventListener('click', () => { void advance({ feedback: 'like' }) })
  els.nextDown.addEventListener('click', () => { void advance({ feedback: 'skip' }) })

  const onWeightInput = (event) => applyWeight(event.target.value, false)
  const onWeightChange = (event) => applyWeight(event.target.value, true)
  els.weight.addEventListener('input', onWeightInput)
  els.weight.addEventListener('change', onWeightChange)
  els.votePopupSlider.addEventListener('input', onWeightInput)
  els.votePopupSlider.addEventListener('change', onWeightChange)
  els.votePopupClose.addEventListener('click', () => closeModal(els.votePopup))
  els.votePopup.addEventListener('click', (event) => {
    if (event.target === els.votePopup) closeModal(els.votePopup)
  })
  els.votePopupConfirm.addEventListener('click', () => {
    applyWeight(els.votePopupSlider.value, true)
    closeModal(els.votePopup)
    if (state.post) void castVote(state.post, readWeight())
  })

  els.helpOpen.addEventListener('click', () => openModal(els.help, els.helpClose))
  els.helpClose.addEventListener('click', () => closeModal(els.help))
  els.help.addEventListener('click', (event) => {
    if (event.target === els.help) closeModal(els.help)
  })

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (!els.votePopup.hidden) { closeModal(els.votePopup); return }
      if (!els.help.hidden) { closeModal(els.help); return }
    }
    if (!shortcutAllowed(event)) return
    if (!els.help.hidden || !els.votePopup.hidden) return
    const key = event.key.toLowerCase()
    if (key === 'l') { event.preventDefault(); void advance({ feedback: 'like' }) }
    else if (key === 'n') { event.preventDefault(); void advance({ feedback: 'skip' }) }
    else if (key === 'v') { event.preventDefault(); onUpvote() }
    else if (key === 'f') { event.preventDefault(); void toggleFollow(state.post) }
    else if (key === 'r') { event.preventDefault(); void reblog(state.post) }
    else if (event.key === '?') { event.preventDefault(); openModal(els.help, els.helpClose) }
  })

  window.addEventListener('hashchange', () => {
    const slug = parseHash()
    if (!slug) return
    if (state.post && state.post.author === slug.author && state.post.permlink === slug.permlink) return
    state.generation += 1
    state.queue = []
    state.reserved.clear()
    state.reservedTitles.clear()
    void openSlug(slug.author, slug.permlink)
  })
}

async function updateKeychainHint() {
  const keychain = await waitForKeychain(1800)
  els.keychainHint.hidden = Boolean(keychain)
}

function boot() {
  if (typeof hiveTx !== 'undefined') hiveTx.config.node = API_NODES[0]
  restoreFilters()
  restoreCursor()
  let storedWeight = 100
  try { storedWeight = localStorage.getItem(WEIGHT_KEY) ?? 100 } catch { /* ignore */ }
  applyWeight(storedWeight, false)
  applySession(getAccount())
  bind()
  const slug = parseHash()
  if (slug) void openSlug(slug.author, slug.permlink)
  else {
    showSkeleton()
    void advance()
  }
  void updateKeychainHint()
}

boot()
