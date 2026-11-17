#!/usr/bin/env bash
set -euo pipefail

retry_rustup() {
  local attempt
  local delay

  for attempt in 1 2 3; do
    if "$@"; then
      return 0
    fi

    if [[ "$attempt" -eq 3 ]]; then
      echo "::error::Rustup failed after ${attempt} attempts."
      return 1
    fi

    delay=$((attempt * 15))
    echo "::warning::Rustup attempt ${attempt} failed; retrying in ${delay}s."
    sleep "$delay"
  done
}

retry_rustup rustup toolchain install stable --profile minimal --no-self-update
rustup default stable

for target in "$@"; do
  retry_rustup rustup target add "$target" --toolchain stable
done
