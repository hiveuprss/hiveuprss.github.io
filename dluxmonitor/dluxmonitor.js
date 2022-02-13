//dluxmonitor.js

const DEFAULT_DLUX_API = 'https://token.dlux.io/'

var urlParams = new URLSearchParams(window.location.search);
let DLUX_API = urlParams.has('node') ? urlParams.get('node').toLowerCase() : DEFAULT_DLUX_API


if (!DLUX_API.startsWith('https')) {
  window.alert('Sorry, browsers dont allow mixed HTTP/S content. Falling back to default node.')
  DLUX_API = DEFAULT_DLUX_API
}


if (DLUX_API.slice(-1) !== '/') {
  DLUX_API += '/'
}

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

markets_promise = axios({
  method: 'get',
  url: DLUX_API + 'markets'
})


Promise.all([coin_promise, runners_promise, queue_promise, stats_promise, markets_promise])
.then((values) => {
    let [coin, runners, queue, stats, markets] = values
    console.log(coin.data)
    console.log(runners.data)
    console.log(queue.data)
    console.log(stats.data)
    console.log(markets.data)

    coin = coin.data
    let coin_info = coin.info
    runners = runners.data.runners
    queue = queue.data.queue
    stats = stats.data.result
    markets = markets.data.markets
    nodes = markets.node

    let stats_rows = {}
    stats_rows['Total Supply'] = (stats.tokenSupply / 1000).toLocaleString() + ' DLUX'
    stats_rows['Locked in NFTs'] = (coin_info.in_NFTS / 1000).toLocaleString() + ' DLUX'
    stats_rows['Locked in Auctions'] = (coin_info.in_auctions / 1000).toLocaleString() + ' DLUX'
    stats_rows['Locked in Contracts'] = (coin_info.in_contracts / 1000).toLocaleString() + ' DLUX'
    stats_rows['Locked in Dividends'] = (coin_info.in_dividends / 1000).toLocaleString() + ' DLUX'
    stats_rows['Locked in Market'] = (coin_info.in_market / 1000).toLocaleString() + ' DLUX'
    stats_rows['Locked in Governance'] = (coin_info.locked_gov / 1000).toLocaleString() + ' DLUX'
    stats_rows['Locked in PowerUps'] = (coin_info.locked_pow / 1000).toLocaleString() + ' DLUX'
    stats_rows['Liquid Supply'] = (coin_info.liquid_supply / 1000).toLocaleString() + ' DLUX'

    stats_rows['Governance Threshold'] = (parseInt(stats.gov_threshhold) / 1000).toLocaleString() + ' DLUX'
    stats_rows['Dex Fee'] = `${(parseFloat(stats.dex_fee) * 100).toLocaleString()}%`
    stats_rows['Blocks Behind'] = coin.behind + ' blocks'
    stats_rows['Consensus / Runners / Total Nodes'] = `${Object.keys(queue).length} / ${Object.keys(runners).length} / ${Object.keys(nodes).length}`

    // populate stats table

    let statsTable = ''
    for (attribute in stats_rows) {
      statsTable += `<tr><td>${attribute}</td><td>${stats_rows[attribute]}</td></tr>`
    }
    document.querySelector('table#stats').innerHTML += statsTable

    // populate nodes table

    table_markup = '<thead><th>Name</th><th>Consensus?</th><th>Runner?</th><th>DLUXG</th><th>Bid Rate</th><th>Last Good</th><th>Version</th><th>API</th></thead>'
    table_markup += `<tr><td colspan="8"><center><b>Nodes in Consensus</b></center></td></tr>`

    for (account in queue) {
        let dluxg = 0
        if (account in queue) {
          dluxg = parseInt(queue[account].g)/1000
        }
        let api = nodes[account].domain

        let runner
        if (account in runners) {
            runner = 'Yes'
        } else {
            runner = 'No'
        }

        let consensus
        if (account in queue) {
            consensus = 'Yes'
        } else {
            consensus = 'No'
        }

        let bidrate = nodes[account].bidRate
        let lastgood = nodes[account].lastGood
        let version = nodes[account].report.version

        table_markup += `<tr><td>@${account}</td><td>${consensus}</td><td>${runner}</td><td>${dluxg}</td><td>${bidrate/1000}%</td><td>${lastgood}</td><td>${version}</td><td><a href="./?node=${api}">${api}</a></td></tr>`
    }
    table_markup += `<tr><td colspan="8"><center><b>Nodes out of Consensus</b></center></td></tr>`

    for (account in nodes) {
        if (account in queue) {
          continue
        }

        let dluxg = '?'
        if (account in queue) {
          dluxg = parseInt(queue[account].g)/1000
        }
        let api = nodes[account].domain

        let runner
        if (account in runners) {
            runner = 'Yes'
        } else {
            runner = 'No'
        }

        let consensus
        if (account in queue) {
            consensus = 'Yes'
        } else {
            consensus = 'No'
        }

        let bidrate = nodes[account].bidRate
        let lastgood = nodes[account].lastGood
        let version = '?'//nodes[account].report.version
        table_markup += `<tr><td>@${account}</td><td>${consensus}</td><td>${runner}</td><td>${dluxg}</td><td>${bidrate/1000}%</td><td>${lastgood}</td><td>${version}</td><td><a href="./?node=${api}">${api}</a></td></tr>`
    }
    document.querySelector('table#nodes_table').innerHTML = table_markup
});