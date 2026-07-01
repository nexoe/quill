# ✒ quill

A quick, keyboard-driven note-taking TUI. Browse, create, edit, and delete
plain-markdown notes without leaving the terminal.

Built with [Ink](https://github.com/vadimdemedes/ink) (React for the CLI).

## Install

Requires [Node.js](https://nodejs.org) 18 or newer. Install it globally:

```sh
npm install -g @nexoe/quill
```

Then launch it from anywhere:

```sh
quill
```

Or run it once, without installing:

```sh
npx @nexoe/quill
```

## Keys

| Key            | Action                              |
| -------------- | ----------------------------------- |
| `↑` / `↓`, `j` / `k` | Move selection                |
| `enter` / `e`  | Edit the selected note in `$EDITOR` |
| `n`            | Create a new note                   |
| `f`            | Filter notes by title (live)        |
| `d`            | Delete the selected note (confirm)  |
| `s`            | Toggle sort: last edited ↔ name     |
| `c`            | Open the config screen              |
| `q`            | Quit                                |

While filtering: type to narrow the list, `↑`/`↓` to move, `enter` to apply and
keep the filter, `esc` to clear it. With a filter applied, `esc` in the list
clears it. The list scrolls in place when it's longer than the window, so the
header and key hints stay on screen.

## Configuration

Run the interactive config screen from the shell:

```sh
quill config
```

…or press `c` from inside the app. It lets you set your **editor** and
**notes directory**, saved to `~/.quill/config.json`.

Both settings can also come from the environment, which takes precedence over
the config file:

| Setting  | Resolution order (first wins)                        |
| -------- | ---------------------------------------------------- |
| Editor   | `$QUILL_EDITOR` → config → `$VISUAL` → `$EDITOR` → `vi` |
| Notes dir| `$QUILL_DIR` → config → `~/.quill/notes`             |

For GUI editors, remember the wait flag, e.g. `code -w` or `subl -w`.

## How it works

- Runs fullscreen in the terminal's alternate screen buffer (like `vim`/`less`);
  your shell scrollback is restored untouched on exit. The layout tracks
  terminal resizes.
- Notes are plain `.md` files (in the notes dir above).
- A note's title is its first non-empty line.
- Editing hands the terminal to your configured editor, so you get your real
  editor for the note body.

## Develop

To hack on quill itself:

```sh
git clone https://github.com/nexoe/quill.git
cd quill
npm install

npm run dev                  # run straight from source
npm run build && npm link    # build and put `quill` on your PATH
```
