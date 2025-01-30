// Created by peakd.com/@hivetrending

hive.api.setOptions({ url: "https://api.syncad.com/" });

var speed = 3000;

function clamp(num, min, max) {
  return num <= min ? min : num >= max ? max : num;
}

// Start button controls

document.querySelector("button#gotoblock").onclick = (e) => {
  var blockNum = prompt("Enter block number:", "NaN");

  // sanitize
  blockNum = parseInt(blockNum);

  if (!blockNum || blockNum < 0) {
    getLatestBlocknum();
  } else {
    document.querySelector("#blockNum").data = `${blockNum + 1}`;
    document.querySelector("#blockNum").innerText = `${blockNum}`;
  }
};

document.querySelector("button#pause").onclick = (e) => {
  document.querySelector("button#pause").hidden = true;
  document.querySelector("button#play").hidden = false;
};
document.querySelector("button#play").onclick = (e) => {
  document.querySelector("button#play").hidden = true;
  document.querySelector("button#pause").hidden = false;
};

document.querySelector("button#fastforward").onclick = (e) => {
  var minSpeed = 1.0;
  var maxSpeed = 3.0;
  var speedIncrement = 1.0;

  var currentSpeed = getSpeedSetting();
  if (currentSpeed == maxSpeed) {
    var newSpeed = minSpeed;
  } else {
    var newSpeed = currentSpeed + speedIncrement;
    newSpeed = clamp(newSpeed, minSpeed, maxSpeed);
  }

  // update UI
  document.querySelector("button#speedgauge").data = `${newSpeed}`;
  document.querySelector("button#speedgauge").innerText = `${newSpeed}x`;
};

function getSpeedSetting() {
  if (!document.querySelector("button#speedgauge").data) {
    document.querySelector("button#speedgauge").data = "2.0";
  }

  var currentSpeed = parseFloat(
    document.querySelector("button#speedgauge").data
  );
  return currentSpeed;
}

// End button controls

function getLatestBlocknum() {
  // Get the current blocknum
  hive.api.getDynamicGlobalProperties(function (err, result) {
    if (err) {
      console.log(err);
      return;
    }

    var currentWitness = result.current_witness;
    document.querySelector("#currentWitness").innerText = `${currentWitness}`;

    var blockNum = parseInt(result.head_block_number) - 20;
    document.querySelector("#blockNum").innerText = `${blockNum}`;
    document.querySelector("#blockNum").data = `${blockNum}`;
    runLoop();
  });
}

function runLoop() {
  //startSimulation()
  if (document.querySelector("button#pause").hidden == true) {
    return;
  }

  var blockNum = document.querySelector("#blockNum").data;
  if (!blockNum) {
    console.log("Failed to find block");
    return;
  }

  //console.log(blockNum)

  hive.api.getBlock(blockNum, function (err, result) {
    //console.log(err, result);
    //console.log(blockNum)
    if (err) {
      console.log(err);
      return;
    }

    var block = result;
    // check if the block looks okay
    if (!block || !block.transactions) {
      return;
    }

    document.querySelectorAll("div.op").forEach((node) => {
      node.className = "op gray";
    });

    const blockSize = block.transactions.length;
    document.querySelector(
      "#blockSize"
    ).innerText = `${blockSize.toLocaleString()} transactions`;

    block.transactions = block.transactions.filter((tx) => {
      var opname = tx.operations[0][0];
      // var op = tx.operations[0][1];

      const hideCustomJson = document.querySelector(
        "#flexCheckCustomJSONs"
      ).checked;
 
      const hideOpnames = [];
      if (hideCustomJson) {
        hideOpnames.push("custom_json");
      }

      const hideVotes = document.querySelector("#flexCheckVotes").checked;
      if (hideVotes) {
        hideOpnames.push("vote");
      }

      const hideMarket = document.querySelector("#flexCheckMarket").checked;
      if (hideMarket) {
        hideOpnames.push("limit_order_create");
      }

      const hideRewards = document.querySelector("#flexCheckRewards").checked;
      if (hideRewards) {
        hideOpnames.push("claim_reward_balance");
      }

      // transfer

      if (hideOpnames.includes(opname)) {
        return false;
      }
      return true;
    });

    block.transactions.forEach((tx) => {
      const op = tx.operations[0][1];
      const opname = tx.operations[0][0];

      const currentHTML = document.querySelector("div#content").innerHTML;

      if (opname == "comment" && op["parent_author"] != "") {
        var commentBody = op["body"].trim();
        commentBody = commentBody.replaceAll("\n", "");
        commentBody = commentBody.replaceAll(/<[^>]*>/g, "");

        if (commentBody.length > 100) {
          commentBody = commentBody.substr(0, 97) + "...";
        }

        var appLogoImage = "";
        try {
          const metadata = JSON.parse(op["json_metadata"]);
          if (
            typeof metadata !== "undefined" &&
            typeof metadata.app !== "undefined"
          ) {
            console.log(metadata.app);
            if (metadata.app.includes("leothreads")) {
              appLogoImage = `<img width="15px" src="./assets/leo.png"></img>`;
            }
          }
        } catch (err) {
          // bad json
        }

        document.querySelector("div#content").innerHTML =
          `<div class="op green">Comment: ${appLogoImage}  <b>${op["author"]} => ${op["parent_author"]}</b>  ${appLogoImage} | "${commentBody}" (<a href="https://hive.blog/@${op["author"]}/${op["permlink"]}" target="_blank" rel="noopener noreferrer">link</a>)</div>` +
          currentHTML;
      } else if (opname == "comment") {
        console.log("post", op);
        document.querySelector("div#content").innerHTML =
          `<div class="op green">Post: ${op.title}</div>` + currentHTML;
      } else if (opname == "vote") {
        document.querySelector("div#content").innerHTML =
          `<div class="op green">Vote: ${op.voter} => @${op.author}/${op.permlink}</div>` +
          currentHTML;
      } else {
        document.querySelector("div#content").innerHTML =
          `<div class="op green">${opname}: ${JSON.stringify(op)}</div>` +
          currentHTML;
      }
    });

    // if we succeeded so far, advance to next block
    if (document.querySelector("#blockNum").data == `${parseInt(blockNum)}`) {
      document.querySelector("#blockNum").data = `${parseInt(blockNum) + 1}`;
      document.querySelector("#blockNum").innerText = `${blockNum}`;
      document.querySelector("#currentWitness").innerText = `${block.witness}`;
      document.querySelector("#timestamp").innerText = `${block.timestamp}`;
    }

    if (document.querySelector("button#pause").hidden == true) {
      return;
    }
  });
}

// initialize, read params
var urlParams = new URLSearchParams(window.location.search);
if (urlParams.has("block")) {
  var blockNum = urlParams.get("block");
  var blockNum = parseInt(blockNum);

  if (isNaN(blockNum) || blockNum < 0) {
    getLatestBlocknum();
  } else {
    document.querySelector("#blockNum").innerText = `${blockNum}`;
    document.querySelector("#blockNum").data = `${blockNum}`;
    runLoop();
  }
} else {
  getLatestBlocknum();
}

// repeat every N ms
function runtimeAdjustSpeed() {
  var currentSpeed = 3000 / getSpeedSetting();

  runLoop();

  setTimeout(() => {
    runtimeAdjustSpeed();
  }, currentSpeed);
}

runtimeAdjustSpeed();
