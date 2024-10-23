// Created by peakd.com/@hivetrending
hive.api.setOptions({ url: "https://api.deathwing.me/" });

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
  var minSpeed = 1.0;
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
    document.querySelector("button#speedgauge").data = "1.0";
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
  });
}

function runLoop() {
  if (document.querySelector("button#pause").hidden == true) {
    return;
  }

  var blockNum = document.querySelector("#blockNum").data;
  if (!blockNum) {
    console.log("Failed to find block");
    return;
  }

  const blockRangeSize = 20;

  // console.log(`{ starting_block_num: ${blockNum}, count: ${blockRangeSize} }`)

  hive.api.call(
    "block_api.get_block_range",
    { starting_block_num: blockNum, count: blockRangeSize },
    async function (err, result) {
      if (err) {
        console.log(err);
        return;
      }

      if (result.blocks.length == 0) {
        return;
      }

      for (const block of result.blocks) {
        // check if the block looks okay
        if (!block || !block.transactions) {
          return;
        }

        document.querySelectorAll("div.transfer").forEach((node) => {
          node.className = "transfer gray";
        });

        for (const tx of block.transactions) {
          var op = tx.operations[0];
          var opname = tx.operations[0].type;

          if (
            ![
              "account_create_operation",
              "create_claimed_account_operation",
            ].includes(opname)
          ) {
            continue;
          }

          if (
            filterByCreator &&
            tx.operations[0].value.creator !== filterByCreator
          ) {
            continue;
          }

          const color = "lightgreen";

          op["to"] = op.value.new_account_name;
          op["from"] = op.value.creator;
          op["amount"] = op.value.fee ? op.value.fee.amount / 1000 : 0.0;

          const timestamp = new Date(block.timestamp).toLocaleString();

          var currentHTML = document.querySelector("div#content").innerHTML;
          document.querySelector("div#content").innerHTML =
            `<div class="transfer ${color}">[${timestamp} UTC] <span class="bold"><a href="https://peakd.com/@${op.from}">@${op.from}</a></span> created <span class="bold"><a href="https://peakd.com/@${op.to}">@${op.to}</a></span> ( ${op["amount"]} $Hive fee )</div>` +
            currentHTML;

          console.log('block_id', block.block_id);
        }
      }

      // if we succeeded so far with this block, advance to next block range
      const newBlockNum = parseInt(blockNum) + result.blocks.length;
      document.querySelector("#blockNum").data = `${newBlockNum}`;
      document.querySelector("#blockNum").innerText = `${newBlockNum}`;
    }
  );
}

// initialize, read params
var urlParams = new URLSearchParams(window.location.search);
if (urlParams.has("block")) {
  var blockNum = parseInt(urlParams.get("block"));

  if (isNaN(blockNum) || blockNum < 0) {
    getLatestBlocknum();
  } else {
    document.querySelector("#blockNum").innerText = `${blockNum}`;
    document.querySelector("#blockNum").data = `${blockNum}`;
  }
} else {
  getLatestBlocknum();
}

var filterByCreator;
if (urlParams.has("creator")) {
  filterByCreator = urlParams.get("creator");
}

// repeat every N ms
function runtimeAdjustSpeed() {
  var currentSpeed = 3000 / getSpeedSetting();

  runLoop();

  setTimeout(() => {
    runtimeAdjustSpeed();
  }, currentSpeed);
}

(runtimeAdjustSpeed());
