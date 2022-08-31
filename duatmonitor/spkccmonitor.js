//dluxmonitor.js

const DEFAULT_API_URL = 'https://duat.hivehoneycomb.com/'
const TOKEN_NAME = 'DUAT'

var urlParams = new URLSearchParams(window.location.search);
let API_URL = urlParams.has('node') ? urlParams.get('node').toLowerCase() : DEFAULT_API_URL


if (!API_URL.startsWith('https')) {
  window.alert('Sorry, browsers dont allow mixed HTTP/S content. Falling back to default node.')
  API_URL = DEFAULT_API_URL
}

if (API_URL.slice(-1) !== '/') {
  API_URL += '/'
}

totals_promise = axios({
  method: 'get',
  url: API_URL + '@t'
})

runners_promise = axios({
  method: 'get',
  url: API_URL + 'runners'
})

queue_promise = axios({
  method: 'get',
  url: API_URL + 'queue'
})

markets_promise = axios({
  method: 'get',
  url: API_URL + 'markets'
})

dex_promise = axios({
  method: 'get',
  url: API_URL + 'dex'
})

// curl -s --data '{"jsonrpc":"2.0", "method":"condenser_api.get_accounts", "params":[["spk-cc"]], "id":1}' https://api.hive.blog | jq | grep -i "hbd" 

hive_wallet_promise = axios({
  method: 'post',
  data: '{"jsonrpc":"2.0", "method":"condenser_api.get_accounts", "params":[["ragnarok-cc"]], "id":1}',
  url: "https://api.hive.blog"
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


    let token_rows = {}
    token_rows['<b>Total Supply</b> (total tokens claimed)'] = `${(stats.tokenSupply / 1000).toLocaleString()} ${TOKEN_NAME}`
    //stats_rows['Locked in NFTs'] = (coin_info.in_NFTS / 1000).toLocaleString() + ' LARYNX'
    //stats_rows['Locked in Auctions'] = (coin_info.in_auctions / 1000).toLocaleString() + ' LARYNX'
    //stats_rows['Locked in Contracts'] = (coin_info.in_contracts / 1000).toLocaleString() + ' LARYNX'
    //stats_rows['Locked in Dividends'] = (coin_info.in_dividends / 1000).toLocaleString() + ' LARYNX'
    //stats_rows['Locked in Market'] = (coin_info.in_market / 1000).toLocaleString() + ' LARYNX'
    token_rows['<b>Locked in Governance</b> (total held for node runners to operate the DEX)'] = `${(totals.gov / 1000).toLocaleString()} ${TOKEN_NAME}`
    //stats_rows['Locked in PowerUps'] = (coin_info.locked_pow / 1000).toLocaleString() + ' LARYNX'
    token_rows['<b>Liquid Supply</b> (tokens that are not locked or powered-up)'] = `${((stats.tokenSupply - totals.gov - totals.poweredUp) / 1000).toLocaleString()} ${TOKEN_NAME}`


    let stats_rows = {}
    stats_rows['<b>Governance Threshold</b> (minimum required to be locked to contribute as a node)'] = stats.gov_threshhold === 'FULL' ? 'Runners Full' : `${(parseInt(stats.gov_threshhold) / 1000).toLocaleString()} ${TOKEN_NAME}`
    //stats_rows['<b>DAO Claim Percent</b> (additional percentage of claimed tokens to put in the Larynx DAO)'] = `${stats.daoclaim.v/100}%`
    stats_rows['<b>Blocks Behind</b> (for the API node providing this data)'] = behind + ' blocks'
    stats_rows['<b>Network Node Count</b> (Runners / Consensus / Total)'] = `${Object.keys(runners).length} / ${Object.keys(queue).length} / ${Object.keys(nodes).length}`


    // populate token table
    for (attribute in token_rows) {
      document.querySelector('table#token tbody').innerHTML += `<tr><td>${attribute}</td><td>${token_rows[attribute]}</td></tr>`
    }

    // populate stats table
    for (attribute in stats_rows) {
      document.querySelector('table#stats tbody').innerHTML += `<tr><td>${attribute}</td><td>${stats_rows[attribute]}</td></tr>`
    }


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


function calcCoinsInContracts(data) {

  let hivebuys = data.markets.hive.buys.sort(function(a, b) {
      return parseFloat(b.rate) - parseFloat(a.rate)
    }).reduce((acc, cur) => {
      if (!acc.length || acc[acc.length - 1].rate != cur.rate) {
        cur.total = cur.hive + (acc[acc.length - 1]?.total || 0)
        cur.at = cur.amount + (acc[acc.length - 1]?.amount || 0)
        acc.push(cur)
      } else {
        acc[acc.length - 1].total = cur.hive + acc[acc.length - 1].total
        acc[acc.length - 1].hive = cur.hive + acc[acc.length - 1].hive
        acc[acc.length - 1].amount = cur.amount + acc[acc.length - 1].amount
        acc[acc.length - 1].at = cur.amount + acc[acc.length - 1].at
      }
      return acc
    }, [])
  let hivesells = data.markets.hive.sells.sort(function(a, b) {
    return parseFloat(a.rate) - parseFloat(b.rate)
  }).reduce((acc, cur) => {
    if (!acc.length || acc[acc.length - 1].rate != cur.rate) {
      cur.total = cur.hive + (acc[acc.length - 1]?.total || 0)
      cur.at = cur.amount + (acc[acc.length - 1]?.amount || 0)
      acc.push(cur)
    } else {
      acc[acc.length - 1].total = cur.hive + acc[acc.length - 1].total
      acc[acc.length - 1].hive = cur.hive + acc[acc.length - 1].hive
      acc[acc.length - 1].amount = cur.amount + acc[acc.length - 1].amount
      acc[acc.length - 1].at = cur.amount + acc[acc.length - 1].at
    }
    return acc
  }, [])

  let hbdbuys = data.markets.hbd.buys.sort(function(a, b) {
    return parseFloat(a.rate) - parseFloat(b.rate)
  }).reduce((acc, cur) => {
      if (!acc.length || acc[acc.length - 1].rate != cur.rate) {
        cur.total = cur.hbd + (acc[acc.length - 1]?.total || 0)
        cur.at = cur.amount + (acc[acc.length - 1]?.amount || 0)
        acc.push(cur)
      } else {
        acc[acc.length - 1].total = cur.hbd + acc[acc.length - 1].total
        acc[acc.length - 1].hbd = cur.hbd + acc[acc.length - 1].hbd
        acc[acc.length - 1].amount = cur.amount + acc[acc.length - 1].amount
        acc[acc.length - 1].at = cur.amount + acc[acc.length - 1].at
      }
      return acc
    }, [])
  let hbdsells = data.markets.hbd.sells.sort(function(a, b) {
    return parseFloat(a.rate) - parseFloat(b.rate)
  }).reduce((acc, cur) => {
    if (!acc.length || acc[acc.length - 1].rate != cur.rate) {
      cur.total = cur.hbd + (acc[acc.length - 1]?.total || 0)
      cur.at = cur.amount + (acc[acc.length - 1]?.amount || 0)
      acc.push(cur)
    } else {
      acc[acc.length - 1].total = cur.hbd + acc[acc.length - 1].total
      acc[acc.length - 1].hbd = cur.hbd + acc[acc.length - 1].hbd
      acc[acc.length - 1].amount = cur.amount + acc[acc.length - 1].amount
      acc[acc.length - 1].at = cur.amount + acc[acc.length - 1].at
    }
    return acc
  }, [])

  let tokensInHiveSells = hivesells.reduce((acc, cur) => {
    acc += cur.at
    return acc
  }, 0)

  let tokensInHBDSells = hbdsells.reduce((acc, cur) => {
    acc += cur.at
    return acc
  }, 0)

  let coinsInHiveBuys = hivebuys.reduce((acc, cur) => {
    acc += cur.hive
    return acc
  }, 0)

  let coinsInHBDBuys = hbdbuys.reduce((acc, cur) => {
    acc += cur.hbd
    return acc
  }, 0)

  return [tokensInHiveSells + tokensInHBDSells, coinsInHiveBuys, coinsInHBDBuys]
}


Promise.all([markets_promise, dex_promise, hive_wallet_promise])
.then((values) => {
    let [markets, dex, hive_wallet] = values
    let stats = markets.data.stats
    let hive_wallet_balances = hive_wallet.data.result[0]

    console.log(dex.data)
    console.log(hive_wallet)
    console.log(hive_wallet_balances)

    let actual_hive_balance = parseFloat(hive_wallet_balances.balance.split(' ')[0])
    let actual_hbd_balance = parseFloat(hive_wallet_balances.hbd_balance.split(' ')[0])

    let [tokensInSellContracts, hiveInBuyContracts, hbdInBuyContracts] = calcCoinsInContracts(dex.data)

    let dex_rows = {}
    dex_rows['<b>DEX Fee</b> (fees for DEX transactions, up to 1%, voted by nodes)'] = `${(parseFloat(stats.dex_fee) * 100).toLocaleString()}%`
    dex_rows['<b>DEX Safety Limit</b> (the collective weight of the poorer half of the nodes)'] = `${(stats.safetyLimit / 1000).toLocaleString()}` // THIS * DEX.TICK is the max hive or HBD balance for open buy orders
    dex_rows['<b>DEX Max</b> (the largest sized order that can be placed, percentage of the above safety limit)'] = `${stats.dex_max}%` // The max size of an open order(not market order) with respect to the above safety limit
    dex_rows['<b>DEX Slope</b> (controls the size of lower priced orders)'] = `${stats.dex_slope}%` // The penalty for size in percent for providing lower priced liquidity (if it was 100% a 50% priced order could be 50% the size of the max.
    dex_rows['<b>In Seller Contracts</b> (tokens that are tied up in DEX orders)'] = `${(tokensInSellContracts / 1000).toLocaleString()} ${TOKEN_NAME}`
    dex_rows['<b>In Buyer Contracts</b> (coins that are tied up in DEX orders)'] = `${(hiveInBuyContracts / 1000).toLocaleString()} HIVE | ${(hbdInBuyContracts / 1000).toLocaleString()} HBD`

    let hiveAmountColor = stats['MSHeld']['HIVE'] > hiveInBuyContracts ? 'goldenrod' : 'red'
    hiveAmountColor = stats['MSHeld']['HIVE'] == hiveInBuyContracts ? 'green' : hiveAmountColor
    let hbdAmountColor = stats['MSHeld']['HBD'] > hbdInBuyContracts ? 'goldenrod' : 'red'
    hbdAmountColor = stats['MSHeld']['HBD'] == hbdInBuyContracts ? 'green' : hbdAmountColor

    dex_rows['<b>Multi-sig Bidder Pool Holdings</b> (coins held in escrow for open DEX orders)'] = `<font color="${hiveAmountColor}">${(stats['MSHeld']['HIVE'] / 1000).toLocaleString()} HIVE</font> | <font color="${hbdAmountColor}">${(stats['MSHeld']['HBD'] / 1000).toLocaleString()} HBD</font>`

    hiveAmountColor = actual_hive_balance > hiveInBuyContracts / 1000 ? 'goldenrod' : 'red'
    hiveAmountColor = actual_hive_balance == hiveInBuyContracts / 1000 ? 'green' : hiveAmountColor
    hbdAmountColor = actual_hbd_balance > hbdInBuyContracts / 1000 ? 'goldenrod' : 'red'
    hbdAmountColor = actual_hbd_balance == hbdInBuyContracts / 1000 ? 'green' : hbdAmountColor
    dex_rows['<b>@ragnarok-cc Hive Wallet Balances</b> (actual Hive layer-1 wallet balances)'] = `<font color="${hiveAmountColor}">${(actual_hive_balance).toLocaleString()} HIVE</font> | <font color="${hbdAmountColor}">${actual_hbd_balance} HBD</font>`



    // populate dex table
    for (attribute in dex_rows) {
      document.querySelector('table#dex tbody').innerHTML += `<tr><td>${attribute}</td><td>${dex_rows[attribute]}</td></tr>`
    }
})