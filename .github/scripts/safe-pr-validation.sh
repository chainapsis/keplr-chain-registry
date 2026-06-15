#!/usr/bin/env bash
set -eo pipefail

MARKER="<!-- keplr-chain-registry-pr-validation -->"
PR_NUMBER="${PR_NUMBER:?PR_NUMBER is required}"
BASE_SHA="${BASE_SHA:?BASE_SHA is required}"
AUTHOR_ASSOCIATION="${AUTHOR_ASSOCIATION:?AUTHOR_ASSOCIATION is required}"
GITHUB_REPOSITORY="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
PR_REF="refs/remotes/origin/pr/${PR_NUMBER}/head"
SUMMARY_FILE="${GITHUB_STEP_SUMMARY:-/dev/null}"
COMMENT_FILE="${RUNNER_TEMP:-/tmp}/pr-validation-comment.md"

is_trusted_author() {
  case "${AUTHOR_ASSOCIATION}" in
    OWNER | MEMBER | COLLABORATOR)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

is_registry_json_file() {
  [[ "$1" =~ ^(cosmos|evm|svm)/.+\.json$ ]]
}

is_registry_image_file() {
  [[ "$1" =~ ^images/.+\.png$ ]]
}

is_safe_overlay_file() {
  is_registry_json_file "$1" || is_registry_image_file "$1"
}

is_dangerous_file() {
  case "$1" in
    .github/* | src/* | package.json | yarn.lock | .yarnrc.yml | .yarn/* | tsconfig.json)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

is_inconclusive_external_failure() {
  local output="$1"

  grep -Eiq "Price endpoint .*HTTP (429|5[0-9][0-9])|Price endpoint request failed|Price endpoint returned invalid JSON" <<<"${output}"
}

append_file_list() {
  local title="$1"
  shift

  echo "${title}"
  if [[ "$#" -eq 0 ]]; then
    echo "- None"
    return
  fi

  for file in "$@"; do
    echo "- \`${file}\`"
  done
}

trim_output() {
  local output="$1"

  if [[ "${#output}" -gt 4000 ]]; then
    {
      echo "${output:0:4000}"
      echo
      echo "[output truncated]"
    }
  else
    echo "${output}"
  fi
}

write_comment() {
  local title="$1"
  shift

  {
    echo "${MARKER}"
    echo
    echo "## ${title}"
    echo
    "$@"
  } >"${COMMENT_FILE}"
}

append_comment_to_summary() {
  cat "${COMMENT_FILE}" >>"${SUMMARY_FILE}"
}

post_comment() {
  if [[ -z "${GH_TOKEN:-}" && -z "${GITHUB_TOKEN:-}" ]] || ! command -v gh >/dev/null 2>&1; then
    return 0
  fi

  export GH_TOKEN="${GH_TOKEN:-${GITHUB_TOKEN:-}}"

  local existing_id
  existing_id="$(
    {
      gh api "repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/comments" \
        --jq ".[] | select(.user.type == \"Bot\" and (.body | contains(\"${MARKER}\"))) | .id" || true
    } | tail -n 1
  )"

  local body
  body="$(cat "${COMMENT_FILE}")"

  if [[ -n "${existing_id}" ]]; then
    gh api \
      --method PATCH \
      "repos/${GITHUB_REPOSITORY}/issues/comments/${existing_id}" \
      --field "body=${body}" >/dev/null || echo "Failed to update PR validation comment"
  else
    gh pr comment "${PR_NUMBER}" \
      --repo "${GITHUB_REPOSITORY}" \
      --body-file "${COMMENT_FILE}" >/dev/null || echo "Failed to create PR validation comment"
  fi
}

git_changed_files() {
  local diff_filter="$1"

  git diff --no-renames --name-only -z "--diff-filter=${diff_filter}" "${BASE_SHA}" "${PR_REF}"
}

echo "Fetching PR head ref ${PR_REF}"
git fetch --no-tags --depth=1 origin "+refs/pull/${PR_NUMBER}/head:${PR_REF}"

all_changed_files=()
changed_files=()
deleted_files=()

while IFS= read -r -d "" file; do
  all_changed_files+=("${file}")
done < <(git_changed_files "ACMRD")

while IFS= read -r -d "" file; do
  changed_files+=("${file}")
done < <(git_changed_files "ACMR")

while IFS= read -r -d "" file; do
  deleted_files+=("${file}")
done < <(git_changed_files "D")

dangerous_files=()
for file in "${all_changed_files[@]}"; do
  if is_dangerous_file "${file}"; then
    dangerous_files+=("${file}")
  fi
done

if [[ "${#dangerous_files[@]}" -gt 0 ]] && ! is_trusted_author; then
  write_comment "Maintainer review required" \
    append_file_list "This PR changes validator, dependency, or workflow files. The automatic validation job does not run PR-controlled code for external PRs." "${dangerous_files[@]}"
  append_comment_to_summary
  post_comment
  exit 1
fi

json_files=()
overlay_files=()
for file in "${changed_files[@]}"; do
  if is_safe_overlay_file "${file}"; then
    overlay_files+=("${file}")
  fi

  if is_registry_json_file "${file}"; then
    json_files+=("${file}")
  fi
done

for file in "${overlay_files[@]}"; do
  mkdir -p -- "$(dirname -- "${file}")"
  git show "${PR_REF}:${file}" >"${file}"
done

for file in "${deleted_files[@]}"; do
  if is_safe_overlay_file "${file}"; then
    rm -f -- "${file}"
  fi
done

if [[ "${#json_files[@]}" -eq 0 ]]; then
  write_comment "PR validation skipped" \
    append_file_list "No changed registry JSON files were found under cosmos/**, evm/**, or svm/**." "${all_changed_files[@]}"
  append_comment_to_summary
  post_comment
  exit 0
fi

echo "Installing dependencies from base branch"
yarn install --immutable

hard_failure_files=()
hard_failure_outputs=()
inconclusive_files=()
inconclusive_outputs=()

for file in "${json_files[@]}"; do
  echo "Validating ${file}"

  attempt=1
  while true; do
    if output="$(yarn ts-node src/index.ts "${file}" 2>&1)"; then
      echo "Validated ${file}"
      break
    fi

    if is_inconclusive_external_failure "${output}"; then
      if [[ "${attempt}" -lt 3 ]]; then
        echo "External price check was inconclusive for ${file}; retrying (${attempt}/3)"
        attempt=$((attempt + 1))
        sleep 5
        continue
      fi

      inconclusive_files+=("${file}")
      inconclusive_outputs+=("${output}")
      break
    fi

    hard_failure_files+=("${file}")
    hard_failure_outputs+=("${output}")
    break
  done
done

if [[ "${#hard_failure_files[@]}" -gt 0 ]]; then
  write_comment "PR validation failed" \
    append_file_list "Hard validation failures:" "${hard_failure_files[@]}"

  {
    echo
    for i in "${!hard_failure_files[@]}"; do
      echo "### ${hard_failure_files[$i]}"
      echo
      echo '```'
      trim_output "${hard_failure_outputs[$i]}"
      echo '```'
      echo
    done
  } >>"${COMMENT_FILE}"

  append_comment_to_summary
  post_comment
  exit 1
fi

if [[ "${#inconclusive_files[@]}" -gt 0 ]]; then
  write_comment "External validation inconclusive" \
    append_file_list "The registry data passed deterministic validation, but the public price endpoint failed after retries. Maintainer recheck is required:" "${inconclusive_files[@]}"

  {
    echo
    for i in "${!inconclusive_files[@]}"; do
      echo "### ${inconclusive_files[$i]}"
      echo
      echo '```'
      trim_output "${inconclusive_outputs[$i]}"
      echo '```'
      echo
    done
  } >>"${COMMENT_FILE}"

  append_comment_to_summary
  post_comment
  exit 1
fi

write_comment "PR validation passed" \
  append_file_list "Validated registry JSON files:" "${json_files[@]}"
append_comment_to_summary
post_comment
