#!/usr/bin/env bash
#
# push-next.sh — push local commits to origin one at a time.
#
# Usage:
#   ./scripts/push-next.sh            push the next single commit (with prompt)
#   ./scripts/push-next.sh -n 3       push the next 3 commits
#   ./scripts/push-next.sh --all      push everything that's still local
#   ./scripts/push-next.sh --status   show what's local vs pushed (no push)
#   ./scripts/push-next.sh --dry-run  show what would be pushed, don't push
#   ./scripts/push-next.sh -y         skip the confirmation prompt
#
# Always pushes to the same branch you're on. Always pushes to 'origin'.
# Refuses to skip git hooks or force-push. If origin doesn't have the branch
# yet, the first push uses --set-upstream so future runs work without flags.

set -euo pipefail

REMOTE="origin"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"

count=1
yes=0
dry=0
mode="next"

while [ $# -gt 0 ]; do
  case "$1" in
    -n) count="$2"; shift 2 ;;
    --all) mode="all"; shift ;;
    --status) mode="status"; shift ;;
    --dry-run) dry=1; shift ;;
    -y|--yes) yes=1; shift ;;
    -h|--help) sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown flag: $1" >&2; exit 2 ;;
  esac
done

# Make sure the remote knows about this branch's upstream state.
git fetch --quiet "$REMOTE" "$BRANCH" 2>/dev/null || true

# How many local commits are ahead of origin?
if git rev-parse --verify --quiet "$REMOTE/$BRANCH" >/dev/null; then
  ahead="$(git rev-list --count "$REMOTE/$BRANCH..HEAD")"
  upstream_exists=1
else
  ahead="$(git rev-list --count HEAD)"
  upstream_exists=0
fi

print_pending() {
  if [ "$ahead" -eq 0 ]; then
    echo "✓ $BRANCH is up to date with $REMOTE/$BRANCH — nothing to push."
    return
  fi
  echo "→ $ahead commit(s) on '$BRANCH' not yet on '$REMOTE':"
  echo
  if [ "$upstream_exists" -eq 1 ]; then
    git --no-pager log --oneline --reverse "$REMOTE/$BRANCH..HEAD"
  else
    git --no-pager log --oneline --reverse HEAD
  fi
  echo
}

if [ "$mode" = "status" ]; then
  print_pending
  exit 0
fi

if [ "$ahead" -eq 0 ]; then
  print_pending
  exit 0
fi

# Pick how many commits to push.
if [ "$mode" = "all" ]; then
  n="$ahead"
else
  n="$count"
fi

# Don't try to push more than we have.
if [ "$n" -gt "$ahead" ]; then n="$ahead"; fi

# Resolve the SHA we're going to push: the Nth oldest local commit.
# git log --reverse lists oldest-first; head -n N picks the first N.
if [ "$upstream_exists" -eq 1 ]; then
  target_sha="$(git rev-list --reverse "$REMOTE/$BRANCH..HEAD" | sed -n "${n}p")"
else
  target_sha="$(git rev-list --reverse HEAD | sed -n "${n}p")"
fi

echo "About to push $n commit(s) to $REMOTE/$BRANCH:"
echo
if [ "$upstream_exists" -eq 1 ]; then
  git --no-pager log --oneline --reverse "$REMOTE/$BRANCH..$target_sha"
else
  git --no-pager log --oneline --reverse "$target_sha"
fi
echo

if [ "$dry" -eq 1 ]; then
  echo "(dry-run — nothing pushed)"
  exit 0
fi

if [ "$yes" -ne 1 ]; then
  printf "Push? [y/N] "
  read -r answer
  case "$answer" in
    y|Y|yes|YES) ;;
    *) echo "aborted."; exit 1 ;;
  esac
fi

# First push to a brand-new branch needs --set-upstream; later pushes don't.
if [ "$upstream_exists" -eq 1 ]; then
  git push "$REMOTE" "$target_sha:refs/heads/$BRANCH"
else
  git push --set-upstream "$REMOTE" "$target_sha:refs/heads/$BRANCH"
fi

echo
echo "✓ pushed up to $(git --no-pager log -1 --oneline "$target_sha")"
remaining=$((ahead - n))
if [ "$remaining" -gt 0 ]; then
  echo "  $remaining commit(s) still local. Run again to push the next."
else
  echo "  no local commits remaining."
fi
