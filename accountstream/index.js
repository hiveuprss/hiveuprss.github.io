// Created by peakd.com/@hivetrending

hive.api.setOptions({ url: "https://api.deathwing.me/" });

var speed = 3000;
var width = 800,
  height = 700;

var color = "gray";

function clamp(num, min, max) {
  return num <= min ? min : num >= max ? max : num;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// Start button controls

document.querySelector("button#gotoblock").onclick = (e) => {
  var blockNum = prompt(
    "Enter block number:",
    document.querySelector("#blockNum").innerText
  );

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
  var minSpeed = 3.0;
  var maxSpeed = 10.0;
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
    document.querySelector("button#speedgauge").data = "3.0";
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

    var blockNum = parseInt(result.head_block_number) - 2_000;
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
  const blockRangeSize = 40;

  hive.api.call(
    "block_api.get_block_range",
    { starting_block_num: blockNum, count:blockRangeSize  },
    async function (err, result) {

      //console.log(err, result);
      //console.log(blockNum)
      if (err) {
        console.log(err);
        return;
      }

      if (result.blocks.length < blockRangeSize) {
      }

      for (const block of result.blocks) {
        // check if the block looks okay
        if (!block || !block.transactions) {
          return;
        }

        block.transactions = block.transactions.filter((tx) => {

          var opname = tx.operations[0].type;

          // filter for account creation only
          if (["account_create_operation","create_claimed_account_operation"].includes(opname)) {
            return true;
          }
          return false;
        });

        block.transactions.forEach((tx) => {
          console.log(tx.operations[0][1]);
        });

        document.querySelectorAll("div.transfer").forEach((node) => {
          node.className = "transfer gray";
        });

        block.transactions.forEach((tx) => {
          var op = tx.operations[0];
          var opname = tx.operations[0].type;
          console.log(op);

          var color = "green";
          color = "lightgreen";

          console.log(op.value);

          op["to"] = op.value.new_account_name;
          op["from"] = op.value.creator;
          op["amount"] = op.value.fee ? op.value.fee.amount/1000 : 0.000;

          var currentHTML = document.querySelector("div#content").innerHTML;
          document.querySelector("div#content").innerHTML =
            `<div class="transfer ${color}">${op["from"]} => ${op["to"]} ( ${op["amount"]} $Hive fee )</div>` +
            currentHTML;
        });
      }

      const lastBlock = result.blocks[result.blocks.length - 1];
      if (!lastBlock || !lastBlock.transactions) {
        return;
      }

      // if we succeeded so far, advance to next block
      console.log(parseInt(blockNum) + result.blocks.length);
      if (document.querySelector("#blockNum").data == `${parseInt(blockNum)}`) {
        document.querySelector("#blockNum").data = `${parseInt(blockNum) + result.blocks.length}`;
        document.querySelector("#blockNum").innerText = `${blockNum}`;
      }

      if (document.querySelector("button#pause").hidden == true) {
        return;
      }
    }
  );
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
