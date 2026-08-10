#!/bin/bash
# Post-edit hook: run the drop-note integration suite when its MASM source changes.

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // .tool_input.filePath // empty')
note_path="$CLAUDE_PROJECT_DIR/contracts/drop-note/src/drop_note.masm"

if [[ "$file_path" != "$note_path" ]]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR" || exit 2
test_output=$(cargo test -p integration --test drop_note_test --release 2>&1)
test_exit=$?

if [[ $test_exit -eq 0 ]]; then
  echo '{"hookSpecificOutput": {"additionalContext": "Miden Drop note tests succeeded"}}'
  exit 0
fi

tail_output=$(echo "$test_output" | tail -30)
jq -n --arg ctx "Miden Drop note tests FAILED. Fix the MASM or test error before continuing."$'\n'"$tail_output" \
  '{"hookSpecificOutput": {"additionalContext": $ctx}}'
exit 2
