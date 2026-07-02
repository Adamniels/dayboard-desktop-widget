# Dayboard — Mac mini deployment runbook

How Dayboard runs in production on the Mac mini and how to operate it. The stack matches
the habitquest style already on this Mini: OrbStack + a `docker-compose.prod.yml` started
with `--env-file .env.prod`, everything on `restart: unless-stopped`. Postgres, the api,
and both frontends run as containers; the wall-display kiosk runs on the Mini's desktop.

Nothing here is exposed to the public internet — LAN and Tailscale tailnet only (NFR-SEC-1).

---

## 1. Final port plan

| Process | Container | Host port | Notes |
| --- | --- | --- | --- |
| Postgres | `dayboard-prod-db` | none | internal to the compose network only |
| api (Fastify REST + WebSocket) | `dayboard-prod-api` | **3000** | habitquest uses 3001, so 3000 is free |
| display (static SPA, nginx) | `dayboard-prod-display` | **4173** | the wall kiosk points here |
| admin (static SPA, nginx) | `dayboard-prod-admin` | **4174** | opened from your laptop over Tailscale |

Ports are overridable in `.env.prod` (`API_HOST_PORT`, `DISPLAY_HOST_PORT`,
`ADMIN_HOST_PORT`). Confirm they're free with the collision audit below before first boot.

## 2. Collision audit (run this first, paste me the output if you want me to re-plan)

```bash
docker ps --format '{{.Names}}\t{{.Ports}}'
sudo lsof -iTCP -sTCP:LISTEN -nP | grep -E '(:3000|:4173|:4174|:5432)\b' || echo "3000/4173/4174/5432 all free"
```

If any of 3000/4173/4174 is taken, change the matching `*_HOST_PORT` in `.env.prod`
(and, if you move the api, `VITE_API_URL` / `VITE_DISPLAY_URL` accordingly, then rebuild
the frontends). Postgres publishes no host port, so `5432` cannot clash.

## 3. Prerequisites

- OrbStack running (already here for habitquest). `docker compose version` should work.
- The repo cloned to a stable path on the Mini, e.g. `~/apps/dayboard`. Run everything
  from the repo root.
- Node/pnpm are **not** required on the host — all builds happen inside the images.

## 4. First-time deploy

```bash
cd ~/apps/dayboard
git pull

# 1. Create the prod env from the template and fill it in.
cp .env.prod.example .env.prod
#   Edit .env.prod:
#   - VITE_API_URL      = http://<mini-tailnet-host>:3000
#   - VITE_DISPLAY_URL  = http://<mini-tailnet-host>:4173
#   - DISPLAY_TZ        = your IANA timezone (e.g. Europe/Stockholm)
#   - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET = from your Desktop OAuth client
#   (POSTGRES_PASSWORD stays 'dayboard' per your choice.)

# 2. Build and start the whole stack.
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build

# 3. Watch it come up. The api container runs Drizzle migrations, then starts the server.
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f api
```

`VITE_API_URL` and `VITE_DISPLAY_URL` are **compiled into** the display/admin bundles at
build time. If you ever change them, rebuild those images:
`docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build display admin`.

## 5. Connect Google (one-off, needs a browser on the Mini)

The api container has the Google client env, but the OAuth consent uses a loopback server
on `127.0.0.1:53682`, so run it as a one-off with that port published, and open the printed
URL in the Mini's own browser:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml \
  run --rm -p 127.0.0.1:53682:53682 api \
  pnpm --filter @dayboard/api google:connect
```

Open the consent URL it prints, approve, and when it redirects to
`http://127.0.0.1:53682/oauth2callback` the terminal will prompt you to pick which
calendars to sync and which is the write target. Tokens are stored in Postgres (not in
git). Verify:

```bash
curl -s http://localhost:3000/sync/status
# -> {"connected":true, ... "lastSyncedAt": "..."}
```

If tokens ever expire, just re-run the same `google:connect` command.

## 6. The wall-display kiosk (on the Mini's attached screen)

Install once, on the logged-in desktop user:

```bash
cp deploy/kiosk/dayboard-kiosk.sh ~/dayboard-kiosk.sh
chmod +x ~/dayboard-kiosk.sh
cp deploy/kiosk/com.dayboard.kiosk.plist ~/Library/LaunchAgents/
launchctl load -w ~/Library/LaunchAgents/com.dayboard.kiosk.plist
```

This launches Chrome fullscreen at `http://localhost:4173` with autoplay allowed (the
reminder chime needs it), waits for the display to be served first, starts at login, and
relaunches if closed. Stop it with:

```bash
launchctl unload -w ~/Library/LaunchAgents/com.dayboard.kiosk.plist
```

If the LaunchAgent path differs (the plist assumes `/Users/homeserver/dayboard-kiosk.sh`),
edit the `ProgramArguments` path in the plist before loading.

## 7. Admin over Tailscale (from your laptop)

- Confirm the Mini is on the tailnet: `tailscale status` on the Mini.
- On your laptop (same tailnet), open `http://<mini-tailnet-host>:4174`.
- Check events, the week calendar, projects, reminders/Pomodoro, notes, and the
  Display & sync tab. Changes should reach the wall display within ~1s.

> Plain `http`/`ws` over the tailnet is fine and is what the frontends are built for. Do
> not put Tailscale **Funnel** in front (that would make it public — NFR-SEC-1). Tailscale
> **Serve** (tailnet-only HTTPS) is optional; if you use it you must rebuild the frontends
> with `https://`/`wss://` URLs, and make sure the `/ws` upgrade is proxied.

## 8. Verification checklist (close these before calling it done)

- [ ] `docker compose ... ps` shows db healthy and api/display/admin up.
- [ ] `curl http://<mini-tailnet>:3000/health` returns `{"status":"ok",...}`.
- [ ] `curl http://<mini-tailnet>:3000/sync/status` shows `connected: true` and a recent `lastSyncedAt`.
- [ ] Create an event in admin → it appears on the display within ~1s (NFR-PERF-1).
- [ ] Display looks right in both portrait and landscape on the real screen (FR-VIEW-2).
- [ ] Reboot the Mini → db, api, both frontends, and the kiosk all come back automatically.
- [ ] Edit an event on your phone → it shows on the display within the sync interval (~45s).
- [ ] Security (NFR-SEC-1): nothing Dayboard is port-forwarded on the router; no Funnel; DB has no host port.

## 9. Operating it

```bash
# Status / logs
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f api

# Restart one service / everything
docker compose --env-file .env.prod -f docker-compose.prod.yml restart api
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d

# Pull new code and redeploy
git pull && docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build

# Stop everything (containers stay defined; data volume persists)
docker compose --env-file .env.prod -f docker-compose.prod.yml down
```

## 10. Files added for deployment

- `docker-compose.prod.yml` — the prod stack (db + api + display + admin).
- `apps/api/Dockerfile` — api image (runs migrations, then `tsx src/server.ts`).
- `apps/display/Dockerfile`, `apps/admin/Dockerfile` — build the SPAs, serve via nginx.
- `apps/display/nginx.conf`, `apps/admin/nginx.conf` — static SPA serving with fallback.
- `.dockerignore` — keeps node_modules/dist/secrets out of build contexts.
- `.env.prod.example` — template for the gitignored `.env.prod`.
- `deploy/kiosk/dayboard-kiosk.sh`, `deploy/kiosk/com.dayboard.kiosk.plist` — the kiosk.

Application code was not modified — this is environment, build, and process management only.
