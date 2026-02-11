// Created by peakd.com/@hivetrending

hive.api.setOptions({
  url: "https://api.deathwing.me/",
  alternative_api_endpoints: [
    "https://api.hive.blog/",
    "https://api.openhive.network/",
    "https://techcoderx.com/",
    "https://api.c0ff33a.uk/",
    "https://hive-api.3speak.tv/",
  ],
});

function clamp(num, min, max) {
  return num <= min ? min : num >= max ? max : num;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const MAX_OP_ENTRIES = 200;

// Start button controls

document.querySelector("button#gotoblock").onclick = (e) => {
  var blockNum = prompt("Enter block number:", `${document.querySelector("#blockNum").data}`);

  // sanitize
  blockNum = parseInt(blockNum) - 1;

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

document.querySelector("button#backward").onclick = (e) => {
  var blockNum = parseInt(document.querySelector("#blockNum").data);
  var newBlock = Math.max(1, blockNum - 10);
  document.querySelector("#blockNum").data = `${newBlock}`;
  document.querySelector("#blockNum").innerText = `${newBlock}`;
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

  hive.api.getBlock(blockNum, function (err, result) {
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

    for (const tx of block.transactions) {
      const op = tx.operations[0][1];
      const opname = tx.operations[0][0];

      const txFooter = /*HTML*/ `<span>block: ${escapeHtml(tx.block_num)} | tx id: ${escapeHtml(tx.transaction_id)}</span>`;

      const sanitizedOpStr = escapeHtml(JSON.stringify(op));

      const content = document.querySelector("div#content");

      if (opname == "comment" && op["parent_author"] != "") {
        var commentBody = op["body"].trim();
        commentBody = commentBody.replaceAll("\n", "");
        commentBody = escapeHtml(commentBody.replaceAll(/<[^>]*>/g, ""));

        var appLogoImage = "";
        try {
          const metadata = JSON.parse(op["json_metadata"]);
          if (
            typeof metadata !== "undefined" &&
            typeof metadata.app !== "undefined"
          ) {
            if (metadata.app.includes("leothreads")) {
              appLogoImage = /*HTML*/ `<img width="15px" src="./assets/leo.png">`;
            }
          }
        } catch (err) {
          // bad json
        }
        const link = /*HTML*/ `<a href="https://hive.blog/@${escapeHtml(op.author)}/${escapeHtml(op.permlink)}" target="_blank" rel="noopener noreferrer">link</a>`;
        content.insertAdjacentHTML("afterbegin",
          /*HTML*/ `<div class="op green">Comment: ${appLogoImage}  <b>${escapeHtml(op["author"])} =&gt; ${escapeHtml(op["parent_author"])}</b>  ${appLogoImage} | &ldquo;${commentBody}&rdquo; (${link})<br/>${sanitizedOpStr}<br/>${txFooter}</div>`);
      } else if (opname == "comment") {
        const link = /*HTML*/ `<a href="https://hive.blog/@${escapeHtml(op.author)}/${escapeHtml(op.permlink)}" target="_blank" rel="noopener noreferrer">link</a>`;

        content.insertAdjacentHTML("afterbegin",
          /*HTML*/ `<div class="op green">Post: ${escapeHtml(op.title)} by ${escapeHtml(op.author)} (${link})<br/>${sanitizedOpStr}<br/>${txFooter}</div>`);
      } else if (opname == "vote") {
        const link = /*HTML*/ `<a href="https://hive.blog/@${escapeHtml(op.author)}/${escapeHtml(op.permlink)}" target="_blank" rel="noopener noreferrer">link</a>`;

        content.insertAdjacentHTML("afterbegin",
          /*HTML*/ `<div class="op green">Vote: ${escapeHtml(op.voter)} =&gt; @${escapeHtml(op.author)}/${escapeHtml(op.permlink)} (${link})<br/>${sanitizedOpStr}<br/>${txFooter}</div>`);
      } else {
        const formattedOpname =
          opname.substr(0, 1).toUpperCase() +
          opname.substr(1, opname.length - 1);
        content.insertAdjacentHTML("afterbegin",
          /*HTML*/ `<div class="op green">${escapeHtml(formattedOpname)}: ${sanitizedOpStr}<br/>${txFooter}</div>`);
      }

      while (content.children.length > MAX_OP_ENTRIES) {
        content.removeChild(content.lastChild);
      }

      applyFilter(document.querySelector("textarea#filter").value);
    }

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

function applyFilter(filter) {
  if (!filter) {
    return;
  }

  filter = filter.trim().toLowerCase();

  Array.from(document.querySelectorAll("div.op")).map((ele) => {
    if (!ele.innerHTML.toLowerCase().includes(filter)) {
      ele.hidden = true;
    } else {
      ele.hidden = false;
    }
  });
}

document.querySelector("textarea#filter").addEventListener("input", (e) => {
  const filter = e.target.value;
  applyFilter(filter);
});
