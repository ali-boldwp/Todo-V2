#!/bin/sh
set -eu

opencode_pid=""
api_pid=""

cleanup() {
  if [ -n "$api_pid" ] && kill -0 "$api_pid" 2>/dev/null; then
    kill "$api_pid" 2>/dev/null || true
  fi
  if [ -n "$opencode_pid" ] && kill -0 "$opencode_pid" 2>/dev/null; then
    kill "$opencode_pid" 2>/dev/null || true
  fi
}

trap cleanup INT TERM EXIT

if [ "${START_OPENCODE:-1}" = "1" ]; then
  opencode serve --port "${OPENCODE_PORT:-5001}" --hostname 0.0.0.0 &
  opencode_pid=$!
fi

node apps/api/dist/index.js &
api_pid=$!

while :; do
  if ! kill -0 "$api_pid" 2>/dev/null; then
    wait "$api_pid"
    exit $?
  fi

  if [ -n "$opencode_pid" ] && ! kill -0 "$opencode_pid" 2>/dev/null; then
    wait "$opencode_pid"
    exit $?
  fi

  sleep 2
done
