import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, render, Text, useApp, useInput, useStdin, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import { spawnSync } from 'node:child_process';
import { createNote, deleteNote, listNotes, type Note } from './notes.js';
import { resolveEditor } from './config.js';
import { ConfigScreen } from './ConfigScreen.js';
import { LOGO } from './logo.js';

type Mode = 'list' | 'new' | 'confirm' | 'config' | 'find';
type SortMode = 'modified' | 'alpha';

const LOGO_HEIGHT = LOGO.split('\n').length;

/** The Ink instance, so handlers can force a clean repaint after shelling out. */
let inkApp: ReturnType<typeof render> | undefined;

/** Switch to the alternate screen buffer (full pane) and hide the cursor. */
const enterAltScreen = () =>
  process.stdout.write('\x1b[?1049h\x1b[2J\x1b[H\x1b[?25l');
/** Restore the primary screen buffer and the cursor. */
const leaveAltScreen = () => process.stdout.write('\x1b[?25h\x1b[?1049l');

/** Current terminal dimensions, kept up to date on resize. */
function useTerminalSize() {
  const { stdout } = useStdout();
  const [size, setSize] = useState({
    columns: stdout.columns || 80,
    rows: stdout.rows || 24,
  });
  useEffect(() => {
    const onResize = () =>
      setSize({ columns: stdout.columns || 80, rows: stdout.rows || 24 });
    stdout.on('resize', onResize);
    return () => {
      stdout.off('resize', onResize);
    };
  }, [stdout]);
  return size;
}

function relTime(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const App = () => {
  const { exit } = useApp();
  const { setRawMode } = useStdin();
  const { columns, rows } = useTerminalSize();
  const [notes, setNotes] = useState<Note[]>(() => listNotes());
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<Mode>(
    process.argv[2] === 'config' ? 'config' : 'list',
  );
  const [title, setTitle] = useState('');
  const [sort, setSort] = useState<SortMode>('modified');
  const [query, setQuery] = useState('');

  // Sort (newest-first by default, or alphanumeric) then filter by title.
  const visible = useMemo(() => {
    const bySort =
      sort === 'modified'
        ? notes
        : [...notes].sort((a, b) =>
            a.title.localeCompare(b.title, undefined, {
              numeric: true,
              sensitivity: 'base',
            }),
          );
    const q = query.trim().toLowerCase();
    return q ? bySort.filter((n) => n.title.toLowerCase().includes(q)) : bySort;
  }, [notes, sort, query]);

  // Keep the selection in range as the visible set changes (filter/delete).
  useEffect(() => {
    setIndex((i) => Math.max(0, Math.min(i, visible.length - 1)));
  }, [visible.length]);

  // Viewport: rows the list may use while keeping header + footer on screen.
  const baseChrome = mode === 'find' ? 8 : 6; // header, gaps, footer (+ search)
  // Show the logo only when there's still room for a few note rows beneath it.
  const showLogo = rows - (baseChrome + LOGO_HEIGHT + 1) >= 3;
  const chrome = baseChrome + (showLogo ? LOGO_HEIGHT + 1 : 0);
  const windowSize = Math.max(3, rows - chrome);
  const maxTop = Math.max(0, visible.length - windowSize);
  const top = Math.max(0, Math.min(index - Math.floor(windowSize / 2), maxTop));
  const windowNotes = visible.slice(top, top + windowSize);

  const refresh = useCallback(() => {
    setNotes(listNotes());
  }, []);

  // Suspend Ink's raw-mode input, hand the terminal to $EDITOR, then resume.
  const openEditor = useCallback(
    (file: string) => {
      // Editor may include flags, e.g. "code -w" or "subl -w" — split the
      // program from its args and append the file as its own argv entry
      // (so paths with spaces stay intact).
      const [cmd, ...args] = resolveEditor().trim().split(/\s+/);
      setRawMode?.(false);
      // Hand the editor a clean primary screen, then reclaim the alt screen.
      leaveAltScreen();
      spawnSync(cmd, [...args, file], { stdio: 'inherit' });
      enterAltScreen();
      inkApp?.clear(); // reset Ink's frame tracking so it repaints cleanly
      setRawMode?.(true);
      refresh();
    },
    [refresh, setRawMode],
  );

  // Main navigation. Active in the list and delete-confirm states.
  useInput(
    (input, key) => {
      if (mode === 'list') {
        if (input === 'q') return exit();
        if (key.upArrow || input === 'k') setIndex((i) => Math.max(0, i - 1));
        if (key.downArrow || input === 'j')
          setIndex((i) => Math.min(visible.length - 1, i + 1));
        if ((key.return || input === 'e') && visible[index])
          openEditor(visible[index].file);
        if (input === 'n') {
          setTitle('');
          setMode('new');
        }
        if (input === 'f') setMode('find');
        if (input === 's') {
          setSort((s) => (s === 'modified' ? 'alpha' : 'modified'));
          setIndex(0);
        }
        if (input === 'c') setMode('config');
        if (input === 'd' && visible[index]) setMode('confirm');
        // Esc clears an active filter.
        if (key.escape && query) {
          setQuery('');
          setIndex(0);
        }
      } else if (mode === 'confirm') {
        if (input === 'y' && visible[index]) {
          deleteNote(visible[index].file);
          setMode('list');
          refresh();
        } else if (input === 'n' || key.escape) {
          setMode('list');
        }
      }
    },
    { isActive: mode === 'list' || mode === 'confirm' },
  );

  // Filtering: type to filter, arrows move the selection, esc clears & exits.
  // (Enter is handled by the TextInput's onSubmit below.)
  useInput(
    (_input, key) => {
      if (key.escape) {
        setQuery('');
        setIndex(0);
        setMode('list');
      } else if (key.upArrow) {
        setIndex((i) => Math.max(0, i - 1));
      } else if (key.downArrow) {
        setIndex((i) => Math.min(visible.length - 1, i + 1));
      }
    },
    { isActive: mode === 'find' },
  );

  // Esc cancels the new-note prompt (TextInput owns the other keys).
  useInput(
    (_input, key) => {
      if (key.escape) setMode('list');
    },
    { isActive: mode === 'new' },
  );

  if (mode === 'config') {
    return (
      <Box
        width={columns}
        height={rows}
        justifyContent="center"
        alignItems="center"
      >
        <ConfigScreen
          onDone={() => {
            setMode('list');
            refresh();
          }}
        />
      </Box>
    );
  }

  if (mode === 'new') {
    return (
      <Box
        width={columns}
        height={rows}
        justifyContent="center"
        alignItems="center"
      >
        <Box flexDirection="column">
          <Text color="magenta" bold>
            New note
          </Text>
          <Box marginTop={1}>
            <Text>Title: </Text>
            <TextInput
              value={title}
              onChange={setTitle}
              onSubmit={(t) => {
                const file = createNote(t);
                setMode('list');
                openEditor(file);
              }}
            />
          </Box>
          <Box marginTop={1}>
            <Text dimColor>enter create · esc cancel</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  const sortLabel = sort === 'modified' ? 'last edited' : 'name';
  return (
    <Box
      width={columns}
      height={rows}
      justifyContent="center"
      alignItems="center"
    >
      <Box flexDirection="column" alignItems="center">
        {showLogo && (
          <Box marginBottom={1}>
            <Text color="magenta">{LOGO}</Text>
          </Box>
        )}
        <Box>
          {!showLogo && (
            <Text color="magenta" bold>
              quill{'  '}
            </Text>
          )}
          <Text dimColor>
            {query ? `filtering “${query}”` : `sorted by ${sortLabel}`}
            {visible.length > 0 ? ` · ${index + 1}/${visible.length}` : ''}
          </Text>
        </Box>

        <Box marginTop={1} flexDirection="column">
          {visible.length === 0 ? (
            <Text dimColor>
              {query
                ? `No notes match “${query}”.`
                : 'No notes yet — press n to create one.'}
            </Text>
          ) : (
            windowNotes.map((note, i) => {
              const abs = top + i;
              return (
                <Text key={note.file} inverse={abs === index}>
                  {abs === index ? '❯ ' : '  '}
                  {note.title.slice(0, 50).padEnd(52)}
                  {relTime(note.modified)}
                </Text>
              );
            })
          )}
        </Box>

        {mode === 'find' && (
          <Box marginTop={1}>
            <Text color="magenta">/ </Text>
            <TextInput
              value={query}
              onChange={(v) => {
                setQuery(v);
                setIndex(0);
              }}
              onSubmit={() => setMode('list')}
              placeholder="type to filter by title"
            />
          </Box>
        )}

        <Box marginTop={1} justifyContent="center">
          {mode === 'confirm' ? (
            <Text color="red">Delete “{visible[index]?.title}”? (y/n)</Text>
          ) : mode === 'find' ? (
            <Text dimColor>
              type to filter · ↑/↓ move · enter apply · esc clear
            </Text>
          ) : (
            <Text dimColor>
              ↑/↓ move · enter/e edit · n new · f find · d delete · s sort · c
              config · q quit
            </Text>
          )}
        </Box>
      </Box>
    </Box>
  );
};

enterAltScreen();
inkApp = render(<App />);
// Always restore the user's shell screen, however we exit.
process.on('exit', leaveAltScreen);
inkApp.waitUntilExit().then(() => {
  leaveAltScreen();
  process.exit(0);
});
