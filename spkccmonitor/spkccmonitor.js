//dluxmonitor.js

const DEFAULT_SPKCC_API = 'https://spkcc.dtools.dev/'

var urlParams = new URLSearchParams(window.location.search);
let SPKCC_API = urlParams.has('node') ? urlParams.get('node').toLowerCase() : DEFAULT_SPKCC_API


if (!SPKCC_API.startsWith('https')) {
  window.alert('Sorry, browsers dont allow mixed HTTP/S content. Falling back to default node.')
  SPKCC_API = DEFAULT_SPKCC_API
}

if (SPKCC_API.slice(-1) !== '/') {
  SPKCC_API += '/'
}

totals_promise = axios({
  method: 'get',
  url: SPKCC_API + '@t'
})

runners_promise = axios({
  method: 'get',
  url: SPKCC_API + 'runners'
})

queue_promise = axios({
  method: 'get',
  url: SPKCC_API + 'queue'
})

markets_promise = axios({
  method: 'get',
  url: SPKCC_API + 'markets'
})

dex_promise = axios({
  method: 'get',
  url: SPKCC_API + 'dex'
})

// curl -s --data '{"jsonrpc":"2.0", "method":"condenser_api.get_accounts", "params":[["spk-cc"]], "id":1}' https://api.hive.blog | jq | grep -i "hbd" 

hive_wallet_promise = axios({
  method: 'post',
  data: '{"jsonrpc":"2.0", "method":"condenser_api.get_accounts", "params":[["spk-cc"]], "id":1}',
  url: "https://api.hive.blog"
})

hive_properties_promise = axios({
  method: 'post',
  data: '{"jsonrpc":"2.0", "method":"condenser_api.get_dynamic_global_properties", "params":[], "id":1}',
  url: "https://api.hive.blog"
})


function getTotalStaked(account) {
  return axios({
    method: 'get',
    url: `${SPKCC_API}@${account}`
  }).then(response => {
    if (response.data.granted && response.data.granted.t) {
      return [account,response.data.granted.t, Object.keys(response.data.granted).length - 1, response.data.gov]
    } else {
      return [account,0,0,response.data.gov]
    }
  })
}


function getColor(blocksBehind) {
    let color = 'green'
    if (blocksBehind > 1200) {
      color = 'goldenrod'
    }
    if (blocksBehind > 28800) {
      color = 'red'
    }
    return color
}


Promise.all([totals_promise, runners_promise, queue_promise, markets_promise, hive_properties_promise])
.then((values) => {
    let [totals, runners, queue, markets, hive_properties] = values
    console.log(totals.data)
    console.log(runners.data)
    console.log(queue.data)
    console.log(markets.data) 

    let head_block_number = hive_properties.data.result.head_block_number
    console.log(hive_properties.data.result)

    totals = totals.data
    runners = runners.data.runners
    queue = queue.data.queue
    stats = markets.data.stats
    let behind = markets.data.behind
    markets = markets.data.markets
    nodes = markets.node


    let token_rows = {}
    token_rows['<b>Claim, Power Up, Delegate</b> LARYNX using the <a href="https://vue.dlux.io/me#wallet">dlux.io wallet</a>.'] = ''
    token_rows['<b>Total Supply</b> (total tokens claimed)'] = (stats.tokenSupply / 1000).toLocaleString({minimumFractionDigits: 3}) + ' LARYNX'
    //stats_rows['Locked in NFTs'] = (coin_info.in_NFTS / 1000).toLocaleString() + ' LARYNX'
    //stats_rows['Locked in Auctions'] = (coin_info.in_auctions / 1000).toLocaleString() + ' LARYNX'
    //stats_rows['Locked in Contracts'] = (coin_info.in_contracts / 1000).toLocaleString() + ' LARYNX'
    //stats_rows['Locked in Dividends'] = (coin_info.in_dividends / 1000).toLocaleString() + ' LARYNX'
    //stats_rows['Locked in Market'] = (coin_info.in_market / 1000).toLocaleString() + ' LARYNX'
    token_rows['<b>Locked in Governance</b> (total held for node runners to operate the DEX)'] = (totals.gov / 1000).toLocaleString({minimumFractionDigits: 3}) + ' LARYNX'
    token_rows['<b>Powered Up</b> (total in powered-up state)'] = (totals.poweredUp / 1000).toLocaleString() + ' LARYNX'
    token_rows['<b>Delegated </b> (total powered-up & delegated to nodes)'] = '<span id="totalDelegated">?</span'
    //stats_rows['Locked in PowerUps'] = (coin_info.locked_pow / 1000).toLocaleString() + ' LARYNX'
    token_rows['<b>Liquid Supply</b> (tokens that are not locked or powered-up)'] = ((stats.tokenSupply - totals.gov - totals.poweredUp) / 1000).toLocaleString() + ' LARYNX'


    let stats_rows = {}
    stats_rows['<b>Governance Threshold</b> (minimum required to be locked to contribute as a node)'] = stats.gov_threshhold === 'FULL' ? 'Runners Full' : (parseInt(stats.gov_threshhold) / 1000).toLocaleString() + ' LARYNX'
    stats_rows['<b>DAO Claim Percent</b> (additional percentage of claimed tokens to put in the Larynx DAO)'] = `${stats.daoclaim.v/100}%`



    stats_rows['<b>Blocks Behind</b> (for the API node providing this data)'] = `<font color="${getColor(behind)}">${behind} blocks</font>`
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
    function renderRow(key, account, consensus, runner, larynxg, stakedSpk, cntDelegators, bidrate, dexmax, dexslope, daoclaim, lastgood, lastgoodColor, version, api) {
        var row_markup = `<tr><td>@${account}${key}</td><td>${consensus}</td><td>${runner}</td><td id="locked${account.replace('.','')}">${larynxg}</td><td id="staked${account.replace('.','')}">${stakedSpk}</td><td id="cnt${account.replace('.','')}">${cntDelegators}</td><td>${bidrate/1000}%</td>`
        row_markup += `<td>${dexmax/100}%</td><td>${dexslope/100}%</td><td>${daoclaim}</td>`
        row_markup += `<td><font color="${lastgoodColor}"">${lastgood}</font></td><td>${version}</td><td><a href="./?node=${api}">${api}</a></td></tr>`
        return row_markup
    }

    let consensusRows = ''
    let nonConensusRows = ''

    for (account in nodes) {
        let larynxg = account in queue ? parseFloat(queue[account].g)/1000 : '?'
        if (larynxg != '?') {
          larynxg = larynxg.toLocaleString({minimumFractionDigits: 3})
        }
        let stakedSpk = '?'
        let cntDelegators = '?'

        let api = nodes[account].domain
        let runner = account in runners ? 'Yes' : 'No'
        let consensus = account in queue ? 'Yes' : 'No'

        let bidrate = nodes[account].bidRate
        let lastgood = nodes[account].lastGood

        let lastgoodColor = getColor(head_block_number - nodes[account].lastGood)
        let version = nodes[account].report ? nodes[account].report.version : 'Unknown'

        let dexmax = nodes[account].dm
        let dexslope = nodes[account].ds
        let daoclaim = isNaN(nodes[account].dv) ? 'No Vote': nodes[account].dv/100 + '%'

        let key = ''
        if (Object.keys(stats.ms.active_account_auths).includes(account)) {
          key = '🔑'
        }

        if (account in queue) {
          consensusRows += renderRow(key, account, consensus, runner, larynxg, stakedSpk, cntDelegators, bidrate, dexmax, dexslope, daoclaim, lastgood, lastgoodColor, version, api)
        } else {
          nonConensusRows += renderRow(key, account, consensus, runner, larynxg, stakedSpk, cntDelegators, bidrate, dexmax, dexslope, daoclaim, lastgood, lastgoodColor, version, api)
        }
    }


    let table_markup = ''
    table_markup += consensusRows
    table_markup += nonConensusRows

    document.querySelector('table#nodes_table tbody').innerHTML = table_markup

    let getStakePromises = []
    for (account in nodes) {
        getStakePromises.push(getTotalStaked(account))
    }

    Promise.all(getStakePromises).then((values) => {
      let totalDelegated = 0

      for (value of values) {
        [account,staked,cntDelegators,locked] = value
        staked = parseFloat(staked)/1000
        totalDelegated += staked
        staked = staked.toLocaleString({minimumFractionDigits: 3})
        document.querySelector(`td#staked${account.replace('.','')}`).innerHTML = staked
        document.querySelector(`td#cnt${account.replace('.','')}`).innerHTML = cntDelegators

        locked = parseInt(locked)/1000
        locked = locked.toLocaleString({minimumFractionDigits: 3})

        document.querySelector(`td#locked${account.replace('.','')}`).innerHTML = locked
      }

      document.querySelector(`span#totalDelegated`).innerHTML = totalDelegated.toLocaleString({minimumFractionDigits: 3}) + ' LARYNX'
    })
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
    dex_rows['<b>In Seller Contracts</b> (tokens that are tied up in DEX orders)'] = `${(tokensInSellContracts / 1000).toLocaleString()} LARYNX`
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
    dex_rows['<b>@SPK-CC Hive Wallet Balances</b> (actual Hive layer-1 wallet balances)'] = `<font color="${hiveAmountColor}">${(actual_hive_balance).toLocaleString()} HIVE</font> | <font color="${hbdAmountColor}">${actual_hbd_balance} HBD</font>`



    // populate dex table
    for (attribute in dex_rows) {
      document.querySelector('table#dex tbody').innerHTML += `<tr><td>${attribute}</td><td>${dex_rows[attribute]}</td></tr>`
    }
})

function sortTable(n) {
  var table, rows, switching, i, x, y, shouldSwitch, dir, switchcount = 0;
  table = document.getElementById("nodes_table");
  switching = true;
  // Set the sorting direction to ascending:
  dir = "asc";
  /* Make a loop that will continue until
  no switching has been done: */
  while (switching) {
    // Start by saying: no switching is done:
    switching = false;
    rows = table.rows;
    /* Loop through all table rows (except the
    first, which contains table headers): */
    for (i = 1; i < (rows.length - 1); i++) {
      // Start by saying there should be no switching:
      shouldSwitch = false;
      /* Get the two elements you want to compare,
      one from current row and one from the next: */
      x = rows[i].getElementsByTagName("TD")[n];
      y = rows[i + 1].getElementsByTagName("TD")[n];
      /* Check if the two rows should switch place,
      based on the direction, asc or desc: */

      let xContent = x.innerHTML.toLowerCase()
      let yContent = y.innerHTML.toLowerCase()

      // sort as float for Locked LARYNX Column
      if (n == 3 || n == 4 || n == 5) {
        xContent = parseFloat(xContent.replaceAll(',','').replace('.',''))
        yContent = parseFloat(yContent.replaceAll(',','').replace('.',''))
      }

      if (dir == "asc") {

        if (xContent > yContent) {
          // If so, mark as a switch and break the loop:
          shouldSwitch = true;
          break;
        }
      } else if (dir == "desc") {
        if (xContent < yContent) {
          // If so, mark as a switch and break the loop:
          shouldSwitch = true;
          break;
        }
      }
    }
    if (shouldSwitch) {
      /* If a switch has been marked, make the switch
      and mark that a switch has been done: */
      rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
      switching = true;
      // Each time a switch is done, increase this count by 1:
      switchcount ++;
    } else {
      /* If no switching has been done AND the direction is "asc",
      set the direction to "desc" and run the while loop again. */
      if (switchcount == 0 && dir == "asc") {
        dir = "desc";
        switching = true;
      }
    }
  }
}