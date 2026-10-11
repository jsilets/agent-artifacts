# agent-artifacts

agent-artifacts lets coding agents make HTML pages that explain things with pictures, and keeps those pages on your own Cloudflare account. It works like Claude artifacts: each page has versions, a library lists every page, and a share link opens one page with no login.

The repo has four parts:

| Folder | What it holds |
|---|---|
| `skills/explain/` | The `explain` skill. It tells an agent how to choose the content of a page, which figure to use for each claim, and how to write the words. |
| `kit/` | `explain.css` and `explain.js`: the look and the runtime that every page shares. |
| `cli/` | `agent-artifacts`: `new`, `check`, `pack`, `serve` and `publish`. Node 18 or later, no dependencies. |
| `host/` | A Cloudflare Worker: the library, the viewer, the API and the share links. |

## Install the skill and the CLI

1. Link the skill into your agent's skill folder:
   ```bash
   ln -s "$PWD/skills/explain" ~/.claude/skills/explain
   ln -s "$PWD/skills/explain" ~/.codex/skills/explain
   ```
2. Put the CLI on your `PATH`:
   ```bash
   ln -s "$PWD/cli/agent-artifacts.mjs" ~/.local/bin/agent-artifacts
   ```
3. Try it:
   ```bash
   agent-artifacts check skills/explain/examples/gallery.html
   ```

Without a host, the skill still works. Pages go to `~/.agent/explain/<repo>/`, and the agent shows them inline or in a local preview.

## How the host works

- R2 stores the HTML of each version at `pages/<group>/<name>/<version>.html`. D1 stores the page list, the versions and the share links.
- The viewer shows each page in an `<iframe>` with the `sandbox` attribute. The page HTML comes from a route that sends `Content-Security-Policy: sandbox`. So the script in a page runs with no origin, and it cannot read the host's cookies or call its API.
- Cloudflare Access protects the whole hostname. A person signs in with Access. The CLI sends an Access service token.
- The Worker checks the Access JWT on each request too. Access at the edge is the first check, and the Worker is the second.
- A second Access application bypasses Access for `/s/*`. On that path the Worker checks only the share token, which is 32 random bytes.

| Route | Auth | Does |
|---|---|---|
| `GET /` | Access | The library, grouped by repo |
| `GET /p/<group>/<name>` | Access | The viewer for the latest version |
| `GET /p/<group>/<name>/v/<n>` | Access | The viewer for one version |
| `GET /raw/<group>/<name>/<n>` | Access | The page HTML, with the sandbox CSP |
| `GET /api/pages` | Access | The page list as JSON |
| `PUT /api/pages/<group>/<name>` | Access | Store a new version. The body is the HTML. |
| `DELETE /api/pages/<group>/<name>` | Access | Delete the page, its versions and its share links |
| `GET`, `POST /api/pages/<group>/<name>/shares` | Access | List or make share links. POST body: `{ "version": n }` or `{ "version": "latest" }` |
| `DELETE /api/shares/<token>` | Access | Revoke a share link |
| `GET /s/<token>` | Token | The shared page |

## Deploy the host

You need a Cloudflare account, a zone for the hostname, and Cloudflare Zero Trust (the free plan is enough). The host uses the `cf` CLI and Bun.

1. Install and test:
   ```bash
   cd host
   bun install
   bun run test
   ```
2. Copy `deploy.example.json` to `deploy.local.json`, and set `hostname` and `accessTeam`. Leave `accessAud` empty for now. Git ignores `deploy.local.json`.
3. Create the storage and apply the migration:
   ```bash
   cf auth whoami                       # confirm the account
   cf d1 create --name agent-artifacts
   cf r2 buckets create --name agent-artifacts
   bunx cf d1 migrations apply <database id> --dir migrations
   ```
4. Build and deploy:
   ```bash
   bunx vite build --mode production
   bunx cf deploy --prebuilt --mode production
   ```
   With no `accessAud`, the Worker refuses every request except share links.
5. In Cloudflare Zero Trust:
   - Make a service token for the CLI.
   - Make a self-hosted application for the hostname. Give it an Allow policy for your email and a Service Auth policy for the token.
   - Make a second self-hosted application for `<hostname>/s/*` with a Bypass policy for everyone.
6. Put the AUD tag of the first application in `deploy.local.json` as `accessAud`, then build and deploy again.
7. Set these variables in your shell profile:
   ```bash
   export AGENT_ARTIFACTS_URL=https://<hostname>
   export AGENT_ARTIFACTS_CLIENT_ID=<service token client ID>
   export AGENT_ARTIFACTS_CLIENT_SECRET=<service token client secret>
   ```
8. Publish a page:
   ```bash
   agent-artifacts publish skills/explain/examples/gallery.html --slug example/gallery
   ```

To run the host locally, apply the migration to the local database and start Vite. Local mode has no Access check.

```bash
bunx cf d1 migrations apply 00000000-0000-4000-8000-00000000a271 --local --persist-to .cloudflare/state --dir migrations
bunx vite --port 8787
AGENT_ARTIFACTS_URL=http://localhost:8787 agent-artifacts publish <page>
```

## License

MIT. `NOTICE.md` lists the code and design values that come from other projects.
