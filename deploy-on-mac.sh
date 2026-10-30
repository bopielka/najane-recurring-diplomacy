#!/usr/bin/env bash
#
# The macOS entry point, kept because it is what gets typed. Everything is in
# deploy.sh, which picks the install path from `uname`.
#
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/deploy.sh" "$@"
