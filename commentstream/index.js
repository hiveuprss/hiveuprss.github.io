// Created by peakd.com/@hivetrending

// Configuration
const CONFIG = {
  minSpeed: 1.0,
  maxSpeed: 3.0,
  defaultSpeed: 2.0,
  speedIncrement: 1.0,
  baseInterval: 3000,
  commentMaxLength: 100,
  blockOffset: 20,
  maxComments: 100,  // Maximum number of comments to keep in memory
};

// Bots to filter out
const BOT_NAMES = new Set([
  "poshtoken", "pgm-curator", "pizzabot", "beerlover", "pixresteemer",
  "hivebuzz", "ecency", "youarealive", "lolzbot", "thepimpdistrict",
  "luvshares", "bbhbot", "hivebits", "meme.bot", "hiq.smartbot",
  "tipu", "pinmapple", "indiaunited", "cryptobrewmaster", "visualblock",
  "outdoor.life", "india-leo", "wine.bot", "discovery-it", "diyhub",
  "gmfrens", "curation-cartel", "innerblocks", "hiveupme", "qurator",
  "hug.bot", "poshthreads", "redditposh", "hbd.funder", "splinterboost",
  "ladytoken", "hk-gifts", "actifit", "hivegifbot", "heartbeatonhive",
  "hive-lu", "dookbot", "fun.farms", "ai-summaries", "helios-voter",
  "helios-daily", "commentrewarder"
]);

// State management
const state = {
  currentBlockNum: NaN,
  currentSpeed: CONFIG.defaultSpeed,
  isPaused: false,
  loopIntervalId: null,
  appFilters: {
    leo: true,
    ecency: true,
    peakd: true,
    hivesnaps: true,
    waivio: false
  },
  frontendDomain: 'hive.blog'
};

// Initialize Hive API
hive.api.setOptions({ url: "https://api.syncad.com/" });

// Filter management
function initFilters() {
  const savedFilters = localStorage.getItem('hive-app-filters');
  if (savedFilters) {
    try {
      state.appFilters = JSON.parse(savedFilters);
    } catch {
      // Use defaults if saved filters are invalid
    }
  }

  // Set checkbox states
  document.querySelectorAll('.app-filter').forEach(checkbox => {
    const app = checkbox.dataset.app;
    checkbox.checked = state.appFilters[app] ?? true;
  });

  // Listen for filter changes
  document.querySelectorAll('.app-filter').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const app = e.target.dataset.app;
      state.appFilters[app] = e.target.checked;
      localStorage.setItem('hive-app-filters', JSON.stringify(state.appFilters));
      applyFilters();
    });
  });
}

function applyFilters() {
  document.querySelectorAll('.comment').forEach(comment => {
    const classes = Array.from(comment.classList);
    let appClass = classes.find(c =>
      ['leo', 'ecency', 'peakd', 'snapie', 'waivio'].includes(c)
    );

    // Default to visible if no specific app class found
    const isVisible = appClass ? state.appFilters[appClass] : true;
    comment.style.display = isVisible ? 'flex' : 'none';
  });
}

function initFilterMenu() {
  const filterBtn = document.getElementById('filterMenuBtn');
  const filterModal = document.getElementById('filterModal');
  const closeBtn = document.getElementById('closeFilterBtn');

  filterBtn.addEventListener('click', () => {
    filterModal.hidden = false;
  });

  closeBtn.addEventListener('click', () => {
    filterModal.hidden = true;
  });

  filterModal.addEventListener('click', (e) => {
    if (e.target === filterModal) {
      filterModal.hidden = true;
    }
  });
}

// Theme management
function initTheme() {
  const themeToggle = document.getElementById('themeToggle');
  const savedTheme = localStorage.getItem('hive-theme') || 'dark';

  if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
    themeToggle.checked = true;
  }

  themeToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
      document.body.classList.add('light-mode');
      localStorage.setItem('hive-theme', 'light');
    } else {
      document.body.classList.remove('light-mode');
      localStorage.setItem('hive-theme', 'dark');
    }
  });
}

// UI Updates
function setBlockNum(num) {
  state.currentBlockNum = num;
  document.querySelector("#blockNum").innerText = String(num);
}

function setSpeed(speed) {
  state.currentSpeed = speed;
  const speedBtn = document.querySelector("button#speedBtn");
  speedBtn.querySelector("span").innerText = `${speed}x`;

  // Update active state in dropdown
  document.querySelectorAll('.speed-option').forEach(option => {
    if (parseFloat(option.dataset.speed) === speed) {
      option.classList.add('active');
    } else {
      option.classList.remove('active');
    }
  });
}

function togglePausePlay() {
  const btn = document.querySelector("button#pausePlayBtn");
  const icon = btn.querySelector("i");
  const text = btn.querySelector("span");

  state.isPaused = !state.isPaused;

  if (state.isPaused) {
    icon.className = "fas fa-play";
    text.textContent = "Resume";
    clearTimeout(state.loopIntervalId);
  } else {
    icon.className = "fas fa-pause";
    text.textContent = "Pause";
    scheduleNextRun();
  }
}

// Button event listeners
document.querySelector("button#pausePlayBtn").addEventListener('click', togglePausePlay);

document.querySelector("button#gotoblock").addEventListener('click', () => {
  const input = prompt("Enter block number:");
  if (input !== null) {
    const blockNum = parseInt(input);
    if (blockNum && blockNum > 0) {
      setBlockNum(blockNum);
      runLoop();
    } else {
      getLatestBlocknum();
    }
  }
});

// Speed dropdown
function initSpeedDropdown() {
  const speedBtn = document.querySelector("button#speedBtn");
  const speedDropdown = document.getElementById('speedDropdown');

  speedBtn.addEventListener('click', () => {
    speedDropdown.hidden = !speedDropdown.hidden;
  });

  document.querySelectorAll('.speed-option').forEach(option => {
    option.addEventListener('click', () => {
      const speed = parseFloat(option.dataset.speed);
      setSpeed(speed);
      speedDropdown.hidden = true;
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!speedBtn.contains(e.target) && !speedDropdown.contains(e.target)) {
      speedDropdown.hidden = true;
    }
  });
}

// Frontend preference
function initFrontendSelection() {
  const frontendSelect = document.getElementById('frontendSelect');
  const savedFrontend = localStorage.getItem('hive-frontend-domain');

  if (savedFrontend) {
    state.frontendDomain = savedFrontend;
    frontendSelect.value = savedFrontend;
  } else {
    frontendSelect.value = state.frontendDomain;
  }

  frontendSelect.addEventListener('change', (e) => {
    state.frontendDomain = e.target.value;
    localStorage.setItem('hive-frontend-domain', state.frontendDomain);
  });
}

function getCommentLink(author, permlink) {
  return `https://${state.frontendDomain}/@${escapeHtml(author)}/${permlink}`;
}

// Fetch latest block number and start streaming
function getLatestBlocknum() {
  hive.api.getDynamicGlobalProperties((err, result) => {
    if (err) {
      console.error("Failed to get global properties:", err);
      return;
    }

    document.querySelector("#currentWitness").innerText = result.current_witness;
    const blockNum = parseInt(result.head_block_number) - CONFIG.blockOffset;
    setBlockNum(blockNum);
    runLoop();
  });
}

// Escape HTML special characters to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Validate permlink format (alphanumeric and hyphens only)
function isValidPermlink(permlink) {
  return /^[a-z0-9-]+$/.test(permlink);
}

// Prune old comments to prevent memory buildup
function pruneOldComments() {
  const contentDiv = document.querySelector("div#content");
  const comments = contentDiv.querySelectorAll(".comment");

  // Remove oldest comments if we exceed the limit
  if (comments.length > CONFIG.maxComments) {
    const excessCount = comments.length - CONFIG.maxComments;
    for (let i = 0; i < excessCount; i++) {
      comments[comments.length - 1 - i].remove();
    }
  }
}

// Sanitize comment text
function sanitizeComment(text) {
  let sanitized = text.trim()
    .replaceAll(/\n/g, " ")                          // Replace newlines with spaces
    .replaceAll(/<[^>]*>/g, "")                      // Remove HTML tags
    .replaceAll(/&nbsp;/g, " ")                      // Convert HTML entities
    .replaceAll(/&lt;/g, "<")
    .replaceAll(/&gt;/g, ">")
    .replaceAll(/&amp;/g, "&")
    .replaceAll(/&quot;/g, '"')
    .replaceAll(/&#39;/g, "'")
    .replaceAll(/\[([^\]]+)\]\([^\)]*\)/g, "$1")   // Remove markdown links
    .replaceAll(/\*\*([^\*]+)\*\*/g, "$1")          // Remove markdown bold
    .replaceAll(/\*([^\*]+)\*/g, "$1")              // Remove markdown italic
    .replaceAll(/`([^`]+)`/g, "$1")                 // Remove markdown code
    .replaceAll(/_{2,}/g, "_")                      // Remove markdown underline
    .replaceAll(/\s+/g, " ")                        // Collapse multiple spaces
    .trim();

  if (sanitized.length > CONFIG.commentMaxLength) {
    sanitized = sanitized.substring(0, CONFIG.commentMaxLength - 3) + "...";
  }
  return sanitized;
}

// Fetch and display comments for a block
function runLoop() {
  if (state.isPaused) {
    return;
  }

  hive.api.getBlock(state.currentBlockNum, (err, block) => {
    if (err) {
      console.error(`Failed to fetch block ${state.currentBlockNum}:`, err);
      scheduleNextRun();
      return;
    }

    if (!block || !block.transactions) {
      scheduleNextRun();
      return;
    }

    // Filter and process comments
    const comments = block.transactions
      .filter(tx => {
        const [opName, op] = tx.operations[0];
        return opName === "comment" && op.parent_author !== "";
      })
      .filter(tx => !BOT_NAMES.has(tx.operations[0][1].author));

    // Add comments to feed with staggered timing
    const contentDiv = document.querySelector("div#content");
    const blockNum = state.currentBlockNum;
    let hasNewComments = false;

    comments.forEach((tx, index) => {
      // Stagger comment additions with 200ms delay between each
      setTimeout(() => {
        const op = tx.operations[0][1];
        const commentBody = sanitizeComment(op.body);
        const author = escapeHtml(op.author);
        const parentAuthor = escapeHtml(op.parent_author);

        // Validate permlink and construct safe URL
        let linkUrl = `https://${state.frontendDomain}`;
        if (isValidPermlink(op.permlink)) {
          linkUrl = getCommentLink(op.author, op.permlink);
        }

        let appLogo = "";
        let appClass = "green";  // Default color

        try {
          const metadata = JSON.parse(op.json_metadata);
          if (metadata?.app) {
            if (metadata.app.includes("leothreads")) {
              appLogo = '<img width="15px" src="./assets/leo.png" alt="Leo" title="Posted on Leo Threads">';
              appClass = "leo";
            } else if (metadata.app.startsWith("peakd/")) {
              appLogo = '<img width="15px" src="./assets/peakd-16.png" alt="PeakD" title="Posted on PeakD">';
              appClass = "peakd";
            } else if (metadata.app.startsWith("hivesnaps")) {
              appLogo = '<img width="15px" src="./assets/hivesnaps-16.png" alt="Snapie" title="Posted on Snapie">';
              appClass = "snapie";
            } else if (metadata.app.startsWith("ecency")) {
              appLogo = '<img width="15px" src="https://ecency.com/favicon.ico" alt="Ecency" title="Posted on Ecency">';
              appClass = "ecency";
            } else if (metadata.app.startsWith("waivio")) {
              appLogo = '<img width="15px" src="https://www.waivio.com/favicon.ico" alt="Waivio" title="Posted on Waivio">';
              appClass = "waivio";
            }
          }
        } catch {
          // Invalid JSON metadata, skip app logo
        }

        const commentHtml = `
          <div class="comment ${appClass}">
            <div class="comment-header">${appLogo}<b>${author} → ${parentAuthor}</b><span style="font-size: 0.8em; color: var(--hive-text-muted);">#${blockNum}</span></div>
            <div class="comment-body">"${commentBody}" <a href="${escapeHtml(linkUrl)}" target="_blank" rel="noopener noreferrer">→ view</a></div>
          </div>
        `;

        contentDiv.innerHTML = commentHtml + contentDiv.innerHTML;
        hasNewComments = true;
      }, index * 200);  // 200ms delay between each comment
    });

    // Prune old comments if we exceed the limit
    if (hasNewComments) {
      pruneOldComments();
      applyFilters();

      // Smooth scroll to top when new comments are added
      requestAnimationFrame(() => {
        contentDiv.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // Update header info
    setBlockNum(state.currentBlockNum + 1);
    document.querySelector("#currentWitness").innerText = block.witness;
    document.querySelector("#timestamp").innerText = block.timestamp;

    scheduleNextRun();
  });
}

// Schedule the next block fetch
function scheduleNextRun() {
  if (state.isPaused) {
    return;
  }

  const interval = CONFIG.baseInterval / state.currentSpeed;
  state.loopIntervalId = setTimeout(runLoop, interval);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initFilters();
  initFilterMenu();
  initSpeedDropdown();
  initFrontendSelection();
  setSpeed(CONFIG.defaultSpeed);

  // Always get the latest head block number on page load
  getLatestBlocknum();
});
