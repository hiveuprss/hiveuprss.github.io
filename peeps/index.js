// Created by peakd.com/@hivetrending

const width = 800;
const height = 700;

let nodes = [];
let nodeIdCounter = 0;
let isPaused = false;
let simulation;

function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

// Maps op type → hex color
const OP_COLORS = {
  comment:                  '#43aa8b',  // green
  vote:                     '#6c757d',  // gray
  transfer:                 '#f8961e',  // yellow-orange
  custom_json:              '#277da1',  // blue
  claim_reward_balance:     '#90be6d',  // lightgreen
  delegate_vesting_shares:  '#4d908e',  // bluegreen
  account_witness_vote:     '#f3722c',  // orange
  limit_order_create:       '#f9c74f',  // yellow
  limit_order_cancel:       '#e31337',  // red
  transfer_to_vesting:      '#00b4d8',  // cyan
  withdraw_vesting:         '#e76f51',  // deep orange
};

function getColor(opname) {
  return OP_COLORS[opname] || '#9128e7'; // purple fallback
}

// Returns '#ffffff' or '#1a1a2e' depending on perceived luminance of hex color
function textColorFor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? '#1a1a2e' : '#ffffff';
}

// Extract the primary account from any operation
function getAccount(op) {
  const [opname, opdata] = op;
  switch (opname) {
    case 'vote':                    return opdata.voter;
    case 'comment':                 return opdata.author;
    case 'transfer':                return opdata.from;
    case 'custom_json':             return opdata.required_posting_auths[0] || opdata.required_auths[0] || null;
    case 'claim_reward_balance':    return opdata.account;
    case 'delegate_vesting_shares': return opdata.delegator;
    case 'account_witness_vote':    return opdata.account;
    case 'limit_order_create':      return opdata.owner;
    case 'limit_order_cancel':      return opdata.owner;
    case 'transfer_to_vesting':     return opdata.from;
    case 'withdraw_vesting':        return opdata.account;
    default:
      return opdata.account || opdata.voter || opdata.author || opdata.from || null;
  }
}


function updateData(nodes) {
  const svg = d3.select('svg#viz');

  svg.selectAll('g.node')
    .data(nodes, d => d.id)
    .join(
      enter => {
        const g = enter.append('g').attr('class', 'node').attr('opacity', 0);
        g.append('circle')
          .attr('class', 'stroke')
          .attr('fill', d => d.color)
          .attr('r', 0);
        g.append('text')
          .attr('dominant-baseline', 'central')
          .attr('text-anchor', 'middle')
          .style('font-size', '11px')
          .attr('fill', d => d.textColor)
          .text(d => `@${d.account.substring(0, 12)}`);
        g.append('title')
          .text(d => `@${d.account} (${d.opname})`);
        g.transition().duration(600).ease(d3.easeCubicOut)
          .attr('opacity', 1)
          .select('circle').attr('r', d => d.radius);
        return g;
      },
      update => update,
      exit => exit.transition().duration(400).ease(d3.easeCubicIn)
        .attr('opacity', 0)
        .remove()
    );
}

function ticked() {
  d3.select('svg#viz').selectAll('g.node')
    .each(d => {
      d.x = clamp(d.x, d.radius, width - d.radius);
      d.y = clamp(d.y, d.radius, height - d.radius);
    })
    .attr('transform', d => `translate(${d.x},${d.y})`);
}

function createNodes(transactions) {
  const newNodes = transactions.flatMap(tx => {
    const op = tx.operations[0];
    const opname = op[0];
    const account = getAccount(op);
    if (!account) return [];

    const radius = clamp(account.length * 3.5, 18, 42);
    return [{
      id: nodeIdCounter++,
      radius,
      account,
      opname,
      color: getColor(opname),
      textColor: textColorFor(getColor(opname)),
      x: width / 2,
      y: height / 2,
    }];
  });

  // Keep a rolling window of the 25 most recent people
  nodes = [...nodes, ...newNodes].slice(-25);
}

function initSimulation() {
  simulation = d3.forceSimulation([])
    .force('charge', d3.forceManyBody().strength(0.3))
    .force('center', d3.forceCenter(width / 2, height / 2).strength(0.15))
    .force('radial', d3.forceRadial(80, width / 2, height / 2).strength(0.04))
    .force('collision', d3.forceCollide().radius(d => d.radius * 1.15))
    .alphaDecay(0.015)
    .on('tick', ticked);
}

// ── Block number helpers (use dataset, not .data property) ──

function setBlockNum(num) {
  const el = document.querySelector('#blockNum');
  el.dataset.block = `${num}`;
  el.textContent = `${num}`;
}

function getBlockNum() {
  return parseInt(document.querySelector('#blockNum').dataset.block || '0', 10);
}

// ── Button controls ──

document.querySelector('button#gotoblock').onclick = () => {
  const input = prompt('Enter block number:', '');
  const blockNum = parseInt(input, 10);
  if (!isNaN(blockNum) && blockNum > 0) {
    setBlockNum(blockNum);
  } else {
    getLatestBlocknum();
  }
};

document.querySelector('button#pause').onclick = () => {
  isPaused = true;
  document.querySelector('button#pause').hidden = true;
  document.querySelector('button#play').hidden = false;
};

document.querySelector('button#play').onclick = () => {
  isPaused = false;
  document.querySelector('button#play').hidden = true;
  document.querySelector('button#pause').hidden = false;
};

document.querySelector('button#fastforward').onclick = () => {
  const minSpeed = 1, maxSpeed = 3;
  const current = getSpeedSetting();
  const next = current >= maxSpeed ? minSpeed : current + 1;
  const btn = document.querySelector('button#speedgauge');
  btn.dataset.speed = `${next}`;
  btn.textContent = `${next}x`;
};

function getSpeedSetting() {
  return parseFloat(document.querySelector('button#speedgauge').dataset.speed || '1');
}

// ── API ──

hive.api.setOptions({ url: 'https://api.hive.blog' });

function getLatestBlocknum(callback) {
  hive.api.getDynamicGlobalProperties((err, result) => {
    if (err) {
      console.error('getDynamicGlobalProperties error:', err);
      setTimeout(() => getLatestBlocknum(callback), 3000);
      return;
    }
    document.querySelector('#currentWitness').textContent = result.current_witness;
    setBlockNum(result.head_block_number);
    if (callback) callback();
  });
}

function runLoop() {
  if (isPaused) return;

  const blockNum = getBlockNum();
  if (!blockNum) return;

  hive.api.getBlock(blockNum, (err, block) => {
    if (err || !block || !block.transactions) {
      console.error('getBlock error:', err);
      return;
    }

    createNodes(block.transactions);
    updateData(nodes);

    simulation.nodes(nodes);
    simulation.alpha(0.5).restart();

    setBlockNum(blockNum + 1);
    document.querySelector('#currentWitness').textContent = block.witness;
    document.querySelector('#timestamp').textContent = block.timestamp;
  });
}

let countdownEnd = 0;

function startCountdown(ms) {
  countdownEnd = Date.now() + ms;
}

setInterval(() => {
  const remaining = countdownEnd - Date.now();
  const el = document.querySelector('#countdown');
  if (!el) return;
  el.textContent = remaining > 0 ? `${(remaining / 1000).toFixed(1)}s` : '—';
}, 100);

function scheduleLoop() {
  const interval = 3000 / getSpeedSetting();
  runLoop();
  startCountdown(interval);
  setTimeout(scheduleLoop, interval);
}

// ── Init ──

initSimulation();

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('block')) {
  const blockNum = parseInt(urlParams.get('block'), 10);
  if (!isNaN(blockNum) && blockNum > 0) {
    setBlockNum(blockNum);
    scheduleLoop();
  } else {
    getLatestBlocknum(() => scheduleLoop());
  }
} else {
  getLatestBlocknum(() => scheduleLoop());
}
