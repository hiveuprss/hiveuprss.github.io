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

// Theme toggle
function updateThemeIcon() {
  const theme = document.documentElement.getAttribute("data-theme") || "dark";
  const icon = document.querySelector("#theme-toggle i");
  icon.className = theme === "light" ? "fas fa-moon" : "fas fa-sun";
}

document.querySelector("#theme-toggle").onclick = () => {
  const current = document.documentElement.getAttribute("data-theme") || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("firehive-theme", next);
  updateThemeIcon();
};

updateThemeIcon();

// Advanced menu (op-type filters)
const menuToggle = document.querySelector("#menu-toggle");
const advancedMenu = document.querySelector("#advanced-menu");
const filterCheckboxes = advancedMenu.querySelectorAll("input[type='checkbox']");

function updateMenuBadge() {
  const anyChecked = Array.from(filterCheckboxes).some((cb) => cb.checked);
  menuToggle.classList.toggle("has-filters", anyChecked);
}

menuToggle.onclick = (e) => {
  e.stopPropagation();
  const opening = advancedMenu.hidden;
  advancedMenu.hidden = !opening;
  menuToggle.classList.toggle("active", opening);
};

document.addEventListener("click", (e) => {
  if (!advancedMenu.hidden && !advancedMenu.contains(e.target) && e.target !== menuToggle) {
    advancedMenu.hidden = true;
    menuToggle.classList.remove("active");
  }
});

filterCheckboxes.forEach((cb) => cb.addEventListener("change", updateMenuBadge));

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
  const minSpeed = 1.0;
  const maxSpeed = 3.0;
  const speedIncrement = 1.0;

  const currentSpeed = getSpeedSetting();
  let newSpeed;
  if (currentSpeed == maxSpeed) {
    newSpeed = minSpeed;
  } else {
    newSpeed = clamp(currentSpeed + speedIncrement, minSpeed, maxSpeed);
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
      node.classList.add("stale");
    });

    const blockSize = block.transactions.length;
    document.querySelector(
      "#blockSize"
    ).innerText = `${blockSize.toLocaleString()} transactions`;

    const hideOpnames = [];
    if (document.querySelector("#flexCheckCustomJSONs").checked) hideOpnames.push("custom_json");
    if (document.querySelector("#flexCheckVotes").checked)       hideOpnames.push("vote");
    if (document.querySelector("#flexCheckMarket").checked)      hideOpnames.push("limit_order_create");
    if (document.querySelector("#flexCheckRewards").checked)     hideOpnames.push("claim_reward_balance");

    block.transactions = block.transactions.filter((tx) => {
      return !hideOpnames.includes(tx.operations[0][0]);
    });

    const content = document.querySelector("#content");

    for (const tx of block.transactions) {
      const op = tx.operations[0][1];
      const opname = tx.operations[0][0];

      const rawJson = escapeHtml(JSON.stringify(op));
      const txMeta = `block:${escapeHtml(tx.block_num)} · tx:${escapeHtml(tx.transaction_id)}`;

      let typeClass = "op-default";
      let typeLabel = opname.replace(/_/g, " ");
      let mainHtml = rawJson;
      let bodyHtml = "";

      if (opname === "comment" && op["parent_author"] !== "") {
        typeClass = "op-reply";
        typeLabel = "reply";
        const link = `<a href="https://hive.blog/@${escapeHtml(op.author)}/${escapeHtml(op.permlink)}" target="_blank" rel="noopener noreferrer">↗</a>`;
        let appBadge = "";
        try {
          const meta = JSON.parse(op["json_metadata"]);
          if (meta && meta.app && meta.app.includes("leothreads")) {
            appBadge = `<img width="12" height="12" src="./assets/leo.png" style="vertical-align:middle;margin-right:4px">`;
          }
        } catch (_) {}
        const commentBody = escapeHtml(op["body"].trim().replaceAll("\n", " ").replaceAll(/<[^>]*>/g, ""));
        mainHtml = `${appBadge}<b>@${escapeHtml(op["author"])}</b> → <b>@${escapeHtml(op["parent_author"])}</b> ${link}`;
        bodyHtml = `<span class="op-body">"${commentBody}"</span>`;

      } else if (opname === "comment") {
        typeClass = "op-post";
        typeLabel = "post";
        const link = `<a href="https://hive.blog/@${escapeHtml(op.author)}/${escapeHtml(op.permlink)}" target="_blank" rel="noopener noreferrer">↗</a>`;
        mainHtml = `<b>@${escapeHtml(op.author)}</b> — ${escapeHtml(op.title) || "(untitled)"} ${link}`;

      } else if (opname === "vote") {
        typeClass = "op-vote";
        typeLabel = "vote";
        const link = `<a href="https://hive.blog/@${escapeHtml(op.author)}/${escapeHtml(op.permlink)}" target="_blank" rel="noopener noreferrer">↗</a>`;
        const weight = op.weight ? ` ${(op.weight / 100).toFixed(0)}%` : "";
        mainHtml = `<b>@${escapeHtml(op.voter)}</b> → <b>@${escapeHtml(op.author)}</b>/${escapeHtml(op.permlink)}${weight} ${link}`;

      } else if (opname === "transfer") {
        typeClass = "op-transfer";
        typeLabel = "transfer";
        mainHtml = `<b>@${escapeHtml(op.from)}</b> → <b>@${escapeHtml(op.to)}</b> <b>${escapeHtml(op.amount)}</b>`;
        if (op.memo) bodyHtml = `<span class="op-body">${escapeHtml(op.memo.slice(0, 120))}</span>`;

      } else if (opname === "custom_json") {
        typeClass = "op-json";
        typeLabel = "json";
        mainHtml = escapeHtml(op.id || "custom_json");

      } else if (opname === "limit_order_create" || opname === "limit_order_cancel") {
        typeClass = "op-market";
        typeLabel = opname === "limit_order_cancel" ? "cancel order" : "order";

      } else if (opname === "claim_reward_balance") {
        typeClass = "op-rewards";
        typeLabel = "rewards";
        mainHtml = `<b>@${escapeHtml(op.account)}</b> claimed ${escapeHtml(op.reward_hive || "")} ${escapeHtml(op.reward_hbd || "")} ${escapeHtml(op.reward_vests || "")}`.trim();
      }

      content.insertAdjacentHTML("afterbegin", /*HTML*/
        `<div class="op ${typeClass}">` +
          `<div class="op-bar"></div>` +
          `<div class="op-inner">` +
            `<span class="op-type">${escapeHtml(typeLabel)}</span>` +
            `<span class="op-main">${mainHtml}</span>` +
            bodyHtml +
            `<span class="op-raw">${rawJson}</span>` +
            `<span class="op-footer">${txMeta}</span>` +
          `</div>` +
        `</div>`
      );

      while (content.children.length > MAX_OP_ENTRIES) {
        content.removeChild(content.lastChild);
      }

    }

    applyFilter(document.querySelector("input#filter").value);

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
  var blockNum = parseInt(urlParams.get("block"));

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
  filter = filter.trim().toLowerCase();

  document.querySelectorAll("div.op").forEach((ele) => {
    ele.hidden = filter !== "" && !ele.innerHTML.toLowerCase().includes(filter);
  });
}

document.querySelector("input#filter").addEventListener("input", (e) => {
  const filter = e.target.value;
  applyFilter(filter);
});
