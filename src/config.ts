import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export interface QuillConfig {
  /** Command used to open notes for editing. */
  editor?: string;
  /** Directory where notes are stored. */
  notesDir?: string;
}

const CONFIG_DIR = path.join(os.homedir(), '.quill');
export const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_NOTES_DIR = path.join(os.homedir(), '.quill', 'notes');

/** Expand a leading `~` to the user's home directory. */
function expandPath(p: string): string {
  if (p === '~') return os.homedir();
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2));
  return p;
}

export function loadConfig(): QuillConfig {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) as QuillConfig;
  } catch {
    return {};
  }
}

export function saveConfig(cfg: QuillConfig): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, `${JSON.stringify(cfg, null, 2)}\n`, 'utf8');
}

/** Notes dir: $QUILL_DIR → config → default. */
export function resolveNotesDir(cfg: QuillConfig = loadConfig()): string {
  return expandPath(process.env.QUILL_DIR ?? cfg.notesDir ?? DEFAULT_NOTES_DIR);
}

/** Editor: $QUILL_EDITOR → config → $VISUAL → $EDITOR → vi. */
export function resolveEditor(cfg: QuillConfig = loadConfig()): string {
  return (
    process.env.QUILL_EDITOR ??
    cfg.editor ??
    process.env.VISUAL ??
    process.env.EDITOR ??
    'vi'
  );
}

/** Which env var, if any, is currently overriding the config value. */
export function editorOverride(): string | undefined {
  return process.env.QUILL_EDITOR ? 'QUILL_EDITOR' : undefined;
}

export function notesDirOverride(): string | undefined {
  return process.env.QUILL_DIR ? 'QUILL_DIR' : undefined;
}
