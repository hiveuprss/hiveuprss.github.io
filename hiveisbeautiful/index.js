
var width = 800, height = 800

var nodes = []

function clamp(num, min, max) {
  return num <= min ? min : num >= max ? max : num;
}

var simulation = d3.forceSimulation(nodes)
  .force('charge', d3.forceManyBody().strength(5))
  .force('center', d3.forceCenter(width / 2, height / 2))
  .force('collision', d3.forceCollide().radius(function(d) {
    return d.radius * 1.5
  }))
  .on('tick', ticked);

function updateData() {
  var u = d3.select('svg')
    .selectAll('g')
    .data(nodes)

  var newNodes = u.enter()
      .append('g').attr("class", "node")
      .each(function(d) {
        d3.select(this).append('circle').attr("class", function (d) {
        return d.color
        })
        .attr('r', function(d) {
          return d.radius
        })

        d3.select(this).append("text")
        .attr('dx', (d) => {
          return d.label.length / 2 * -9
        })
        .attr("dy", ".35em")
        .text(function(d) { return d.label.replaceAll(' ','\n') })
        .style("stroke", "black") 
        .style("font-size", (d) => {
          return `${clamp(35 / (d.label.length / 2.5), 15, 25)}px`
        })
      })

  u.exit().remove()
}

function ticked() {
    var node = d3.select('svg')
    .selectAll('g')

    /*u.attr('cx', function(d) {
      return d.x
    })
    .attr('cy', function(d) {
      return d.y
    })   */
    node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

}


function drawNodes (transactions) {
  nodes = []
  app = ''

  transactions.forEach( tx => {
    var label = getLabel(tx.operations[0])
    var color = getNodeColor(label)
    var radius = clamp(label.length * 5, 30, 40)

    nodes.push({radius: radius, label: label, color: color})
  })

  //simulation.stop();
                
    simulation.nodes(nodes);

    simulation.alpha(1);
              
    //simulation.restart();
}

function getLabel(operation) {
  if (operation[0] == 'custom_json') {
      var id = operation[1].id
      var json = operation[1].json
      var json = JSON.parse(json)    
      var app = json.app
      

      if (app && (app.includes('steemmonsters') || app.includes('splinterlands')) || id.includes('sm_')) {
        return 'SL'
      } else if (id.includes('cbm_')){
        return 'Crypto Brew Master'
      } else if (id.includes('ssc-mainnet-hive') || id == 'scot_claim_token') {
        return 'Hive Engine'
      } else if (json.game == 'Battle for Pigs') {
        return 'Piggericks'
      } else if (id.includes('exode')) {
        return 'Exode'
      } else if (id == 'GameSeed') {
        return 'KryptoGames'
      } else {
        return 'Other JSON'
      }
    }
  else if (operation[0] == 'vote') {
      if (operation[1].weight > 0) {
        return 'Upvote'
      } else {
        return 'Downvote'
      }
  } else {
    return operation[0].split('_')[0]
  }
}


function getNodeColor(label) {
  if (label == 'SL') {
    return 'green'
  } else if (label == 'Upvote') {
    return 'blue'
  } else if (label == 'Downvote') {
    return 'red'
  } else if (label == 'Other JSON') {
    return 'orange'
  } else if (label == 'post') {
    return 'blue'
  } else if (label == 'Crypto Brew Master') {
    return 'green'
  } else {
    return 'orange'
  }
}


/*function addNode(operation, app) {
  nodes.push({radius: 20, name: operation, color: getNodeColor(operation, app)})
  simulation.nodes(nodes);
    simulation.alpha(1);
}


hive.api.streamOperations(function(err, operations) {
  console.log(operations[0]);
    addNode(operations[0])
})*/


function runLoop () {
  hive.api.getDynamicGlobalProperties(function(err, result) {
    //console.log(err, result.head_block_number)
    var blockNum = result.head_block_number
    document.querySelector('#blockNum').innerText = `Hive Block #${blockNum}`
    hive.api.getBlock(blockNum, function(err, result) {
      //console.log(err, result);

      var block = result
      drawNodes(block.transactions)
      updateData()

      block.transactions.forEach( (tx) => {
        if (tx.operations[0][0] == 'custom_json') {
          // debugging code to identify unclassified apps
          if (getLabel(tx.operations[0]) == 'Other JSON') {
            console.log(`Unknown app`)
            console.log(tx.operations[0])
          }
        }
      })
    });
  })
}


// run once then repeat every N ms
runLoop()
setInterval( () => {
  runLoop()
},
2750)