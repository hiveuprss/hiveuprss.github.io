// index.js

hiveTx.config.node = 'https://api.syncad.com'

const MIN_BODY_LENGTH   = 250

function getPost() {
  hiveTx
    .call('condenser_api.get_discussions_by_created', [{tag:"", limit: 20}])
    .then(res => {
      // skip posts < MIN_BODY_LENGTH chars in length
      var posts = res.result
      if (!posts) {
        console.log('API error')
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
        const weight = 10000

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

      document.querySelector('div#hr-content').innerHTML = converter.makeHtml(text1)
      document.querySelector('div#hr-content').innerHTML += converter.makeHtml(text2)

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


// handle sign in events
function toggleSigninUIState(signedIn) {
  if (signedIn) {
    document.querySelector('div#signin-container').style.display = 'none'
    document.querySelector('div#signout-container').style.display = 'block'
    document.querySelector('#upvote').disabled = false
    document.querySelector('#follow').disabled = false
    document.querySelector('#reblog').disabled = false
  } else {
    document.querySelector('div#signin-container').style.display = 'block'
    document.querySelector('div#signout-container').style.display = 'none'
    document.querySelector('#upvote').disabled = true
    document.querySelector('#follow').disabled = true
    document.querySelector('#reblog').disabled = true
  }
}

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