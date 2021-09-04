// Created by peakd.com/@hivetrending

hive.api.setOptions({url: "https://api.deathwing.me/"})


var speed = 3000
var width = 800, height = 700

var color = 'gray'

function clamp(num, min, max) {
  return num <= min ? min : num >= max ? max : num;
}

drag = simulation => {
  
  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }
  
  function dragged(event,d) {
    d.fx = event.x;
    d.fy = event.y;
  }
  
  function dragended(event,d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
  
  return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
}

nodes = []
links = []

function startSimulation() {  

  const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id))
      .force("charge", d3.forceManyBody())
      .force("x", d3.forceX())
      .force("y", d3.forceY());


  const svg = d3.select('svg#viz')
      .attr("viewBox", [-width / 2, -height / 2, width, height])
      .attr("class","center")

  const link = svg.append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
    .selectAll("line")
    .data(links)
    .join("line")
      .attr("stroke-width", d => Math.sqrt(d.value));

  const node = svg.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
    .selectAll("circle")
    .data(nodes)
    .join("circle")
      .attr("r", 5)
      .attr("fill", color)
      .call(drag(simulation));

  node.append("title")
      .text(d => d.id);

  simulation.on("tick", () => {
    link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

    node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
  });

  //invalidation.then(() => simulation.stop());

  return svg.node();
}



function updateData(nodes) {
  var svg = d3.select('svg#viz')


    .selectAll('g')
    .data(nodes)

  nodes.enter()
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
  })  

  nodes.exit().remove()

  links.enter()
  links.exit().remove()
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
    //startSimulation()
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

      block.transactions = block.transactions.filter( (tx) => {
        var opname = tx.operations[0][0]
        var op = tx.operations[0][1]

        // filter for transfers only
        if (['account_create'].includes(opname)) {
          return true
        }
        return false
      })

      block.transactions.forEach( (tx) => {
        console.log(tx.operations[0][1])
      })

      document.querySelectorAll('div.transfer').forEach( (node) => {
        node.className = "transfer gray"
      })


      block.transactions.forEach( (tx) => {
        var op = tx.operations[0][1]
        var opname = tx.operations[0][0]
        //console.log(op)

        var color = 'green'
        color = 'lightgreen'

        op['to'] = op['new_account_name']
        op['from'] = op['creator']
        op['amount'] = op['fee']

        var currentHTML = document.querySelector('div#content').innerHTML
        document.querySelector('div#content').innerHTML = `<div class="transfer ${color}">${op['from']} => ${op['to']} ( ${op['amount']} )</div>` + currentHTML
      })

      // if we succeeded so far, advance to next block
      if (document.querySelector('#blockNum').data == `${parseInt(blockNum)}`) {
        document.querySelector('#blockNum').data = `${parseInt(blockNum) + 1}`
        document.querySelector('#blockNum').innerText = `${blockNum}`
        document.querySelector('#currentWitness').innerText = `${block.witness}`
        document.querySelector('#timestamp').innerText = `${block.timestamp}`        
      }

      if (document.querySelector('button#pause').hidden == true) {
        return
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
