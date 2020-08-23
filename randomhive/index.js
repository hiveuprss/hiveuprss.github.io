// index.js

hiveTx.config.node = 'https://anyx.io'

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
      console.log(post)

      document.querySelector('button.next').onclick = () => {
        const permlink = post.permlink
        getPost(permlink)
      }
      document.querySelector('a#peakd').href = `https://peakd.com/@${post.author}/${post.permlink}`
      document.querySelector('a#hiveblog').href = `https://hive.blog/@${post.author}/${post.permlink}`
      

      var converter = new showdown.Converter()
      converter.setFlavor('github')
      converter.setOption('openLinksInNewWindow', true)
      converter.setOption('simplifiedAutoLink', true)
      var text          = `# ${post.title}\n${post.body}`
      text.replace('# ![','![')

      // if images missing markup
      text.replace(/^[^(]+(http.*\.(png|jpg|jpeg|gif|svg))[^)]+$/g, '![$1]($1)')

      var html = converter.makeHtml(text)
      html += '<br><br>'

      document.querySelector('div#hr-content').innerHTML = html
      //document.querySelector('div#hr-content-md').innerHTML = text
      Array.from(document.querySelectorAll('div#hr-content img')).forEach(img => {
        img.className = 'w-100'
        img.loading = 'lazy'
      })
  })  
}

document.onload = getPost()
document.querySelector('button.next').onclick = getPost


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
      console.log('js response requestSignBuffer')
      console.log(response)

      if (response.success) {
        document.querySelector('div#signin-container').style.display = 'none'
        document.querySelector('div#signout-container').style.display = 'block'
      }
    }
  )

  return false
}

document.querySelector('button#upvote').onclick = () => {
  hive_keychain.requestVote(
    $("#vote_username").val(),
    $("#vote_perm").val(),
    $("#vote_author").val(),
    $("#vote_weight").val(),
    function(response) {
      console.log("main js response - vote");
      console.log(response);
    }
  )
}