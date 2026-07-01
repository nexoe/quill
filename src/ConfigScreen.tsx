import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import {
  editorOverride,
  loadConfig,
  notesDirOverride,
  resolveEditor,
  resolveNotesDir,
  saveConfig,
} from './config.js';

/** Interactive editor for quill's persistent config. */
export const ConfigScreen = ({ onDone }: { onDone: () => void }) => {
  const initial = loadConfig();
  const [editor, setEditor] = useState(initial.editor ?? '');
  const [notesDir, setNotesDir] = useState(initial.notesDir ?? '');
  const [field, setField] = useState(0);

  const save = () => {
    const cfg: { editor?: string; notesDir?: string } = {};
    if (editor.trim()) cfg.editor = editor.trim();
    if (notesDir.trim()) cfg.notesDir = notesDir.trim();
    saveConfig(cfg);
    onDone();
  };

  useInput((_input, key) => {
    if (key.escape) return onDone();
    if (key.upArrow) setField(0);
    if (key.downArrow) setField(1);
    if (key.tab) setField((f) => (f + 1) % 2);
  });

  // Effective values given what's currently typed (respects env overrides).
  const effEditor = resolveEditor({ editor: editor.trim() || undefined });
  const effDir = resolveNotesDir({ notesDir: notesDir.trim() || undefined });
  const editorEnv = editorOverride();
  const dirEnv = notesDirOverride();

  return (
    <Box flexDirection="column" padding={1}>
      <Text color="magenta" bold>
        quill · config
      </Text>

      <Box marginTop={1} flexDirection="column">
        <Box>
          <Text color={field === 0 ? 'magenta' : undefined}>
            {field === 0 ? '❯ ' : '  '}Editor:
          </Text>
          <TextInput
            value={editor}
            onChange={setEditor}
            onSubmit={save}
            focus={field === 0}
            placeholder="(unset)"
          />
        </Box>
        <Text dimColor>
          {'              '}
          {editorEnv
            ? `overridden by $${editorEnv} → ${effEditor}`
            : `effective: ${effEditor}`}
        </Text>

        <Box marginTop={1}>
          <Text color={field === 1 ? 'magenta' : undefined}>
            {field === 1 ? '❯ ' : '  '}Notes dir:
          </Text>
          <TextInput
            value={notesDir}
            onChange={setNotesDir}
            onSubmit={save}
            focus={field === 1}
            placeholder="(default: ~/.quill/notes)"
          />
        </Box>
        <Text dimColor>
          {'              '}
          {dirEnv
            ? `overridden by $${dirEnv} → ${effDir}`
            : `effective: ${effDir}`}
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>↑/↓ or tab switch field · enter save · esc cancel</Text>
      </Box>
    </Box>
  );
};
