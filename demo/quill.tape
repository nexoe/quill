# VHS tape for quill's README demo.
# Regenerate the GIF with:  npm run demo   (or: vhs demo/quill.tape)
# Docs: https://github.com/charmbracelet/vhs

Output demo/quill.gif

Set Shell "bash"
Set Theme "Catppuccin Mocha"
Set FontSize 18
Set Width 1000
Set Height 640
Set Padding 20
Set PlaybackSpeed 1.0

# --- Setup (hidden): seed a throwaway notes dir so real notes stay private ---
Hide
Type `export QUILL_DIR="$(mktemp -d)" && cp demo/seed/*.md "$QUILL_DIR"/ && export QUILL_EDITOR=true`
Enter
# Run the local build, but show it as the real `quill` command in the demo.
Type `quill() { node dist/cli.js "$@"; }`
Enter
# Stagger mtimes so the "last edited" sort has something to show.
Type `touch -t 202603150900 "$QUILL_DIR"/groceries.md; touch -t 202604200900 "$QUILL_DIR"/reading-list.md; touch -t 202605250900 "$QUILL_DIR"/project-ideas.md; touch -t 202606200900 "$QUILL_DIR"/meeting-2024.md; touch -t 202606280900 "$QUILL_DIR"/standup-notes.md`
Enter
Type "clear"
Enter
Show

# --- Launch quill ---
Type "quill"
Enter
Sleep 2s

# Move the selection down the list.
Down@500ms 3
Sleep 1s
Up@500ms 1
Sleep 1s

# Filter notes live by title.
Type "f"
Sleep 500ms
Type@150ms "read"
Sleep 1500ms
Escape
Sleep 1s

# Toggle the sort order (last edited <-> name).
Type "s"
Sleep 1500ms
Type "s"
Sleep 1s

# Quit.
Type "q"
Sleep 1s
