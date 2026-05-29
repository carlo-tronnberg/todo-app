# NAS reverse-proxy auto-heal (`todo-nginx.sh`)

The todo-app is published through ASUSTOR ADM's built-in reverse proxy. ADM
periodically regenerates `…/sites-enabled/` from its own config DB (certificate
tasks, housekeeping, reboots), which **prunes our hand-placed vhost**
`carlo156-todoapp.conf`. When that file disappears, the hostname falls through to
ADM's default server block and the app breaks:

- local login → `Invalid email or password` (request hits the wrong/empty upstream)
- Google SSO → nginx `404 Not Found` (OAuth callback `location` only exists in our vhost)

Observed cadence: the file is wiped roughly **weekly**. A one-shot copy at boot is
not enough — it must be continuously reconciled.

## What the script does

`todo-nginx.sh` runs as a long-lived watcher that:

1. Waits for nginx to be up and `/usr/builtin` writable.
2. Ensures the vhost is present and identical to the source conf, reapplying it
   within seconds of any wipe (inotify, with a 30s polling fallback).
3. Reloads nginx **only when the file actually changed**.
4. Is single-instance (lockfile) and idempotent, so cron can safely (re)launch it
   every minute as a boot + crash watchdog.

Paths it manages (edit at the top of the script if they change):

| Var    | Value                                                                      |
| ------ | -------------------------------------------------------------------------- |
| `CONF` | `/volume1/.config/nginx/carlo156-todoapp.conf` (source of truth)           |
| `DEST` | `/usr/builtin/etc/nginx_reverse_proxy/sites-enabled/carlo156-todoapp.conf` |
| `LOG`  | `/volume1/.config/nginx/autorun.log`                                       |

## Install (on the NAS, as root)

```sh
# 1. Deploy the watcher
cp scripts/nas/todo-nginx.sh /usr/local/etc/rc.d/todo-nginx.sh
chmod +x /usr/local/etc/rc.d/todo-nginx.sh

# 2. Launch + keep-alive via cron (also covers boot, since crond starts at boot).
#    ASUSTOR uses BusyBox crontab — 6 fields incl. the user column.
echo '* * * * * root /usr/local/etc/rc.d/todo-nginx.sh >/dev/null 2>&1 &' >> /etc/crontab
kill -HUP "$(pidof crond)"

# 3. Start it now (don't wait for the next minute)
/usr/local/etc/rc.d/todo-nginx.sh &
```

## Verify

```sh
# Delete the vhost by hand; it should reappear within a few seconds.
rm /usr/builtin/etc/nginx_reverse_proxy/sites-enabled/carlo156-todoapp.conf
sleep 5
tail -5 /volume1/.config/nginx/autorun.log   # expect: "applied config … — reloading" + reload line
ls -l /usr/builtin/etc/nginx_reverse_proxy/sites-enabled/carlo156-todoapp.conf
```

## Caveats

- ADM firmware updates can overwrite `/etc/crontab`; re-check the cron line after
  an ADM upgrade.
- The durable alternative is to register this vhost in **ADM's reverse-proxy GUI**
  so it lives in ADM's config DB and is never pruned — viable only if the GUI can
  express the Google OAuth callback `location`. If it can, this watcher can be
  retired entirely.
