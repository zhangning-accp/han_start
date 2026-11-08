#!/bin/bash
set -euo pipefail
systemctl --user restart han-start-slot8.service
printf 'https://stu60-8.space.aiec.wflaiedu.com/ (loopback port %s)\n' "$(cat "$HOME/.service_port8")"
