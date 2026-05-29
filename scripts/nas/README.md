# NAS reverse-proxy setup (ADM-native)

The todo-app is published at `https://carlo156.myasustor.com/todo/` through
ASUSTOR ADM's built-in reverse proxy.

## How it works

ADM owns `/usr/builtin/etc/nginx_reverse_proxy/sites-enabled/` and regenerates it
from its own config DB. So the **only** durable way to add a route is through
**ADM's reverse-proxy GUI** — a hand-placed `.conf` there gets pruned (which is
what used to break SSO; see git history for the old `todo-nginx.sh` watcher that
worked around it).

ADM's GUI rules are **prefix-stripping**: a subfolder rule for `/todo/` forwards
to the upstream with the `/todo/` prefix removed (same as the existing
`/sonarr`, `/radarr`, `/nas` rules). The web container's nginx
(`docker/nginx/nginx.conf`) is therefore configured to serve at **root**, while
the SPA is built with base `/todo/` so the browser still uses `/todo/…` URLs:

```
browser  https://carlo156.myasustor.com/todo/assets/app.js
  → ADM   (strips /todo/)            /assets/app.js
  → web   docker/nginx/nginx.conf    serves /usr/share/nginx/html/assets/app.js
```

Everything else is already `/todo/`-aware and needs no change:

| Setting                               | Value                                                          | Where                              |
| ------------------------------------- | -------------------------------------------------------------- | ---------------------------------- |
| Vite `base`                           | `/todo/`                                                       | `packages/web/vite.config.ts`      |
| Router base                           | `/todo/`                                                       | `packages/web/src/router/index.ts` |
| API client baseURL                    | `/todo/api`                                                    | `packages/web/src/api/client.ts`   |
| `APP_BASE_PATH` (post-login redirect) | `/todo/`                                                       | `docker/docker-compose.prod.yml`   |
| `GOOGLE_REDIRECT_URI`                 | `https://carlo156.myasustor.com/todo/api/auth/google/callback` | NAS `.env` / Google Cloud Console  |

> The public OAuth callback URL is unchanged by this setup, so **no Google Cloud
> Console change is needed**.

## One-time cutover (on the NAS, as root)

1. **Deploy the new web image** (after this change is merged and CI has built it):

   ```sh
   cd <NAS_COMPOSE_DIR> && docker compose -f docker-compose.prod.yml pull web && \
     docker compose -f docker-compose.prod.yml up -d web
   ```

2. **Add the reverse-proxy rule in ADM's GUI** (Settings → Reverse Proxy, the same
   place `/sonarr` etc. were added):
   - Source: subfolder **`/todo/`** on HTTPS / port 443
   - Destination: **`http://127.0.0.1:80`** (the web container)

   This writes into the ADM-managed `443_*_*.conf` and survives reboots/regeneration.

3. **Verify** at `https://carlo156.myasustor.com/todo/`:
   - email/password login works
   - "Sign in with Google" completes and lands back in the app (not the ADM portal)

4. **Decommission the old workaround** so nothing re-creates a shadowing vhost:

   ```sh
   rm -f /usr/builtin/etc/nginx_reverse_proxy/sites-enabled/carlo156-todoapp.conf
   rm -f /volume1/.config/nginx/carlo156-todoapp.conf
   rm -f /usr/local/etc/rc.d/todo-nginx.sh
   rm -f /volume1/.@root/todofix.sh          # the manual helper
   # if a cron watchdog line was ever added:
   #   edit /etc/crontab to remove the todo-nginx.sh line, then: kill -HUP "$(pidof crond)"
   ```

   Do **not** run `todofix.sh` again — its named `server_name` block would shadow
   the GUI rule.

## Rollback

If the GUI rule doesn't behave, revert this PR (restores the path-preserving
`docker/nginx/nginx.conf`), redeploy `web`, and re-create the custom conf from git
history (PR that added `scripts/nas/todo-nginx.sh`).
