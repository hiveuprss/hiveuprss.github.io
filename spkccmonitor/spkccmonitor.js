//dluxmonitor.js

const DEFAULT_DLUX_API = 'https://spkinstant.hivehoneycomb.com/'

var urlParams = new URLSearchParams(window.location.search);
let DLUX_API = urlParams.has('node') ? urlParams.get('node').toLowerCase() : DEFAULT_DLUX_API


if (!DLUX_API.startsWith('https')) {
  window.alert('Sorry, browsers dont allow mixed HTTP/S content. Falling back to default node.')
  DLUX_API = DEFAULT_DLUX_API
}


if (DLUX_API.slice(-1) !== '/') {
  DLUX_API += '/'
}

totals_promise = axios({
  method: 'get',
  url: DLUX_API + '@t'
})

runners_promise = axios({
  method: 'get',
  url: DLUX_API + 'runners'
})

queue_promise = axios({
  method: 'get',
  url: DLUX_API + 'queue'
})

markets_promise = axios({
  method: 'get',
  url: DLUX_API + 'markets'
})


Promise.all([totals_promise, runners_promise, queue_promise, markets_promise])
.then((values) => {
    let [totals, runners, queue, markets] = values
    console.log(totals.data)
    console.log(runners.data)
    console.log(queue.data)
    console.log(markets.data)

    totals = totals.data
    runners = runners.data.runners
    queue = queue.data.queue
    stats = markets.data.stats
    let behind = markets.data.behind
    markets = markets.data.markets
    nodes = markets.node

    let stats_rows = {}
    stats_rows['<b>Total Supply</b> (total tokens claimed)'] = (stats.tokenSupply / 1000).toLocaleString() + ' LARYNX'
    //stats_rows['Locked in NFTs'] = (coin_info.in_NFTS / 1000).toLocaleString() + ' LARYNX'
    //stats_rows['Locked in Auctions'] = (coin_info.in_auctions / 1000).toLocaleString() + ' LARYNX'
    //stats_rows['Locked in Contracts'] = (coin_info.in_contracts / 1000).toLocaleString() + ' LARYNX'
    //stats_rows['Locked in Dividends'] = (coin_info.in_dividends / 1000).toLocaleString() + ' LARYNX'
    //stats_rows['Locked in Market'] = (coin_info.in_market / 1000).toLocaleString() + ' LARYNX'
    stats_rows['<b>Locked in Governance</b> (total held for node runners to operate the DEX)'] = (totals.gov / 1000).toLocaleString() + ' LARYNX'
    //stats_rows['Locked in PowerUps'] = (coin_info.locked_pow / 1000).toLocaleString() + ' LARYNX'
    stats_rows['<b>Liquid Supply</b> (tokens that are not locked or powered-up)'] = ((stats.tokenSupply - totals.gov - totals.poweredUp) / 1000).toLocaleString() + ' LARYNX'
    stats_rows['<b>Governance Threshold</b> (minimum required to be locked to contribute as a node)'] = (parseInt(stats.gov_threshhold) / 1000).toLocaleString() + ' LARYNX'
    stats_rows['<b>DEX Safety Limit</b> (the collective weight of the poorer half of the nodes)'] = `${(stats.safetyLimit / 1000).toLocaleString()}` // THIS * DEX.TICK is the max hive or HBD balance for open buy orders
    stats_rows['<b>DEX Fee</b> (fees for DEX transactions, up to 1%, voted by nodes)'] = `${(parseFloat(stats.dex_fee) * 100).toLocaleString()}%`
    stats_rows['<b>DEX Max</b> (the largest sized order that can be placed, percentage of the above safety limit)'] = `${stats.dex_max}%` // The max size of an open order(not market order) with respect to the above safety limit
    stats_rows['<b>DEX Slope</b> (controls the size of lower priced orders)'] = `${stats.dex_slope}%` // The penalty for size in percent for providing lower priced liquidity (if it was 100% a 50% priced order could be 50% the size of the max.
    stats_rows['<b>DAO Claim Percent</b> (percentage of claimed Larynx that will go into the DAO fund)'] = `${stats.daoclaim.v/100}%` // The penalty for size in percent for providing lower priced liquidity (if it was 100% a 50% priced order could be 50% the size of the max.
    stats_rows['<b>Multi-sig Holdings</b> (coins held in escrow for open DEX orders)'] = `${(stats['MSHeld']['HBD'] / 1000).toLocaleString()} HBD | ${(stats['MSHeld']['HIVE'] / 1000).toLocaleString()} HIVE`
    stats_rows['<b>Blocks Behind</b> (for the API node providing this data)'] = behind + ' blocks'
    stats_rows['<b>Network Node Count</b> (Consensus / Runners / Total)'] = `${Object.keys(queue).length} / ${Object.keys(runners).length} / ${Object.keys(nodes).length}`

    // populate stats table

    let statsTable = ''
    for (attribute in stats_rows) {
      statsTable += `<tr><td>${attribute}</td><td>${stats_rows[attribute]}</td></tr>`
    }
    document.querySelector('table#stats tbody').innerHTML += statsTable

    // populate nodes table
    function renderRow(account, consensus, runner, larynxg, bidrate, dexmax, dexslope, daoclaim, lastgood, version, api) {
        var row_markup = `<tr><td>@${account}</td><td>${consensus}</td><td>${runner}</td><td>${larynxg}</td><td>${bidrate/1000}%</td>`
        row_markup += `<td>${dexmax/100}%</td><td>${dexslope/100}%</td><td>${daoclaim}</td>`
        row_markup += `<td>${lastgood}</td><td>${version}</td><td><a href="./?node=${api}">${api}</a></td></tr>`
        return row_markup
    }

    let consensusRows = ''
    let nonConensusRows = ''

    for (account in nodes) {
        let larynxg = account in queue ? parseInt(queue[account].g)/1000 : '?'
        let api = nodes[account].domain
        let runner = account in runners ? 'Yes' : 'No'
        let consensus = account in queue ? 'Yes' : 'No'

        let bidrate = nodes[account].bidRate
        let lastgood = nodes[account].lastGood
        let version = nodes[account].report ? nodes[account].report.version : 'Unknown'

        let dexmax = nodes[account].dm
        let dexslope = nodes[account].ds
        let daoclaim = isNaN(nodes[account].dv) ? 'No Vote': nodes[account].dv/100 + '%'

        if (account in queue) {
          consensusRows += renderRow(account, consensus, runner, larynxg, bidrate, dexmax, dexslope, daoclaim, lastgood, version, api)
        } else {
          nonConensusRows += renderRow(account, consensus, runner, larynxg, bidrate, dexmax, dexslope, daoclaim, lastgood, version, api)
        }
    }

    let table_markup = `<tr><td colspan="11"><center><b>Nodes in Consensus</b></center></td></tr>`
    table_markup += consensusRows
    table_markup += `<tr><td colspan="11"><center><b>Nodes out of Consensus</b></center></td></tr>`
    table_markup += nonConensusRows

    document.querySelector('table#nodes_table tbody').innerHTML = table_markup
});