'use client';

import Editor, {
  type OnMount,
} from '@monaco-editor/react';

import styles from './editor.module.css';

/* =========================================================
   PROPS
========================================================= */

type CodeEditorProps = {
  value: string;

  language: string;

  onChange: (
    value: string,
  ) => void;

  readOnly?: boolean;
};

/* =========================================================
   MONACO LANGUAGE MAPPING
========================================================= */

function getMonacoLanguage(
  language: string,
) {
  const languages: Record<
    string,
    string
  > = {
    c: 'c',

    cpp: 'cpp',

    csharp: 'csharp',

    java: 'java',

    python: 'python',

    javascript:
      'javascript',

    typescript:
      'typescript',

    go: 'go',

    ruby: 'ruby',

    swift: 'swift',

    git: 'shell',

    html: 'html',

    css: 'css',

    sql: 'sql',

    json: 'json',
  };

  return (
    languages[language] ??
    'plaintext'
  );
}

/* =========================================================
   COMPONENT
========================================================= */

export default function CodeEditor({
  value,

  language,

  onChange,

  readOnly = false,
}: CodeEditorProps) {
  const monacoLanguage =
    getMonacoLanguage(
      language,
    );

  /* =======================================================
     EDITOR MOUNT
  ======================================================= */

  const handleMount:
    OnMount = (
    editor,
  ) => {
    /*
     * Put keyboard focus
     * directly inside editor.
     */

    editor.focus();
  };

  return (
    <div
      className={
        styles.editorShell
      }
    >
      <Editor
        height="100%"
        width="100%"
        language={
          monacoLanguage
        }
        value={
          value
        }
        theme="vs-dark"
        onMount={
          handleMount
        }
        onChange={(
          nextValue,
        ) => {
          onChange(
            nextValue ?? '',
          );
        }}
        loading={
          <div
            className={
              styles.loading
            }
          >
            Loading editor...
          </div>
        }
        options={{
          readOnly,

          automaticLayout:
            true,

          fontSize:
            13,

          lineHeight:
            21,

          fontFamily:
            'Consolas, Monaco, "Courier New", monospace',

          minimap: {
            enabled:
              true,
          },

          scrollBeyondLastLine:
            false,

          wordWrap:
            'off',

          tabSize:
            4,

          insertSpaces:
            true,

          detectIndentation:
            false,

          renderWhitespace:
            'selection',

          bracketPairColorization: {
            enabled:
              true,
          },

          guides: {
            bracketPairs:
              true,

            indentation:
              true,
          },

          cursorBlinking:
            'smooth',

          cursorSmoothCaretAnimation:
            'on',

          smoothScrolling:
            true,

          mouseWheelZoom:
            true,

          folding:
            true,

          lineNumbers:
            'on',

          glyphMargin:
            false,

          renderLineHighlight:
            'line',

          padding: {
            top:
              12,

            bottom:
              12,
          },

          scrollbar: {
            verticalScrollbarSize:
              9,

            horizontalScrollbarSize:
              9,
          },

          overviewRulerBorder:
            false,

          hideCursorInOverviewRuler:
            true,

          contextmenu:
            true,

          quickSuggestions: {
            other:
              true,

            comments:
              false,

            strings:
              false,
          },

          suggestOnTriggerCharacters:
            true,

          acceptSuggestionOnEnter:
            'on',

          formatOnPaste:
            false,

          formatOnType:
            false,
        }}
      />
    </div>
  );
}