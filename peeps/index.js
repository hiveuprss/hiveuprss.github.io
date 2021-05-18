// Created by peakd.com/@hivetrending


var width = 800, height = 700
var speed = 3000

var nodes = []

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

  transactions.forEach( tx => {
    var label = getLabel(tx.operations[0])
    var color = getNodeColor(label)
    var radius = clamp(label.length * 6.25, 30, 70)
    var account = getAccount(tx.operations[0])

    nodes.push({radius: radius, label: label, color: color, account: account})
  })

  nodes = nodes.slice(0,20)
}


function getLabel(operation) {
  var opname = operation[0]

  if (opname == 'comment' || opname == 'post') {
    //var json = operation[1].json_metadata

    //if (json) {
    //  var json = JSON.parse(json)
    //}

      var label = operation[1].author


      label = label.charAt(0).toUpperCase() + label.slice(1);
      //console.log(label)
      console.log([`${label}`])
      hive.api.getAccounts([`${label}`], function(err, result) {
        if (err) {
          console.log(err)
          return
        }
        //console.log(result)

        console.log(result)
        var json = operation[1].posting_json_metadata
        if (json) {
          var json = JSON.parse(json)
          console.log(json)
        }

      })



      return label
  } else {
    // shorten the label
    label = operation[0].split('_')[0]
    // capitalize first letter
    label = label.charAt(0).toUpperCase() + label.slice(1);
    return label
  }
}


function getNodeColor(label) {

  var colors = ['green','blue','red','gray','lightgreen','yellow-orange','orange','yellow','bluegreen']

  return colors[Math.floor(colors.length * Math.random())]
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

    //console.log(blockNum)

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

      let transactions = block.transactions.filter( (x) => {
        var opname = x.operations[0][0]
        if (opname == 'comment') {
          return true
        }
      })
      
      //d3.select('svg#viz').selectAll('g').remove()
      createNodes(transactions)
      updateData(nodes)

      var simulation = d3.forceSimulation(nodes)
        .force('charge', d3.forceManyBody().strength(1))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(function(d) {
          return d.radius * 1.00
        }))
        .on('tick', ticked)
        .alpha(100)

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
