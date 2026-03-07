// index.js
import { renderPostBody } from 'https://esm.sh/@ecency/render-helper'
import DOMPurify from 'https://esm.sh/dompurify'

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

const MIN_BODY_LENGTH   = 250
const SEEN_AUTHORS_KEY  = 'rh-seen-authors'
const NSFW_CATEGORIES   = ['porn','dporn','xxx','nsfw']

function getSeenAuthors() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_AUTHORS_KEY) || '[]'))
  } catch (e) {
    return new Set()
  }
}

function addSeenAuthor(author) {
  const seen = getSeenAuthors()
  seen.add(author)
  localStorage.setItem(SEEN_AUTHORS_KEY, JSON.stringify([...seen]))
}

function getPost(startAuthor, startPermlink) {
  const query = {tag: '', limit: 20}
  if (startAuthor)  query.start_author  = startAuthor
  if (startPermlink) query.start_permlink = startPermlink

  hiveTx
    .call('condenser_api.get_discussions_by_created', [query])
    .catch(err => {
      console.warn(`Node ${API_NODES[currentNodeIndex]} failed:`, err)
      tryNextNode()
      return getPost(startAuthor, startPermlink)
    })
    .then(res => {
      var posts = res.result
      if (!posts) {
        console.warn(`No results from ${API_NODES[currentNodeIndex]}, trying next node`)
        tryNextNode()
        getPost(startAuthor, startPermlink)
        return
      }

      // When paginating the API returns the start post as first result — skip it
      if (startAuthor && posts.length > 0 && posts[0].author === startAuthor) {
        posts = posts.slice(1)
      }

      posts = posts.filter(item => item.body_length >= MIN_BODY_LENGTH)
      posts = posts.filter(item => !NSFW_CATEGORIES.includes(item.category))
      posts = posts.filter(item => !getSeenAuthors().has(item.author))

      // If all authors already seen, paginate to next batch
      if (posts.length === 0) {
        // Use last post of the original result as the pagination cursor
        const all = res.result
        if (all && all.length > 0) {
          const last = all[all.length - 1]
          console.log(`All authors seen in this batch, paginating from @${last.author}/${last.permlink}`)
          getPost(last.author, last.permlink)
        } else {
          console.warn('No more posts to paginate.')
        }
        return
      }

      const post = posts[Math.floor(Math.random() * posts.length)]
      addSeenAuthor(post.author)
      
      // update button actions
      document.querySelector('button.next').onclick = () => {
        getPost()
      }
      document.querySelector('a#peakd').href = `https://peakd.com/@${post.author}/${post.permlink}`
      document.querySelector('a#hiveblog').href = `https://hive.blog/@${post.author}/${post.permlink}`

      // Upvote button handler
      document.querySelector('button#upvote').onclick = () => {
        var accountName = window.localStorage.getItem('hiveaccount')
        if (!accountName) {
          console.log('Sign in first.')
          return
        }

        const permlink = post.permlink
        const author = post.author
        const sliderEl = document.querySelector('#vote-weight-slider')
        const weight = sliderEl ? Math.round(parseInt(sliderEl.value) * 100) : 10000

        hive_keychain.requestVote(
          accountName,
          permlink,
          author,
          weight,
          function(response) {
            console.log(response);
          }
        )
      }

      // Follow button handler
      document.querySelector('button#follow').onclick = () => {
        var accountName = window.localStorage.getItem('hiveaccount')
        if (!accountName) {
          console.log('Sign in first.')
          return
        }

        const permlink = post.permlink
        const author = post.author
        const type = 'blog'

        let json = JSON.stringify([
          'follow',
          {
              follower: accountName,
              following: author,
              what: [type], //null value for unfollow, 'blog' for follow
          }])
        console.log(json)

        hive_keychain.requestCustomJson(
          accountName,
          'follow',
          'Posting',
          json,
          `Following ${author}`,
          function(response) {
            console.log(response);
          }
        )
      }

      // Reblog button handler
      document.querySelector('button#reblog').onclick = () => {
        var accountName = window.localStorage.getItem('hiveaccount')
        if (!accountName) {
          console.log('Sign in first.')
          return
        }

        const permlink = post.permlink
        const author = post.author

        let json = JSON.stringify([
          'reblog',
          {
              account: accountName,
              author: author,
              permlink: permlink,
          }])
        console.log(json)

        hive_keychain.requestCustomJson(
          accountName,
          'reblog',
          'Posting',
          json,
          `Reblogging @${author}/${permlink}`,
          function(response) {
            console.log(response);
          }
        )
      }

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
      bodyDiv.innerHTML = DOMPurify.sanitize(renderPostBody(post, false))
      container.appendChild(bodyDiv)

      Array.from(container.querySelectorAll('img')).forEach(img => {
        img.className = 'w-100'
        img.loading = 'lazy'
      })
  })  
}


// handle loading events
document.onload = getPost()
document.querySelector('#next').onclick = getPost


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
        toggleSigninUIState(true)
        window.localStorage.setItem('hiveaccount', accountName)
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