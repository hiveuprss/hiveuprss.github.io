
var width = 800, height = 700

var nodes = []

function clamp(num, min, max) {
  return num <= min ? min : num >= max ? max : num;
}

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
        .attr('dx', (d) => {
          return d.label.length / 2 * -9
        })
        .attr("dy", ".35em")
        .text(function(d) { return d.label })
        //.style("stroke", "black") 
        .style("font-size", '17px')
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
    var radius = clamp(label.length * 6.25, 30, 40)

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
      

      if (app && (app.includes('steemmonsters') || app.includes('splinterlands')) || id.includes('sm_') || id.includes('pm_')) {
        return 'Splint'
      } else if (id.includes('cbm_')){
        return 'CBM'
      } else if (id.includes('ssc-mainnet-hive') || id == 'scot_claim_token') {
        return 'H-Engine'
      } else if (json.game == 'Battle for Pigs' || id.includes('gmreq_') || id == 'start_game/1' || id =='game_rewards/1' || id == 'pig_upgrade/1') {
        return 'Piggies'
      } else if (id.includes('exode')) {
        return 'Exode'
      } else if (id.includes('hb_')) {
        return 'Holybread'
      } else if (id == 'GameSeed') {
        return 'KryptoGames'
      } else if (id == 'notify') {
        return 'Notify'
      } else if (id == 'follow') {
        return 'Follow'
      } else if (id.includes('dlux_')) {
        return 'Dlux'
      } else if (id == 'community') {
        return 'Community'
      } else {
        return 'Other'
      }
    }
  else if (operation[0] == 'vote') {
      if (operation[1].weight > 0) {
        return 'Upvote'
      } else {
        return 'Downvote'
      }
  } else {
    label = operation[0].split('_')[0]
    label = label.charAt(0).toUpperCase() + label.slice(1);
    return label
  }
}


function getNodeColor(label) {
  if (label == 'Splint') {
    return 'green'
  } else if (label == 'Upvote') {
    return 'blue'
  } else if (label == 'Downvote') {
    return 'red'
  } else if (label == 'Other') {
    return 'gray'
  } else if (label == 'post') {
    return 'lightblue'
  } else if (label == 'comment') {
    return 'yellow-orange'
  } else if (label == 'CBM') {
    return 'lightgreen'
  } else if (label == 'H-Engine') {
    return 'yellow'
  } else if (label == 'Piggies') {
    return 'bluegreen'
  } else {
    return 'gray'
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
  /*hive.api.getAccounts(['mahdiyari'], function(err, response){
      //console.log(err, response);

      var profile_image = JSON.parse(response[0].json_metadata).profile.profile_image
      //console.log(profile_image)
  });*/

  hive.api.getDynamicGlobalProperties(function(err, result) {
    //console.log(err, result)

    var currentWitness = result.current_witness;
    document.querySelector('#currentWitness').innerText = `${currentWitness}`
    
    var blockNum = result.head_block_number
    console.log(document.querySelector('#blockNum').data)
    document.querySelector('#blockNum').innerText = `${blockNum}`
    document.querySelector('#blockNum').data = blockNum
    hive.api.getBlock(blockNum, function(err, result) {
      //console.log(err, result);

      var block = result
      drawNodes(block.transactions)
      updateData()

      block.transactions.forEach( (tx) => {
        if (tx.operations[0][0] == 'custom_json') {
          // debugging code to identify unclassified apps
          if (getLabel(tx.operations[0]) == 'Other') {
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
2900)