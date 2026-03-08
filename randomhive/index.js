// index.js
import { renderPostBody } from 'https://esm.sh/@ecency/render-helper@2.4.21'
import DOMPurify from 'https://esm.sh/dompurify@3.2.3'

// ── Vote popup (mobile) ──
let showVoteSlider = false
let pendingVotePost = null

function openVotePopup(post) {
  pendingVotePost = post
  document.getElementById('vote-popup-slider').value = 100
  document.getElementById('vote-popup-label').textContent = '100%'
  const popup = document.getElementById('vote-popup')
  popup.classList.add('open')
  popup.setAttribute('aria-hidden', 'false')
}

function closeVotePopup() {
  const popup = document.getElementById('vote-popup')
  popup.classList.remove('open')
  popup.setAttribute('aria-hidden', 'true')
  pendingVotePost = null
}

const SNAP_POINTS = [25, 50, 75, 100]
const SNAP_THRESHOLD = 8

document.getElementById('vote-popup-slider').addEventListener('input', function() {
  document.getElementById('vote-popup-label').textContent = this.value + '%'
})

document.getElementById('vote-popup-slider').addEventListener('change', function() {
  const v = parseInt(this.value)
  const nearest = SNAP_POINTS.reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a)
  if (Math.abs(nearest - v) <= SNAP_THRESHOLD) {
    this.value = nearest
    document.getElementById('vote-popup-label').textContent = nearest + '%'
  }
})

document.getElementById('vote-popup-close').addEventListener('click', closeVotePopup)

document.getElementById('vote-popup').addEventListener('click', function(e) {
  if (e.target === this) closeVotePopup()
})

document.getElementById('vote-popup-confirm').addEventListener('click', () => {
  if (!pendingVotePost) return
  const accountName = window.localStorage.getItem('hiveaccount')
  if (!accountName) return
  const weight = Math.round(parseInt(document.getElementById('vote-popup-slider').value) * 100)
  hive_keychain.requestVote(accountName, pendingVotePost.permlink, pendingVotePost.author, weight, function(response) {
    console.log(response)
  })
  closeVotePopup()
})

function castVote(post) {
  const accountName = window.localStorage.getItem('hiveaccount')
  if (!accountName) { console.log('Sign in first.'); return }
  if (window.innerWidth <= 480 && showVoteSlider) {
    openVotePopup(post)
    return
  }
  const sliderEl = document.querySelector('#vote-weight-slider')
  const weight = sliderEl ? Math.round(parseInt(sliderEl.value) * 100) : 10000
  hive_keychain.requestVote(accountName, post.permlink, post.author, weight, function(response) {
    console.log(response)
  })
}

const API_NODES = [
  'https://api.syncad.com',
  'https://api.deathwing.me',
  'https://api.hive.blog',
]

let currentNodeIndex = 0

function setNode(index) {
  hiveTx.config.node = API_NODES[index]
}

function tryNextNode() {
  currentNodeIndex = (currentNodeIndex + 1) % API_NODES.length
  console.log(`Switching to node: ${API_NODES[currentNodeIndex]}`)
  setNode(currentNodeIndex)
}

setNode(0)

const MIN_BODY_LENGTH      = 250
const NSFW_CATEGORIES      = ['porn','dporn','xxx','nsfw']

const DISLIKED_AUTHORS_KEY = 'rh-disliked-authors'
const SEEN_SLUGS_KEY       = 'rh-seen-slugs'
const LIKED_AUTHORS_KEY    = 'rh-liked-authors'
const LIKED_TAGS_KEY       = 'rh-liked-tags'
const DISLIKED_TAGS_KEY    = 'rh-disliked-tags'
const SEEN_SLUGS_MAX       = 100

// Seen slugs (FIFO queue)
function getSeenSlugs() {
  try { return JSON.parse(localStorage.getItem(SEEN_SLUGS_KEY) || '[]') }
  catch { return [] }
}
function addSeenSlug(slug) {
  const q = getSeenSlugs()
  if (!q.includes(slug)) q.push(slug)
  if (q.length > SEEN_SLUGS_MAX) q.shift()
  localStorage.setItem(SEEN_SLUGS_KEY, JSON.stringify(q))
}

// Disliked authors (hard exclude)
function getDislikedAuthors() {
  try { return new Set(JSON.parse(localStorage.getItem(DISLIKED_AUTHORS_KEY) || '[]')) }
  catch { return new Set() }
}
function addDislikedAuthor(author) {
  const s = getDislikedAuthors()
  s.add(author)
  localStorage.setItem(DISLIKED_AUTHORS_KEY, JSON.stringify([...s]))
}

// Generic count-map helpers
function getCountMap(key) {
  try { return JSON.parse(localStorage.getItem(key) || '{}') }
  catch { return {} }
}
function incrementCountMap(key, items) {
  const map  = getCountMap(key)
  const list = Array.isArray(items) ? items : [items]
  list.forEach(item => { map[item] = (map[item] || 0) + 1 })
  localStorage.setItem(key, JSON.stringify(map))
}

const DECAY_FACTOR = 0.99
const DECAY_KEYS   = [LIKED_AUTHORS_KEY, LIKED_TAGS_KEY, DISLIKED_TAGS_KEY]

function decayCountMaps() {
  DECAY_KEYS.forEach(key => {
    const map = getCountMap(key)
    Object.keys(map).forEach(k => { map[k] *= DECAY_FACTOR })
    localStorage.setItem(key, JSON.stringify(map))
  })
}

// Convenience wrappers called on button click
const recordLike = (author, tags) => {
  decayCountMaps()
  incrementCountMap(LIKED_AUTHORS_KEY, author)
  if (tags && tags.length) incrementCountMap(LIKED_TAGS_KEY, tags)
}
const recordDislike = (author, tags) => {
  decayCountMaps()
  if (tags && tags.length) incrementCountMap(DISLIKED_TAGS_KEY, tags)
}

// Tag extraction helper
function getPostTags(post) {
  try {
    const meta = JSON.parse(post.json_metadata || '{}')
    return Array.isArray(meta.tags) ? meta.tags : []
  } catch { return [] }
}

// Scoring + weighted random selection
function scorePost(post, likedAuthors, likedTags, dislikedTags) {
  const tags = getPostTags(post)
  let score  = 1
  score += (likedAuthors[post.author] || 0) * 2
  tags.forEach(tag => {
    score += (likedTags[tag]    || 0) * 1
    score -= (dislikedTags[tag] || 0) * 0.5
  })
  return Math.max(0.1, score)
}

function weightedRandom(posts) {
  const likedAuthors = getCountMap(LIKED_AUTHORS_KEY)
  const likedTags    = getCountMap(LIKED_TAGS_KEY)
  const dislikedTags = getCountMap(DISLIKED_TAGS_KEY)
  const scores       = posts.map(p => scorePost(p, likedAuthors, likedTags, dislikedTags))
  const total        = scores.reduce((a, b) => a + b, 0)
  let rand           = Math.random() * total
  for (let i = 0; i < posts.length; i++) {
    rand -= scores[i]
    if (rand <= 0) return posts[i]
  }
  return posts[posts.length - 1]
}

const MAX_PAGINATION_DEPTH = 50

async function getPost(startAuthor, startPermlink, depth = 0) {
  if (depth >= MAX_PAGINATION_DEPTH) {
    console.warn('Reached pagination depth limit — clearing seen slugs and restarting.')
    localStorage.removeItem(SEEN_SLUGS_KEY)
    return getPost()
  }

  const query = {tag: '', limit: 20}
  if (startAuthor)   query.start_author   = startAuthor
  if (startPermlink) query.start_permlink = startPermlink

  let res
  try {
    res = await hiveTx.call('condenser_api.get_discussions_by_created', [query])
  } catch (err) {
    console.warn(`Node ${API_NODES[currentNodeIndex]} failed:`, err)
    tryNextNode()
    return getPost(startAuthor, startPermlink, depth + 1)
  }

  let posts = res.result
  if (!posts) {
    console.warn(`No results from ${API_NODES[currentNodeIndex]}, trying next node`)
    tryNextNode()
    return getPost(startAuthor, startPermlink, depth + 1)
  }

  // When paginating the API returns the start post as first result — skip it
  if (startAuthor && posts.length > 0 && posts[0].author === startAuthor) {
    posts = posts.slice(1)
  }

  posts = posts.filter(item => item.body_length >= MIN_BODY_LENGTH)
  posts = posts.filter(item => !NSFW_CATEGORIES.includes(item.category))
  const seenSlugs       = getSeenSlugs()
  const dislikedAuthors = getDislikedAuthors()
  posts = posts.filter(item => !seenSlugs.includes(`${item.author}/${item.permlink}`))
  posts = posts.filter(item => !dislikedAuthors.has(item.author))

  // If all authors already seen, paginate to next batch
  if (posts.length === 0) {
    const all = res.result
    if (all && all.length > 0) {
      const last = all[all.length - 1]
      return getPost(last.author, last.permlink, depth + 1)
    } else {
      console.warn('No more posts to paginate.')
    }
    return
  }

  const post = weightedRandom(posts)
  addSeenSlug(`${post.author}/${post.permlink}`)

  // update button actions
  document.querySelector('#next-up').onclick = () => {
    recordLike(post.author, getPostTags(post))
    getPost()
  }
  document.querySelector('#next-down').onclick = () => {
    addDislikedAuthor(post.author)
    recordDislike(post.author, getPostTags(post))
    getPost()
  }

  // Upvote button handler
  document.querySelector('button#upvote').onclick = () => castVote(post)

  // Follow button handler
  document.querySelector('button#follow').onclick = () => {
    var accountName = window.localStorage.getItem('hiveaccount')
    if (!accountName) { console.log('Sign in first.'); return }
    const json = JSON.stringify(['follow', {
      follower: accountName, following: post.author, what: ['blog'],
    }])
    hive_keychain.requestCustomJson(accountName, 'follow', 'Posting', json,
      `Following ${post.author}`, function(response) { console.log(response) })
  }

  // Reblog button handler
  document.querySelector('button#reblog').onclick = () => {
    var accountName = window.localStorage.getItem('hiveaccount')
    if (!accountName) { console.log('Sign in first.'); return }
    const json = JSON.stringify(['reblog', {
      account: accountName, author: post.author, permlink: post.permlink,
    }])
    hive_keychain.requestCustomJson(accountName, 'reblog', 'Posting', json,
      `Reblogging @${post.author}/${post.permlink}`, function(response) { console.log(response) })
  }

  renderPost(post)
}

function renderPost(post) {
  // update button actions
  document.querySelector('a#peakd').href = `https://peakd.com/@${post.author}/${post.permlink}`
  document.querySelector('a#hiveblog').href = `https://hive.blog/@${post.author}/${post.permlink}`

  // prepare blog post content for display
  const dateStr = post.created
    ? new Date(post.created + 'Z').toLocaleString(undefined, {year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})
    : ''

  let tags = []
  try {
    const meta = JSON.parse(post.json_metadata || '{}')
    if (Array.isArray(meta.tags)) tags = meta.tags.slice(0, 8)
  } catch (e) {}

  const container = document.querySelector('div#hr-content')
  container.innerHTML = ''

  const h1 = document.createElement('h1')
  h1.textContent = post.title

  const h2 = document.createElement('h2')
  h2.className = 'post-author'
  h2.appendChild(document.createTextNode(`@${post.author}`))
  if (dateStr) {
    const dateSpan = document.createElement('span')
    dateSpan.className = 'post-date'
    dateSpan.textContent = dateStr
    h2.appendChild(dateSpan)
  }

  container.appendChild(h1)
  container.appendChild(h2)

  if (tags.length) {
    const tagsDiv = document.createElement('div')
    tagsDiv.className = 'post-tags'
    tags.forEach(t => {
      const span = document.createElement('span')
      span.className = 'post-tag'
      span.textContent = t
      tagsDiv.appendChild(span)
    })
    container.appendChild(tagsDiv)
  }

  const bodyDiv = document.createElement('div')
  bodyDiv.innerHTML = DOMPurify.sanitize(renderPostBody(post, false), {
    FORCE_BODY: true,
    FORBID_TAGS: ['meta', 'base', 'dialog', 'marquee', 'form', 'object', 'embed', 'noscript', 'template'],
    FORBID_ATTR: ['style'],
  })
  container.appendChild(bodyDiv)

  Array.from(container.querySelectorAll('img')).forEach(img => {
    img.className = 'w-100'
    img.loading = 'lazy'
  })
}

async function loadPostBySlug(author, permlink) {
  let res
  try {
    res = await hiveTx.call('condenser_api.get_content', [author, permlink])
  } catch (err) {
    console.warn('Failed to load post by slug:', err)
    tryNextNode()
    return loadPostBySlug(author, permlink)
  }
  const post = res.result
  if (!post || !post.author) {
    console.warn('Post not found:', author, permlink)
    return
  }

  // update button actions for slug-loaded post
  document.querySelector('#next-up').onclick = () => {
    recordLike(post.author, getPostTags(post))
    getPost()
  }
  document.querySelector('#next-down').onclick = () => {
    addDislikedAuthor(post.author)
    recordDislike(post.author, getPostTags(post))
    getPost()
  }
  document.querySelector('button#upvote').onclick = () => castVote(post)
  document.querySelector('button#follow').onclick = () => {
    var accountName = window.localStorage.getItem('hiveaccount')
    if (!accountName) { console.log('Sign in first.'); return }
    const json = JSON.stringify(['follow', {
      follower: accountName, following: post.author, what: ['blog'],
    }])
    hive_keychain.requestCustomJson(accountName, 'follow', 'Posting', json,
      `Following ${post.author}`, function(response) { console.log(response) })
  }
  document.querySelector('button#reblog').onclick = () => {
    var accountName = window.localStorage.getItem('hiveaccount')
    if (!accountName) { console.log('Sign in first.'); return }
    const json = JSON.stringify(['reblog', {
      account: accountName, author: post.author, permlink: post.permlink,
    }])
    hive_keychain.requestCustomJson(accountName, 'reblog', 'Posting', json,
      `Reblogging @${post.author}/${post.permlink}`, function(response) { console.log(response) })
  }

  renderPost(post)
}

// handle loading events — check for slug in hash first (e.g. #@author/permlink)
const hashMatch = location.hash.match(/^#@([^/]+)\/(.+)$/)
if (hashMatch) {
  loadPostBySlug(hashMatch[1], hashMatch[2])
} else {
  getPost()
}
document.querySelector('#next-up').onclick = getPost
document.querySelector('#next-down').onclick = getPost


async function fetchAccountHP(accountName) {
  const [accountsRes, propsRes] = await Promise.all([
    hiveTx.call('condenser_api.get_accounts', [[accountName]]),
    hiveTx.call('condenser_api.get_dynamic_global_properties', [])
  ])
  const account = accountsRes.result[0]
  const vestingShares = parseFloat(account.vesting_shares)
  const totalVestingFundHive = parseFloat(propsRes.result.total_vesting_fund_hive)
  const totalVestingShares = parseFloat(propsRes.result.total_vesting_shares)
  return vestingShares * (totalVestingFundHive / totalVestingShares)
}

// handle sign in events
function toggleSigninUIState(signedIn) {
  if (signedIn) {
    document.querySelector('div#signin-container').style.display = 'none'
    document.querySelector('div#signout-container').style.display = 'block'
    document.querySelector('#upvote').disabled = false
    document.querySelector('#follow').disabled = false
    document.querySelector('#reblog').disabled = false

    const accountName = window.localStorage.getItem('hiveaccount')
    if (accountName) {
      fetchAccountHP(accountName).then(hp => {
        if (hp >= 500) {
          showVoteSlider = true
          document.querySelector('#vote-weight-container').style.display = 'flex'
        }
      }).catch(err => console.warn('Could not fetch HP:', err))
    }
  } else {
    document.querySelector('div#signin-container').style.display = 'block'
    document.querySelector('div#signout-container').style.display = 'none'
    document.querySelector('#upvote').disabled = true
    document.querySelector('#follow').disabled = true
    document.querySelector('#reblog').disabled = true
    showVoteSlider = false
    document.querySelector('#vote-weight-container').style.display = 'none'
    document.querySelector('#vote-weight-slider').value = 100
    document.querySelector('#vote-weight-label').textContent = '100%'
  }
}

document.querySelector('#vote-weight-slider').addEventListener('input', function() {
  document.querySelector('#vote-weight-label').textContent = this.value + '%'
})

if (window.localStorage.getItem('hiveaccount')) {
  // already signed in 
  toggleSigninUIState(true) 
} else {
  toggleSigninUIState(false)
}

document.querySelector('form#signin').onsubmit = (event) => {
  const accountName = event.target[0].value

  hive_keychain.requestHandshake(function() {
    console.log("Handshake received!");
  })

  hive_keychain.requestSignBuffer(
    accountName,
    'randomhive test signing',
    'Posting',
    (response) => {
      console.log(response)

      if (response.success) {
        window.localStorage.setItem('hiveaccount', accountName)
        toggleSigninUIState(true)
      } else {
        console.log('Sign in error. Please check hive keychain.')
      }
    }
  )

  return false
}

// handle sign out events
document.querySelector('#signout').onclick = (event) => {
  if (window.localStorage.getItem('hiveaccount')) {
    window.localStorage.removeItem('hiveaccount')
  }

  toggleSigninUIState(false)
}