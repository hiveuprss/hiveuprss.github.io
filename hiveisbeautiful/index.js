// Created by peakd.com/@hivetrending


var width = 800, height = 700
var speed = 3000

function clamp(num, min, max) {
  return num <= min ? min : num >= max ? max : num;
}

function updateData(nodes) {
  var u = d3.select('svg#viz')
    .selectAll('g')
    .data(nodes)

  u.enter()
      .append('g').attr("class", "node")
      .each(function(d) {
        d3.select(this).append('circle').attr("class", function (d) {
        return d.color
        })
        .attr('r', function(d) {
          return d.radius
        })

        d3.select(this).append("text")
        .attr("dominant-baseline", "central")
        .attr("text-anchor", "middle")
        .text(function(d) { return d.label })
        .style("font-size", '17px')

        d3.select(this).append("text")
        .attr('dy', '12px')
        .attr("dominant-baseline", "central")
        .attr("text-anchor", "middle")
        .text(function(d) { return `@${d.account.substr(0,7)}...` })
        .style("font-size", '10px')
        .attr('hidden', 'true')
      })

  u.exit().remove()
}

function ticked() {
    var nodes = d3.select('svg#viz').selectAll('g')
    nodes.attr("transform", function(d) {
      return "translate(" + d.x + "," + d.y + ")"
    })
}


function createNodes(transactions) {

  //transactions = transactions.filter((x) => {return x.operations[0][0] == 'custom_json'})
  
  var nodes = []

  transactions.forEach( tx => {
    var label = getLabel(tx.operations[0])
    var color = getNodeColor(label)
    var radius = clamp(label.length * 6.25, 30, 42)
    var account = getAccount(tx.operations[0])

    nodes.push({radius: radius, label: label, color: color, account: account})
  })  

  return nodes
}


function getLabel(operation) {
  var opname = operation[0]

  if (opname == 'comment' || opname == 'post') {
    var json = operation[1].json_metadata
    if (json) {
      var json = JSON.parse(json)       
    }

    if (json && json.app) {
      var app = json.app
      app = app.split('/')[0]
      
      if (app == 'leofinance') {
        label = 'Leo'
      } else if (app == 'peakd') {
        label = 'PeakD'
      } else if (app == 'hiveblog') {
        label = 'Hive.blog'
      } else {
        label = app
      }


      label = label.charAt(0).toUpperCase() + label.slice(1);
      console.log(label)
      return label
    } else {
      var label = opname
      label = label.charAt(0).toUpperCase() + label.slice(1);
      return label
    }
  } else if (opname == 'custom_json') {
      var id = operation[1].id

      var json = operation[1].json
      var json = JSON.parse(json) 
   

      if (id == '' && json.prevServerSeed) {
        return 'EpicDice'
      }
      
      var app = json.app
      if (app && (app.includes('steemmonsters') || app.includes('splinterlands')) || id.includes('sm_') || id.includes('pm_')) {
        return 'SL'
      } else if (id.includes('cbm_')){
        return 'CBM'
      } else if (id.includes('ssc-mainnet') || id.includes('scot_')) {
        return 'H-E'
      } else if (id == 'pigs_expired/1' || id =='reject_order/1' || id == 'game_request/1' || id == 'pack_purchase/1' || id == 'confirm_order/1' || id == 'fulfill_pigs/1' || id == 'end_game/1' || id.includes('gmreq_') || id == 'start_game/1' || id =='game_rewards/1' || id == 'pig_upgrade/1' || id == 'fulfill_points/1') {
        return 'Piggies'
      } else if (id.includes('exode')) {
        return 'Exode'
      } else if (id.includes('hb_')) {
        return 'Holybread'
      } else if (id == 'GameSeed') {
        return 'KryptoG'
      } else if (id == 'notify') {
        return 'Notify'
      } else if (id == 'follow') {
        return 'Follow'
      } else if (id == 'reblog') {
        return 'Reblog'
      } else if (id.includes('dlux_')) {
        return 'Dlux'
      } else if (id == 'community') {
        return 'Community'
      } else if (id.includes('esteem_')) {
        return 'Ecency'
      } else if (id == 'rabona') {
        return 'Rabona'
      } else if (id == 'sensorlog') {
        return 'Kinoko'
      } else if (id == 'actifit') {
        return 'Actifit'
      } else if (id.includes('dcity')) {
        return 'dCity'
      } else if (id.includes('lensy_')) {
        return 'Lensy'
      } else if (id == 'beacon_custom_json') {
        return 'PeakD'
      } else if (id.includes('nftsr_')) {
        return 'NFTSR'
      } else if (id.includes('dominuus_')) {
        return 'Dominuus'
      } else if (id == 'nextcolony') {
        return 'NextColony'
      } else if (id == 'drugwars' || id.includes('dw-')) {
        return 'DrugWars'
      } else if (id == 'leoinfra') {
        return 'Leo'
      } else if (id == 'qwoyn_report' || id == 'qwoyn_plant_plot') {
        return 'Hashkings'
      } else if (id == 'dope') {
        return 'Dope'
      } else if (id == 'commentcoin') {
        return 'commentcoin'
      } else if (id == 'podping') {
        return 'podping'
      } else if (id == 'ssc-testnet-puzzlr' || id == 'ssc-testnet-reaz') {
        return 'H-E Testnet'
      } else if (id == 'dcrops') {
        return 'dCrops'
      } else {
        return 'Other'
      }
    }
  else if (opname == 'vote') {
      if (operation[1].weight > 0) {
        return 'Up'
      } else {
        return 'Downvote'
      }
  } else {
    // shorten the label
    label = operation[0].split('_')[0]
    // capitalize first letter
    label = label.charAt(0).toUpperCase() + label.slice(1);
    return label
  }
}


function getNodeColor(label) {
  if (label == 'SL') {
    return 'green'
  } else if (label == 'Up') {
    return 'blue'
  } else if (label == 'Downvote' || label == 'H-E') {
    return 'red'
  } else if (label == 'Other') {
    return 'gray'
  } else if (label == 'Post' || label == 'PeakD') {
    return 'lightgreen'
  } else if (label == 'Comment' || label == 'Hive.blog') {
    return 'yellow-orange'
  } else if (label == 'Transfer') {
    return 'orange'
  } else if (label == 'CBM') {
    return 'lightgreen'
  } else if (label == 'Leo' || label == 'Holybread' || label == 'podping') {
    return 'yellow'
  } else if (label == 'Piggies' || label == '3speak') {
    return 'bluegreen'
  } else {
    return 'gray'
  }
}


function getAccount(operation) {
  var opname = operation[0]


  if (opname == 'vote') {
    var voter = operation[1].voter
    return voter
  } else if (opname == 'custom_json') {
    var account = `${operation[1].required_posting_auths}`
    return account
  } else {
    return 'account'
  }
}

// Start button controls

document.querySelector('button#gotoblock').onclick = (e) => {
  var blockNum = prompt("Enter block number:","NaN")

  // sanitize
  blockNum = parseInt(blockNum)

  if (!blockNum || blockNum < 0) {
    getLatestBlocknum()
  } else {
    document.querySelector('#blockNum').data = `${blockNum + 1}`
    document.querySelector('#blockNum').innerText = `${blockNum}`    
  }
}

document.querySelector('button#pause').onclick = (e) => {
  document.querySelector('button#pause').hidden = true
  document.querySelector('button#play').hidden = false
}
document.querySelector('button#play').onclick = (e) => {
  document.querySelector('button#play').hidden = true
  document.querySelector('button#pause').hidden = false
}

document.querySelector('button#fastforward').onclick = (e) => {
  var minSpeed = 1.0
  var maxSpeed = 3.0
  var speedIncrement = 1.0


  var currentSpeed = getSpeedSetting()
  if (currentSpeed == maxSpeed) {
    var newSpeed = minSpeed
  }
  else {
    var newSpeed = currentSpeed + speedIncrement
    newSpeed = clamp(newSpeed, minSpeed, maxSpeed)    
  }

  // update UI
  document.querySelector('button#speedgauge').data = `${newSpeed}`
  document.querySelector('button#speedgauge').innerText = `${newSpeed}x`
}

function getSpeedSetting() {
  if (!document.querySelector('button#speedgauge').data) {
      document.querySelector('button#speedgauge').data = '1.0'
    }

  var currentSpeed = parseFloat(document.querySelector('button#speedgauge').data)
  return currentSpeed
}

// End button controls



hive.api.setOptions({url: "https://api.deathwing.me/"})


function getLatestBlocknum() {
  // Get the current blocknum
  hive.api.getDynamicGlobalProperties(function(err, result) {
    if (err) {
      console.log(err)
      return
    }

    var currentWitness = result.current_witness;
    document.querySelector('#currentWitness').innerText = `${currentWitness}`

    var blockNum = result.head_block_number
    document.querySelector('#blockNum').innerText = `${blockNum}`
    document.querySelector('#blockNum').data = `${blockNum}`
    runLoop()
  })

}


function runLoop () {
    if (document.querySelector('button#pause').hidden == true) {
      return
    }

    var blockNum = document.querySelector('#blockNum').data
    if(!blockNum) {
      console.log('Failed to find block')
      return
    }

    console.log(blockNum)

    hive.api.getBlock(blockNum, function(err, result) {
      //console.log(err, result);
      //console.log(blockNum)
      if (err) {
        console.log(err)
        return
      }

      var block = result
      // check if the block looks okay
      if (!block || !block.transactions) {
        return
      }

      d3.select('svg#viz').selectAll('g').remove()
      var nodes = createNodes(block.transactions)
      updateData(nodes)

      var simulation = d3.forceSimulation(nodes)
        .force('charge', d3.forceManyBody().strength(0.1))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(function(d) {
          return d.radius * 1.00
        }))
        .on('tick', ticked)
        .alpha(100)

      block.transactions.forEach( (tx) => {
        if (tx.operations[0][0] == 'custom_json') {
          // debugging code to identify unclassified apps
          if (getLabel(tx.operations[0]) == 'Other') {
            console.log('Unknown app')
            console.log(tx.operations[0])
          }
        }
      })

      // if we succeeded so far, advance to next block
      if (document.querySelector('#blockNum').data == `${parseInt(blockNum)}`) {
        document.querySelector('#blockNum').data = `${parseInt(blockNum) + 1}`
        document.querySelector('#blockNum').innerText = `${blockNum}`
        document.querySelector('#currentWitness').innerText = `${block.witness}`
        document.querySelector('#timestamp').innerText = `${block.timestamp}`        
      }
    });
}

// initialize, read params
var urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('block')) {
  var blockNum = urlParams.get('block')
  var blockNum = parseInt(blockNum)
  
  if (isNaN(blockNum) || blockNum < 0) {
    getLatestBlocknum()
  } else {
    document.querySelector('#blockNum').innerText = `${blockNum}`
    document.querySelector('#blockNum').data = `${blockNum}`
    runLoop()
  }
} else {
  getLatestBlocknum()
}



// repeat every N ms
function runtimeAdjustSpeed() {
    var currentSpeed = 3000 / getSpeedSetting()

    runLoop()    
  
    setTimeout( () => {
      runtimeAdjustSpeed()
    },
    currentSpeed)
}

runtimeAdjustSpeed()
