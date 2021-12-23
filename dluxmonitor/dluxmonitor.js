//dluxmonitor.js

DLUX_API = 'https://dlux-token.herokuapp.com/'

coin_promise = axios({
  method: 'get',
  url: DLUX_API + 'coin'
})

runners_promise = axios({
  method: 'get',
  url: DLUX_API + 'runners'
})

queue_promise = axios({
  method: 'get',
  url: DLUX_API + 'queue'
})

stats_promise = axios({
  method: 'get',
  url: DLUX_API
})


Promise.all([coin_promise, runners_promise, queue_promise, stats_promise])
.then((values) => {
    console.log(values[0].data)
    console.log(values[1].data)
    console.log(values[2].data)
    console.log(values[3].data)

    let runners = values[1].data.runners
    let queue = values[2].data.queue

    // populate check string
    document.querySelector('span#check').innerHTML = values[0].data.check

    // populate gov_threshhold string
    let gov_threshhold = parseInt(values[3].data.result.gov_threshhold) / 1000
    gov_threshhold = `${gov_threshhold} DLUX`
    document.querySelector('span#gov_threshhold').innerHTML = gov_threshhold 

    // populate runners table
    table_markup = '<thead><th>Name</th><th>Runner?</th><th>DLUXG</th><th>API</th></thead>'
    for (account in queue) {
        let dluxg = parseInt(queue[account].g)/1000
        let api = queue[account].api

        let runner
        if (runners.hasOwnProperty(account)) {
            runner = 'Yes'
        } else {
            runner = 'No'
        }
        table_markup += `<tr><td>@${account}</td><td>${runner}</td><td>${dluxg}</td><td>${api}</td></tr>`
    }
    document.querySelector('table#dlux_nodes_table').innerHTML = table_markup
});