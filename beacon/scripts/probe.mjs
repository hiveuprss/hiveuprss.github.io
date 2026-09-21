#!/usr/bin/env node
/**
 * Probe public Hive + Hive Engine RPCs and write beacon/nodes.json + nodes.md.
 * No npm dependencies. Node 18+ (built-in fetch).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BEACON_DIR = join(__dirname, "..");
const SEEDS = JSON.parse(readFileSync(join(__dirname, "seeds.json"), "utf8"));

const TIMEOUT_MS = 8000;
const CONCURRENCY = 8;
const MAX_REDIRECTS = 5;
const SOURCE = "hiveuprss.github.io/beacon";
const USER_AGENT = "hiveuprss-beacon/1 (+https://hiveuprss.github.io/beacon/)";

function sortNodes(a, b) {
  if (a.ok !== b.ok) return a.ok ? -1 : 1;
  return (a.ms ?? Infinity) - (b.ms ?? Infinity);
}

function shortErr(value) {
  return String(value ?? "error").replace(/\s+/g, " ").slice(0, 120);
}

async function postJson(url, body, hops = 0) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify(body),
      redirect: "manual",
      signal: controller.signal,
    });

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get("location");
      if (!loc) {
        return { ok: false, ms: Date.now() - started, json: null, err: `http ${res.status} (no location)` };
      }
      if (hops >= MAX_REDIRECTS) {
        return { ok: false, ms: Date.now() - started, json: null, err: "too many redirects" };
      }
      // Preserve POST + JSON body. Fetch's automatic follow converts 301/302 to GET.
      return postJson(new URL(loc, url).toString(), body, hops + 1);
    }

    const ms = Date.now() - started;
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }

    if (!res.ok) {
      return { ok: false, ms, json, err: `http ${res.status}` };
    }
    if (!json || typeof json !== "object") {
      return { ok: false, ms, json: null, err: "invalid json" };
    }
    if (json.error) {
      const msg = json.error.message || JSON.stringify(json.error);
      return { ok: false, ms, json, err: shortErr(msg) };
    }
    return { ok: true, ms, json, err: null };
  } catch (err) {
    const ms = Date.now() - started;
    let name;
    if (err?.name === "AbortError") name = "timeout";
    else if (err?.cause?.code) name = err.cause.code;
    else if (err?.cause?.message) name = err.cause.message;
    else name = err?.message || String(err);
    return { ok: false, ms, json: null, err: shortErr(name) };
  } finally {
    clearTimeout(timer);
  }
}

async function probeHive(url) {
  const r = await postJson(url, {
    jsonrpc: "2.0",
    method: "condenser_api.get_dynamic_global_properties",
    params: [],
    id: 1,
  });
  const head = r.json?.result?.head_block_number;
  const ok = Boolean(r.ok && Number.isFinite(head));
  return {
    url,
    ok,
    ms: r.ms,
    head: ok ? head : null,
    err: ok ? null : r.err || "missing head_block_number",
  };
}

async function probeEngine(url) {
  const r = await postJson(url, {
    jsonrpc: "2.0",
    method: "blockchain.getLatestBlockInfo",
    params: {},
    id: 1,
  });
  const result = r.json?.result;
  const head = result?.blockNumber;
  const rawRef = result?.refHiveBlockNumber ?? result?.refSteemBlockNumber;
  const hive_ref = Number.isFinite(rawRef) ? rawRef : null;
  const ok = Boolean(r.ok && Number.isFinite(head));
  return {
    url,
    ok,
    ms: r.ms,
    head: ok ? head : null,
    hive_ref,
    err: ok ? null : r.err || "missing blockNumber",
  };
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  }
  const n = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: n }, worker));
  return out;
}

function cell(value) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value).replace(/\|/g, "\\|");
}

function mdTable(rows, columns) {
  const header = `| ${columns.map((c) => c.label).join(" | ")} |`;
  const sep = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows
    .map((row) => `| ${columns.map((c) => cell(c.value(row))).join(" | ")} |`)
    .join("\n");
  return `${header}\n${sep}\n${body}`;
}

function toMarkdown(snapshot) {
  const rec = snapshot.recommend;
  return `# Hive Node Beacon

Checked at **${snapshot.checked_at}**  
Source: \`${snapshot.source}\`  
Schema: \`${snapshot.schema}\`

Machine-readable copy: [nodes.json](./nodes.json)

## Recommend

| chain | url |
| --- | --- |
| hive | ${cell(rec.hive)} |
| engine | ${cell(rec.engine)} |

Healthy nodes are listed first, then by ascending \`ms\`.

## Hive

${mdTable(snapshot.hive, [
    { label: "ok", value: (r) => r.ok },
    { label: "ms", value: (r) => r.ms },
    { label: "head", value: (r) => r.head },
    { label: "url", value: (r) => r.url },
    { label: "err", value: (r) => r.err },
  ])}

## Hive Engine

${mdTable(snapshot.engine, [
    { label: "ok", value: (r) => r.ok },
    { label: "ms", value: (r) => r.ms },
    { label: "head", value: (r) => r.head },
    { label: "hive_ref", value: (r) => r.hive_ref },
    { label: "url", value: (r) => r.url },
    { label: "err", value: (r) => r.err },
  ])}
`;
}

async function main() {
  const checked_at = new Date().toISOString();
  const [hive, engine] = await Promise.all([
    mapLimit(SEEDS.hive, CONCURRENCY, probeHive),
    mapLimit(SEEDS.engine, CONCURRENCY, probeEngine),
  ]);

  hive.sort(sortNodes);
  engine.sort(sortNodes);

  const snapshot = {
    schema: 1,
    checked_at,
    source: SOURCE,
    recommend: {
      hive: hive.find((n) => n.ok)?.url ?? null,
      engine: engine.find((n) => n.ok)?.url ?? null,
    },
    hive,
    engine,
  };

  writeFileSync(join(BEACON_DIR, "nodes.json"), `${JSON.stringify(snapshot, null, 2)}\n`);
  writeFileSync(join(BEACON_DIR, "nodes.md"), toMarkdown(snapshot));

  const hiveOk = hive.filter((n) => n.ok).length;
  const engineOk = engine.filter((n) => n.ok).length;
  console.log(`checked_at ${checked_at}`);
  console.log(`recommend hive=${snapshot.recommend.hive}`);
  console.log(`recommend engine=${snapshot.recommend.engine}`);
  console.log(`hive ${hiveOk}/${hive.length} ok`);
  console.log(`engine ${engineOk}/${engine.length} ok`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
