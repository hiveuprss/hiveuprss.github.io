// index.js

function sanitizeHtml(html) {
  // Remove script tags and their content
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  // Remove event handler attributes (on*)
  html = html.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '')
  // Remove javascript: protocol in href/src/action
  html = html.replace(/(href|src|action)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, '')
  return html
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

const MIN_BODY_LENGTH   = 250

function getPost() {
  hiveTx
    .call('condenser_api.get_discussions_by_created', [{tag:"", limit: 20}])
    .catch(err => {
      console.warn(`Node ${API_NODES[currentNodeIndex]} failed:`, err)
      tryNextNode()
      return getPost()
    })
    .then(res => {
      // skip posts < MIN_BODY_LENGTH chars in length
      var posts = res.result
      if (!posts) {
        console.warn(`No results from ${API_NODES[currentNodeIndex]}, trying next node`)
        tryNextNode()
        getPost()
        return
      }

      posts = posts.filter(item => item.body_length >= MIN_BODY_LENGTH)
      // nsfw category filters
      posts = posts.filter(item => !['porn','dporn','xxx','nsfw'].includes(item.category) )
      
      const post = posts[Math.floor(Math.random() * posts.length)];
      
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

      // remove leading divs, which cause an issue for Showdown rendered
      post.body = post.body.replaceAll(/<div class="(.*)">/g, "")
      post.body = post.body.replaceAll('</div>', "")

      // prepare blog post content for display
      var text1 = `# ${post.title}\n## @${post.author}\n`
      var text2 = `${post.body}`

      // Remove text formatting for image embeds
      text2 = text2.replace('# ![','![')

      // fix images missing markup
      text2 = text2.replace(/[^(]*(http.*\.(png|jpg|jpeg|gif|svg))[^)]+/g, '![$1]($1)')

      // convert markdown to HTML
      var converter = new showdown.Converter()
      converter.setOption('openLinksInNewWindow', true)
      converter.setOption('simplifiedAutoLink', true)

      document.querySelector('div#hr-content').innerHTML = sanitizeHtml(converter.makeHtml(text1))
      document.querySelector('div#hr-content').innerHTML += sanitizeHtml(converter.makeHtml(text2))

      Array.from(document.querySelectorAll('div#hr-content img')).forEach(img => {
        // scale images to fit
        img.className = 'w-100'
        // lazy load images to improve performance
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
  accountName = event.srcElement[0].value

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
        localStorage = window.localStorage
        localStorage.setItem('hiveaccount', accountName)
      } else {
        console.log('Sign in error. Please check hive keychain.')
      }
    }
  )

  return false
}

// handle sign out events
document.querySelector('#signout').onclick = (event) => {
  
  localStorage = window.localStorage
  if (localStorage.getItem('hiveaccount')) {
    localStorage.removeItem('hiveaccount')
  }

  toggleSigninUIState(false)
}