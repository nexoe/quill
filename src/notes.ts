import fs from 'node:fs';
import path from 'node:path';
import { resolveNotesDir } from './config.js';

export interface Note {
  /** Absolute path to the markdown file. */
  file: string;
  /** Display title, derived from the note's first non-empty line. */
  title: string;
  /** Last-modified time. */
  modified: Date;
}

function ensureDir(): string {
  const dir = resolveNotesDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Title = first non-empty line, stripped of leading markdown heading markers. */
function titleFromContent(content: string): string {
  const line = content
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (!line) return 'Untitled';
  return line.replace(/^#+\s*/, '').slice(0, 80) || 'Untitled';
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'note'
  );
}

/** All notes, newest first. */
export function listNotes(): Note[] {
  const dir = ensureDir();
  const notes = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const file = path.join(dir, f);
      const stat = fs.statSync(file);
      const content = fs.readFileSync(file, 'utf8');
      return { file, title: titleFromContent(content), modified: stat.mtime };
    });
  notes.sort((a, b) => b.modified.getTime() - a.modified.getTime());
  return notes;
}

/** Create a new note seeded with the given title, returning its file path. */
export function createNote(title: string): string {
  const dir = ensureDir();
  const clean = title.trim() || 'Untitled';
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(dir, `${stamp}-${slugify(clean)}.md`);
  fs.writeFileSync(file, `# ${clean}\n\n`, 'utf8');
  return file;
}

/** Delete a note file. */
export function deleteNote(file: string): void {
  fs.rmSync(file, { force: true });
}
