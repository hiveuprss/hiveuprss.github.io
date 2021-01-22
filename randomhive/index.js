// index.js

hiveTx.config.node = 'https://api.hive.blog'

const MIN_BODY_LENGTH   = 250

function getPost(start_permlink='') {
  hiveTx
    .call('condenser_api.get_discussions_by_created', [{tag:"", limit: 100, start_permlink: start_permlink}])
    .then(res => {
      // skip posts < MIN_BODY_LENGTH chars in length
      var posts = res.result
      posts = posts.filter(item => item.body_length >= MIN_BODY_LENGTH)
      // nsfw category filters
      posts = posts.filter(item => !['porn','dporn','xxx','nsfw'].includes(item.category) )
      
      console.log(`${posts.length} posts`)

      const post = posts[Math.floor(Math.random() * posts.length)];
      
      // update button actions
      document.querySelector('button.next').onclick = () => {
        //const permlink = post.permlink
        //console.log(permlink)
        getPost(/*permlink*/)
      }
      document.querySelector('a#peakd').href = `https://peakd.com/@${post.author}/${post.permlink}`
      document.querySelector('a#hiveblog').href = `https://hive.blog/@${post.author}/${post.permlink}`
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

      // prepare blog post content for display
      var text = `# ${post.title}\n## @${post.author}\n${post.body}`
      text.replace('# ![','![')

      // fix images missing markup
      text.replace(/[^(]+(http.*\.(png|jpg|jpeg|gif|svg))[^)]+/g, '![$1]($1)')


      // convert markdown to HTML
      var converter = new showdown.Converter()
      converter.setOption('openLinksInNewWindow', true)
      converter.setOption('simplifiedAutoLink', true)
      
      var html = converter.makeHtml(text)
      html += '<br><br>'

      document.querySelector('div#hr-content').innerHTML = html
      //document.querySelector('div#hr-content-md').innerHTML = text
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
  } else {
    document.querySelector('div#signin-container').style.display = 'block'
    document.querySelector('div#signout-container').style.display = 'none'
    document.querySelector('#upvote').disabled = true
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
    'test',
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