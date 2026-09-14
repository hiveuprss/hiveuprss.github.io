const BEACON_URL = 'https://beacon.peakd.com/api/nodes';
const PAGE_SIZE = 48;
const FALLBACK_NODES = [
  'https://api.hive.blog',
  'https://api.syncad.com',
  'https://rpc.mahdiyari.info',
  'https://api.c0ff33a.uk',
  'https://hiveapi.actifit.io',
  'https://hive.atexoras.com:2096',
];

const state = {
  nodes: [...FALLBACK_NODES],
  nodeIndex: 0,
  version: null,
  types: [],
  filter: '',
  collection: null,
  instances: [],
  lastId: null,
  hasMore: false,
  holder: '',
  tags: '',
  loading: false,
};

const el = {
  view: document.getElementById('view'),
  status: document.getElementById('status'),
  nodeStatus: document.getElementById('node-status'),
  nodeLabel: document.getElementById('node-label'),
  searchForm: document.getElementById('search-form'),
  searchMode: document.getElementById('search-mode'),
  searchInput: document.getElementById('search-input'),
  themeToggle: document.getElementById('theme-toggle'),
  refreshNodes: document.getElementById('refresh-nodes'),
  tabs: [...document.querySelectorAll('.tab')],
  drawer: document.getElementById('drawer'),
  drawerBackdrop: document.getElementById('drawer-backdrop'),
  drawerTitle: document.getElementById('drawer-title'),
  drawerSub: document.getElementById('drawer-sub'),
  drawerBody: document.getElementById('drawer-body'),
  drawerClose: document.getElementById('drawer-close'),
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function shortId(id) {
  const s = String(id ?? '');
  if (s.length <= 18) return s;
  return `${s.slice(0, 8)}…${s.slice(-6)}`;
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(String(value).endsWith('Z') ? value : `${value}Z`);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function parseData(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function setStatus(message, kind = 'info') {
  if (!message) {
    el.status.hidden = true;
    el.status.textContent = '';
    return;
  }
  el.status.hidden = false;
  el.status.className = `status ${kind}`;
  el.status.textContent = message;
}

function currentNode() {
  return state.nodes[state.nodeIndex] || FALLBACK_NODES[0];
}

function setNodeUi(ok) {
  const host = currentNode().replace(/^https?:\/\//, '');
  el.nodeLabel.textContent = state.version ? `${host} · ${state.version}` : host;
  el.nodeStatus.classList.toggle('ok', ok === true);
  el.nodeStatus.classList.toggle('err', ok === false);
  el.nodeStatus.title = `Using ${currentNode()}`;
}

function apiUrl(path, params = {}) {
  const base = `${currentNode().replace(/\/$/, '')}/nft-tracker-api/`;
  const url = new URL(String(path).replace(/^\//, ''), base);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, String(value));
  }
  return url;
}

async function fetchJson(path, params = {}, { allow404 = false } = {}) {
  let lastError = null;
  const start = state.nodeIndex;

  for (let attempt = 0; attempt < state.nodes.length; attempt += 1) {
    state.nodeIndex = (start + attempt) % state.nodes.length;
    try {
      const res = await fetch(apiUrl(path, params), {
        headers: { Accept: 'application/json' },
      });
      if (res.status === 404 && allow404) {
        setNodeUi(true);
        return null;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${currentNode()}`);
      const data = await res.json();
      setNodeUi(true);
      return data;
    } catch (err) {
      lastError = err;
      setNodeUi(false);
    }
  }

  throw lastError || new Error('All nft_tracker nodes failed');
}

async function discoverNodes() {
  try {
    const res = await fetch(BEACON_URL, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Beacon HTTP ${res.status}`);
    const nodes = await res.json();
    const withNft = nodes
      .filter((n) => Array.isArray(n.features) && n.features.includes('nft_tracker_api'))
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .map((n) => String(n.endpoint || '').replace(/\/$/, ''))
      .filter(Boolean);

    if (withNft.length) {
      state.nodes = [...new Set(withNft)];
      state.nodeIndex = 0;
      return state.nodes;
    }
  } catch {
    // Fall back to known nft_tracker hosts.
  }
  state.nodes = [...FALLBACK_NODES];
  state.nodeIndex = 0;
  return state.nodes;
}

async function probeVersion() {
  const version = await fetchJson('version');
  state.version = typeof version === 'string' ? version : JSON.stringify(version);
  setNodeUi(true);
}

async function loadTypes() {
  const types = await fetchJson('nfts', { count: 1000 });
  state.types = Array.isArray(types) ? types : [];
  return state.types;
}

function filteredTypes() {
  const q = state.filter.trim().toLowerCase();
  if (!q) return state.types;
  return state.types.filter((t) =>
    `${t.symbol} ${t.name} ${t.creator} ${t.owner}`.toLowerCase().includes(q)
  );
}

function parseRoute() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (!parts.length) return { name: 'collections' };
  if (parts[0] === 'nft' && parts[1] && parts[2]) {
    return {
      name: 'collection',
      creator: decodeURIComponent(parts[1]),
      symbol: decodeURIComponent(parts[2]),
    };
  }
  if (parts[0] === 'holder' && parts[1]) {
    return { name: 'holder', account: decodeURIComponent(parts[1]) };
  }
  if (parts[0] === 'tx' && parts[1]) {
    return { name: 'tx', id: decodeURIComponent(parts[1]) };
  }
  return { name: 'collections' };
}

function setTab(name) {
  el.tabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.tab === name);
  });
  el.searchMode.value = name === 'collections' ? 'collections' : name;
  if (name === 'collections') el.searchInput.placeholder = 'Search symbol, name, creator…';
  else if (name === 'holder') el.searchInput.placeholder = 'Hive account name';
  else el.searchInput.placeholder = 'Transaction ID (hex)';
}

function instanceCard(inst, typeMeta = {}) {
  const data = parseData(inst.data);
  const name = data && typeof data === 'object' ? data.name || data.title || '' : '';
  const tags = Array.isArray(inst.tags) ? inst.tags : [];
  return `
    <button class="instance-item" type="button" data-id="${escapeHtml(inst.id)}">
      <div class="title">
        <span class="symbol">${escapeHtml(typeMeta.symbol || inst.symbol || '')}</span>
        <span>${escapeHtml(name || shortId(inst.id))}</span>
      </div>
      <div class="sub">holder @${escapeHtml(inst.holder)} · ${escapeHtml(shortId(inst.id))}</div>
      <div class="chips">
        ${inst.soulbound ? '<span class="chip soulbound">soulbound</span>' : ''}
        ${tags.slice(0, 6).map((t) => `<span class="chip">${escapeHtml(t)}</span>`).join('')}
      </div>
    </button>`;
}

function bindInstanceClicks(instances, typeMeta = {}) {
  el.view.querySelectorAll('.instance-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const inst = instances.find((i) => String(i.id) === btn.dataset.id);
      if (inst) openInstance(inst, typeMeta);
    });
  });
}

function renderCollections() {
  setTab('collections');
  const types = filteredTypes();
  if (!types.length) {
    el.view.innerHTML = '<div class="empty">No NFT collections match.</div>';
    return;
  }

  el.view.innerHTML = `
    <div class="meta-row">
      <span>${types.length} collection${types.length === 1 ? '' : 's'}</span>
      <span>API: <span class="mono">${escapeHtml(state.version || '—')}</span></span>
    </div>
    <div class="collection-list">
      ${types
        .map(
          (t) => `
        <button class="collection-item" type="button"
          data-creator="${escapeHtml(t.creator)}" data-symbol="${escapeHtml(t.symbol)}">
          <div class="title">
            <span class="symbol">${escapeHtml(t.symbol)}</span>
            <span>${escapeHtml(t.name || t.symbol)}</span>
          </div>
          <div class="sub">creator @${escapeHtml(t.creator)} · owner @${escapeHtml(t.owner)} · id ${escapeHtml(t.id)}</div>
          <div class="chips">
            <span class="chip muted">max ${t.max_count == null ? '∞' : escapeHtml(t.max_count)}</span>
            <span class="chip muted">created ${escapeHtml(formatDate(t.created_at))}</span>
            ${(t.authorized_issuers || [])
              .slice(0, 4)
              .map((a) => `<span class="chip">issuer @${escapeHtml(a)}</span>`)
              .join('')}
          </div>
        </button>`
        )
        .join('')}
    </div>`;

  el.view.querySelectorAll('.collection-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      location.hash = `#/nft/${encodeURIComponent(btn.dataset.creator)}/${encodeURIComponent(btn.dataset.symbol)}`;
    });
  });
}

async function loadCollectionInstances({ reset = true } = {}) {
  const { creator, symbol } = state.collection;
  if (reset) {
    state.instances = [];
    state.lastId = null;
    state.hasMore = false;
  }

  const params = {
    count: PAGE_SIZE,
    holder: state.holder || undefined,
    last_id: state.lastId || undefined,
  };

  const path = state.tags
    ? `nfts/${encodeURIComponent(creator)}/${encodeURIComponent(symbol)}/${encodeURIComponent(state.tags)}`
    : `nfts/${encodeURIComponent(creator)}/${encodeURIComponent(symbol)}`;

  const batch = (await fetchJson(path, params, { allow404: true })) || [];
  state.instances = reset ? batch : state.instances.concat(batch);
  state.hasMore = batch.length >= PAGE_SIZE;
  if (batch.length) state.lastId = batch[batch.length - 1].id;
}

function renderCollection() {
  setTab('collections');
  const t = state.collection;
  if (!t) {
    el.view.innerHTML = '<div class="empty">Collection not found.</div>';
    return;
  }

  el.view.innerHTML = `
    <div class="detail-header">
      <div>
        <button class="btn-secondary" id="back-collections" type="button">← Collections</button>
        <h2 style="margin:12px 0 4px">${escapeHtml(t.name || t.symbol)}
          <span class="symbol">${escapeHtml(t.symbol)}</span></h2>
        <div class="sub">@${escapeHtml(t.creator)} / ${escapeHtml(t.symbol)}</div>
      </div>
      <dl class="kv">
        <dt>Owner</dt><dd>@${escapeHtml(t.owner)}</dd>
        <dt>Max supply</dt><dd>${t.max_count == null ? '∞' : escapeHtml(t.max_count)}</dd>
        <dt>Created</dt><dd>${escapeHtml(formatDate(t.created_at))}</dd>
        <dt>Issuers</dt><dd>${
          (t.authorized_issuers || []).map((a) => `@${escapeHtml(a)}`).join(', ') || '—'
        }</dd>
      </dl>
    </div>

    <form id="instance-filters" class="filters">
      <input class="input" name="holder" placeholder="Filter by holder"
        value="${escapeHtml(state.holder)}" spellcheck="false" />
      <input class="input" name="tags" placeholder="Tags pattern (a,b|x)"
        value="${escapeHtml(state.tags)}" spellcheck="false" />
      <button class="btn-primary" type="submit">Filter</button>
    </form>

    <div class="meta-row"><span>${state.instances.length} loaded${state.hasMore ? '+' : ''}</span></div>
    <div class="instance-grid">
      ${
        state.instances.length
          ? state.instances.map((i) => instanceCard(i, t)).join('')
          : '<div class="empty">No instances found for this filter.</div>'
      }
    </div>
    <div class="pager">
      <span class="sub">${state.hasMore ? 'More available' : 'End of results'}</span>
      <button class="btn-secondary" id="load-more" type="button" ${
        state.hasMore ? '' : 'disabled'
      }>Load more</button>
    </div>`;

  document.getElementById('back-collections').addEventListener('click', () => {
    location.hash = '#/';
  });
  document.getElementById('instance-filters').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    state.holder = String(fd.get('holder') || '').trim().toLowerCase();
    state.tags = String(fd.get('tags') || '').trim();
    await withLoading(() => loadCollectionInstances({ reset: true }), 'Filtering…');
    renderCollection();
  });
  document.getElementById('load-more').addEventListener('click', async () => {
    await withLoading(() => loadCollectionInstances({ reset: false }), 'Loading more…');
    renderCollection();
  });
  bindInstanceClicks(state.instances, t);
}

async function renderHolder(account) {
  setTab('holder');
  el.searchInput.value = account;
  el.view.innerHTML = `<div class="empty">Scanning collections for @${escapeHtml(account)}…</div>`;

  const results = [];
  for (const type of state.types) {
    const path = `nfts/${encodeURIComponent(type.creator)}/${encodeURIComponent(type.symbol)}`;
    let lastId = null;
    for (let guard = 0; guard < 20; guard += 1) {
      const batch =
        (await fetchJson(
          path,
          { holder: account, count: PAGE_SIZE, last_id: lastId || undefined },
          { allow404: true }
        )) || [];
      for (const inst of batch) {
        results.push({ ...inst, creator: type.creator, symbol: type.symbol });
      }
      if (batch.length < PAGE_SIZE) break;
      lastId = batch[batch.length - 1].id;
    }
  }

  if (!results.length) {
    el.view.innerHTML = `<div class="empty">No NFTs found for @${escapeHtml(account)}.</div>`;
    return;
  }

  el.view.innerHTML = `
    <div class="meta-row">
      <span>${results.length} NFT${results.length === 1 ? '' : 's'} held by @${escapeHtml(account)}</span>
    </div>
    <div class="instance-grid">${results.map((i) => instanceCard(i, i)).join('')}</div>`;
  bindInstanceClicks(results);
}

async function renderTx(txId) {
  setTab('tx');
  el.searchInput.value = txId;

  const [instances, results] = await Promise.all([
    fetchJson(`nfts/by-trx/${encodeURIComponent(txId)}`, { count: 1000 }, { allow404: true }),
    fetchJson(`trx/${encodeURIComponent(txId)}/results`, { count: 1000 }, { allow404: true }),
  ]);

  const list = Array.isArray(instances) ? instances : [];
  const ops = Array.isArray(results) ? results : [];

  if (!list.length && !ops.length) {
    el.view.innerHTML = `<div class="empty">No NFT tracker data for transaction ${escapeHtml(txId)}.</div>`;
    return;
  }

  el.view.innerHTML = `
    <div class="detail-header">
      <div>
        <h2 style="margin:0 0 4px">Transaction</h2>
        <div class="mono">${escapeHtml(txId)}</div>
      </div>
    </div>

    <h3>Operation results (${ops.length})</h3>
    <div class="collection-list" style="margin-bottom:18px">
      ${
        ops.length
          ? ops
              .map(
                (op) => `
        <div class="collection-item" style="cursor:default">
          <div class="title">
            <span class="symbol">${escapeHtml(op.action)}</span>
            <span>${escapeHtml(op.symbol || '')}</span>
            ${
              op.success
                ? '<span class="chip ok">success</span>'
                : '<span class="chip soulbound">failed</span>'
            }
          </div>
          <div class="sub">account ${
            op.account ? `@${escapeHtml(op.account)}` : '—'
          } · ${escapeHtml(formatDate(op.created_at))}</div>
          ${op.error_message ? `<div class="sub">${escapeHtml(op.error_message)}</div>` : ''}
        </div>`
              )
              .join('')
          : '<div class="empty">No operation results.</div>'
      }
    </div>

    <h3>NFT instances (${list.length})</h3>
    <div class="instance-grid">
      ${
        list.length
          ? list.map((i) => instanceCard(i, i)).join('')
          : '<div class="empty">No instances linked to this transaction.</div>'
      }
    </div>`;
  bindInstanceClicks(list);
}

function openInstance(inst, typeMeta = {}) {
  const data = parseData(inst.data);
  const pretty =
    data && typeof data === 'object' ? JSON.stringify(data, null, 2) : String(inst.data ?? '');
  const title =
    data && typeof data === 'object' && (data.name || data.title)
      ? data.name || data.title
      : shortId(inst.id);

  el.drawerTitle.textContent = title;
  el.drawerSub.textContent = `${typeMeta.creator || inst.creator || ''}/${
    typeMeta.symbol || inst.symbol || ''
  } · ${inst.id}`;
  el.drawerBody.innerHTML = `
    <dl class="kv" style="margin-bottom:16px">
      <dt>Holder</dt><dd>@${escapeHtml(inst.holder)}</dd>
      <dt>Soulbound</dt><dd>${inst.soulbound ? 'yes' : 'no'}</dd>
      <dt>Created</dt><dd>${escapeHtml(formatDate(inst.created_at))}</dd>
      <dt>Updated</dt><dd>${escapeHtml(formatDate(inst.updated_at))}</dd>
      <dt>Tags</dt><dd>${(inst.tags || []).map((t) => escapeHtml(t)).join(', ') || '—'}</dd>
      <dt>ID</dt><dd class="mono">${escapeHtml(inst.id)}</dd>
    </dl>
    <h3 style="margin:0 0 8px;font-size:0.95rem">Metadata</h3>
    <pre class="pre">${escapeHtml(pretty || '—')}</pre>`;

  el.drawer.classList.add('open');
  el.drawer.setAttribute('aria-hidden', 'false');
  el.drawerBackdrop.hidden = false;
  el.drawerBackdrop.classList.add('open');
}

function closeDrawer() {
  el.drawer.classList.remove('open');
  el.drawer.setAttribute('aria-hidden', 'true');
  el.drawerBackdrop.classList.remove('open');
  el.drawerBackdrop.hidden = true;
}

async function withLoading(fn, message = 'Loading…') {
  if (state.loading) return;
  state.loading = true;
  setStatus(message, 'info');
  try {
    await fn();
    setStatus('');
  } catch (err) {
    setStatus(err.message || String(err), 'error');
    throw err;
  } finally {
    state.loading = false;
  }
}

async function route() {
  const r = parseRoute();
  closeDrawer();

  if (r.name === 'collections') {
    if (el.searchMode.value === 'collections') {
      state.filter = el.searchInput.value.trim();
    }
    renderCollections();
    return;
  }

  if (r.name === 'collection') {
    state.collection =
      state.types.find((t) => t.creator === r.creator && t.symbol === r.symbol) || {
        creator: r.creator,
        symbol: r.symbol,
        name: r.symbol,
        owner: r.creator,
        authorized_issuers: [],
        max_count: null,
        created_at: null,
      };
    state.holder = '';
    state.tags = '';
    await withLoading(
      () => loadCollectionInstances({ reset: true }),
      `Loading ${r.creator}/${r.symbol}…`
    );
    renderCollection();
    return;
  }

  if (r.name === 'holder') {
    await withLoading(() => renderHolder(r.account.toLowerCase()), `Looking up @${r.account}…`);
    return;
  }

  if (r.name === 'tx') {
    await withLoading(() => renderTx(r.id), 'Looking up transaction…');
  }
}

function onSearchSubmit(e) {
  e.preventDefault();
  const mode = el.searchMode.value;
  const value = el.searchInput.value.trim();

  if (mode === 'collections') {
    state.filter = value;
    location.hash = '#/';
    renderCollections();
    return;
  }
  if (mode === 'holder') {
    if (!value) return;
    location.hash = `#/holder/${encodeURIComponent(value.replace(/^@/, '').toLowerCase())}`;
    return;
  }
  if (mode === 'tx' && value) {
    location.hash = `#/tx/${encodeURIComponent(value.toLowerCase())}`;
  }
}

function initThemeToggle() {
  el.themeToggle.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('nftexplorer-theme', next);
  });
}

function initTabs() {
  el.tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const name = tab.dataset.tab;
      if (name === 'collections') {
        location.hash = '#/';
        return;
      }
      if (name === 'holder') {
        setTab('holder');
        el.view.innerHTML =
          '<div class="empty">Enter a Hive account above to list its HAF NFTs.</div>';
        return;
      }
      if (name === 'tx') {
        setTab('tx');
        el.view.innerHTML =
          '<div class="empty">Paste a transaction ID to inspect nft_tracker results.</div>';
      }
    });
  });
}

async function boot() {
  initThemeToggle();
  initTabs();
  el.searchForm.addEventListener('submit', onSearchSubmit);
  el.searchMode.addEventListener('change', () => {
    setTab(el.searchMode.value === 'collections' ? 'collections' : el.searchMode.value);
  });
  el.drawerClose.addEventListener('click', closeDrawer);
  el.drawerBackdrop.addEventListener('click', closeDrawer);
  el.refreshNodes.addEventListener('click', async () => {
    await withLoading(async () => {
      await discoverNodes();
      await probeVersion();
      await loadTypes();
      await route();
    }, 'Rediscovering nft_tracker nodes…');
  });
  window.addEventListener('hashchange', () => {
    route().catch(() => {});
  });

  await withLoading(async () => {
    await discoverNodes();
    await probeVersion();
    await loadTypes();
    await route();
  }, 'Discovering nft_tracker nodes…');
}

boot().catch((err) => {
  setStatus(err.message || String(err), 'error');
});
