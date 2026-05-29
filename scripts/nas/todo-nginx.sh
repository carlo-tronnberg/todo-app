#!/bin/sh
# Self-healing reverse-proxy config installer for ASUSTOR ADM.
#
# Problem: ADM periodically regenerates /usr/builtin/.../sites-enabled from its
# own config DB (cert tasks, housekeeping, reboots), pruning our hand-placed
# vhost. When that happens the todo-app vhost disappears and SSO/login break
# until the file is restored.
#
# This script runs as a long-lived watcher: it keeps DEST present and identical
# to CONF, reapplying within seconds of any wipe and reloading nginx only when
# the file actually changed. It is idempotent and single-instance (lockfile), so
# it is safe to (re)launch from cron every minute as a boot + crash watchdog.
#
# Install: see README.md in this directory.

CONF=/volume1/.config/nginx/carlo156-todoapp.conf
DEST=/usr/builtin/etc/nginx_reverse_proxy/sites-enabled/carlo156-todoapp.conf
LOG=/volume1/.config/nginx/autorun.log
PID_FILE=/var/run/nginx_reverse_proxy.pid
LOCK=/var/run/todo-nginx.lock

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG"; }

# Single-instance guard: if a previous watcher is alive, do nothing.
if [ -e "$LOCK" ] && kill -0 "$(cat "$LOCK" 2>/dev/null)" 2>/dev/null; then
    exit 0
fi
echo $$ > "$LOCK"
trap 'rm -f "$LOCK"' EXIT

log "=== watcher started (pid $$) ==="

reload_nginx() {
    if /usr/builtin/sbin/nginx -c /usr/builtin/etc/nginx_reverse_proxy/nginx.conf -s reload >> "$LOG" 2>&1; then
        log "reloaded via -s reload"
    elif [ -f "$PID_FILE" ] && kill -HUP "$(cat "$PID_FILE")" >> "$LOG" 2>&1; then
        log "reloaded via kill -HUP"
    else
        log "ERROR: reload failed"
    fi
}

# Ensure DEST exists and matches CONF; reload nginx only if we changed it.
reconcile() {
    [ -f "$CONF" ] || { log "ERROR: source $CONF missing"; return; }
    if [ ! -f "$DEST" ] || ! cmp -s "$CONF" "$DEST"; then
        if cp "$CONF" "$DEST" 2>>"$LOG"; then
            log "applied config (was missing or stale) — reloading"
            reload_nginx
        else
            log "ERROR: cp failed (is /usr/builtin writable yet?)"
        fi
    fi
}

# Wait up to 60s for nginx to be up and /usr/builtin writable before first apply.
for i in $(seq 1 30); do
    if [ -f "$PID_FILE" ] && touch /usr/builtin/.write_test 2>/dev/null; then
        rm -f /usr/builtin/.write_test
        log "nginx ready (attempt $i)"
        break
    fi
    sleep 2
done

reconcile  # first apply at startup

# Keep it in sync. Prefer event-driven recovery; fall back to polling.
WATCHDIR=$(dirname "$DEST")
if command -v inotifywait >/dev/null 2>&1; then
    log "watching $WATCHDIR via inotify"
    while inotifywait -e delete,move,create -qq "$WATCHDIR" 2>/dev/null; do
        reconcile
    done
fi

# Polling fallback (also runs if the inotify loop ever exits).
log "polling $WATCHDIR every 30s"
while :; do
    reconcile
    sleep 30
done
