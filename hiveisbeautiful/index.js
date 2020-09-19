
var width = 800, height = 800

var nodes = [{radius: 30, name: 'abc', color: 'green'}]

var simulation = d3.forceSimulation(nodes)
  .force('charge', d3.forceManyBody().strength(5))
  .force('center', d3.forceCenter(width / 2, height / 2))
  .force('collision', d3.forceCollide().radius(function(d) {
    return d.radius * 1.25
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
        .attr("dx", -20)
        .attr("dy", ".35em")
        .text(function(d) { return d.name });
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
    var op = tx.operations[0][0]
    var app = getApp(tx.operations[0])

    var label = app ? app : op

    nodes.push({radius: 30, name: label, color: getNodeColor(op, app)})
  })

  //simulation.stop();
                
    simulation.nodes(nodes);

    simulation.alpha(1);
              
    //simulation.restart();
}

function getApp(operation) {
  if (operation[0] == 'custom_json') {
      var id = operation[1].id
      var json = operation[1].json
      var app = JSON.parse(json).app
      if (app) {
        app = app.split('/')[0]
      }

      if (app == 'steemmonsters' || app == 'splinterlands' || id.includes('sm_')) {
        return 'SL'
      } else if (id.includes('cbm_')){
        return 'CBM'
      } else if (id.includes('ssc-mainnet-hive')) {
        return 'HE'
      } else {
        return 'Unknown'
      }

    }
}


function getNodeColor(operation, app) {
  if (app && (app == 'SL')) {
    return 'green'
  }

  if (operation == 'vote') {
    return 'red'
  } else if (operation == 'custom_json') {
    return 'orange'
  } else if (operation == 'post') {
    return 'blue'
  } else {
    return 'black'
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
          var id = tx.operations[0][1].id
          var json = tx.operations[0][1].json
          var app = JSON.parse(json).app
          if (app) {
            app = app.split('/')[0]
          } 
          //console.log(`${id} - ${app}`)

          if (getApp(tx.operations[0]) == 'Unknown') {
            console.log(`Unknown app`)
            console.log(tx.operations[0])
          }
        } else {
          //console.log(tx.operations[0][0])
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