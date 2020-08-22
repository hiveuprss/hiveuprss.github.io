// index.js

hiveTx.config.node = 'https://anyx.io'

MIN_BODY_LENGTH = 250


function getPost() {
  hiveTx
    .call('condenser_api.get_discussions_by_created', [{tag:"", limit: 100}])
    .then(res => {
      // skip posts < MIN_BODY_LENGTH chars in length
      var posts = res.result
      posts = posts.filter(item => item.body_length >= MIN_BODY_LENGTH)
      console.log(`${posts.length} posts`)

      const post = posts[Math.floor(Math.random() * posts.length)];
      console.log(post)

      var converter = new showdown.Converter()
      //converter.setFlavor('github')
      converter.setOption('openLinksInNewWindow', true)
      converter.setOption('simplifiedAutoLink', true)
      var text          = `# ${post.title}\n${post.body}`
      var html          = converter.makeHtml(text)
      html += '<br><br>'

      document.querySelector('div#hr-content').innerHTML = html
      Array.from(document.querySelectorAll('div#hr-content img')).forEach(img => {
        img.className = 'w-100'
        img.loading = 'lazy'
      })
  })  
}

document.onload = getPost()
document.querySelector('button.next').onclick = getPost

document.querySelector('button#upvote').onclick = () => {
    hive_keychain.requestHandshake(function() {
    console.log("Handshake received!");
})}