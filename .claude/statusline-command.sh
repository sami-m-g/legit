#!/usr/bin/env bash
# Claude Code Status Line
# Shows: Model | Context Progress Bar

input=$(cat)

# -- Model --
model_name=$(echo "$input" | jq -r '.model.display_name // "Unknown"')

# -- Context usage --
used_pct=$(echo "$input" | jq -r '.context_window.used_percentage // empty')

# Build progress bar (20 chars wide)
if [ -n "$used_pct" ]; then
  filled=$(echo "$used_pct" | awk '{printf "%d", ($1 / 100) * 20 + 0.5}')
  empty=$((20 - filled))

  bar=""
  for ((i=0; i<filled; i++)); do bar+="█"; done
  for ((i=0; i<empty; i++)); do bar+="░"; done

  # Color: green < 60%, yellow 60-85%, red > 85%
  if [ "$(echo "$used_pct < 60" | bc)" -eq 1 ]; then
    bar_color="\033[32m"  # green
  elif [ "$(echo "$used_pct < 85" | bc)" -eq 1 ]; then
    bar_color="\033[33m"  # yellow
  else
    bar_color="\033[31m"  # red
  fi
  reset="\033[0m"
  ctx_display=$(printf "${bar_color}%s${reset} %s%%" "$bar" "$used_pct")
else
  ctx_display="░░░░░░░░░░░░░░░░░░░░ --"
fi

# -- Assemble --
printf "%s  |  Ctx: %b" "$model_name" "$ctx_display"
