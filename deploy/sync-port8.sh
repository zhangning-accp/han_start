#!/bin/bash
set -euo pipefail
for attempt in {1..50}; do
  if [[ -s "$HOME/.service_port8" ]]; then
    port=$(cat "$HOME/.service_port8")
    if curl -fsS "http://127.0.0.1:$port/" -o /dev/null; then
      exec sudo -n /usr/local/bin/set-stu-nginx.sh stu60 8
    fi
  fi
  sleep 0.2
done
exit 1
