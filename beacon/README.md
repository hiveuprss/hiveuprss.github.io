# Hive Node Beacon

Static, LLM-friendly health snapshot of public **Hive** and **Hive Engine** JSON-RPC nodes.

This is not a PeakD/Beacon SPA. Agents can `curl` or WebFetch the files below — no browser required.

## Fetch URLs

After publish on GitHub Pages:

| file | url |
| --- | --- |
| JSON | https://hiveuprss.github.io/beacon/nodes.json |
| Markdown | https://hiveuprss.github.io/beacon/nodes.md |
| This README | https://hiveuprss.github.io/beacon/README.md |
| Landing | https://hiveuprss.github.io/beacon/ |

```bash
curl -fsSL https://hiveuprss.github.io/beacon/nodes.json
```

## Recommended defaults

Use `recommend.hive` and `recommend.engine` from the latest snapshot. Those are the fastest currently healthy endpoints (`ok: true`, lowest `ms`).

If `recommend.*` is `null`, walk the matching array and take the first `ok: true` row. Keep a short local fallback list (for example `https://api.hive.blog` and `https://herpc.actifit.io`) if the snapshot itself is unreachable.

Lists are already sorted: healthy first, then ascending `ms`.

## Schema (`schema: 1`)

```json
{
  "schema": 1,
  "checked_at": "2026-09-20T00:00:00.000Z",
  "source": "hiveuprss.github.io/beacon",
  "recommend": {
    "hive": "https://api.hive.blog",
    "engine": "https://herpc.actifit.io"
  },
  "hive": [
    {
      "url": "https://api.hive.blog",
      "ok": true,
      "ms": 123,
      "head": 110063140,
      "err": null
    }
  ],
  "engine": [
    {
      "url": "https://herpc.actifit.io",
      "ok": true,
      "ms": 200,
      "head": 63003768,
      "hive_ref": 110063137,
      "err": null
    }
  ]
}
```

| field | meaning |
| --- | --- |
| `schema` | Snapshot format version. This document describes `1`. |
| `checked_at` | Probe time, ISO-8601 UTC. |
| `source` | Publisher id. |
| `recommend.hive` | Best healthy Hive RPC, or `null`. |
| `recommend.engine` | Best healthy Hive Engine RPC, or `null`. |
| `url` | Seed endpoint that was POSTed. |
| `ok` | `true` when the RPC returned a usable head block. |
| `ms` | Elapsed milliseconds for that attempt (including failures). |
| `head` | Hive: `head_block_number`. Engine: `blockNumber`. `null` if not ok. |
| `hive_ref` | Engine only: `refHiveBlockNumber` (legacy `refSteemBlockNumber` accepted). |
| `err` | Short error string, or `null` when `ok`. |

Failed rows stay in the arrays so agents can see why a seed was skipped.

## How nodes are probed

Seed list: [`scripts/seeds.json`](./scripts/seeds.json)

- **Hive:** `POST` `condenser_api.get_dynamic_global_properties` with `params: []`. Success requires `result.head_block_number`.
- **Hive Engine:** `POST` `blockchain.getLatestBlockInfo` with `params: {}`. Success requires `result.blockNumber`. HTTP redirects keep the POST body (so a 301 to a trailing slash still works).

Timeout is 8s per URL. Probes run concurrently.

## Refresh

GitHub Actions (`.github/workflows/beacon.yml`) runs the probe about every **20 minutes** and on `workflow_dispatch`. It commits `nodes.json` + `nodes.md` to `master` only when the snapshot content changes.

Local refresh:

```bash
node beacon/scripts/probe.mjs
```

Requires Node 18+ (built-in `fetch`). No packages to install.
