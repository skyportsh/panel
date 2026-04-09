import type { BeforeMount, OnMount } from '@monaco-editor/react';
type EditorComponentType = (typeof import('@monaco-editor/react'))['default'];
type MonacoInstance = Parameters<BeforeMount>[0];
type MonacoEditorInstance = Parameters<OnMount>[0];
import { useEffect, useMemo, useRef, useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { useAppearance } from '@/hooks/use-appearance';
import { detectEditorLanguage } from '@/lib/file-editor-language';

const LIGHT_THEME = 'skyport-light';
const DARK_THEME = 'skyport-dark';

function defineThemes(monaco: MonacoInstance): void {
    monaco.editor.defineTheme(LIGHT_THEME, {
        base: 'vs',
        inherit: true,
        colors: {
            'editor.background': '#ffffff',
            'editor.foreground': '#0f172a',
            'editor.lineHighlightBackground': '#f4f4f5',
            'editor.selectionBackground': '#d9240026',
            'editor.inactiveSelectionBackground': '#d9240014',
            'editorCursor.foreground': '#d92400',
            'editorWhitespace.foreground': '#d4d4d8',
            'editorIndentGuide.background1': '#e4e4e7',
            'editorLineNumber.foreground': '#a1a1aa',
            'editorLineNumber.activeForeground': '#18181b',
            'editorGutter.background': '#ffffff',
            'editorBracketMatch.background': '#d9240012',
            'editorBracketMatch.border': '#d9240035',
            'editorSuggestWidget.background': '#ffffff',
            'editorSuggestWidget.border': '#e4e4e7',
            'editorWidget.background': '#ffffff',
        },
        rules: [
            { token: 'comment', foreground: '64748b' },
            { token: 'keyword', foreground: 'c2410c', fontStyle: 'bold' },
            { token: 'string', foreground: '0f766e' },
            { token: 'number', foreground: '7c3aed' },
            { token: 'type', foreground: '2563eb' },
            { token: 'delimiter', foreground: '52525b' },
        ],
    });

    monaco.editor.defineTheme(DARK_THEME, {
        base: 'vs-dark',
        inherit: true,
        colors: {
            'editor.background': '#09090b',
            'editor.foreground': '#e4e4e7',
            'editor.lineHighlightBackground': '#18181b',
            'editor.selectionBackground': '#d9240033',
            'editor.inactiveSelectionBackground': '#d924001f',
            'editorCursor.foreground': '#ff5b36',
            'editorWhitespace.foreground': '#3f3f46',
            'editorIndentGuide.background1': '#27272a',
            'editorLineNumber.foreground': '#71717a',
            'editorLineNumber.activeForeground': '#fafafa',
            'editorGutter.background': '#09090b',
            'editorBracketMatch.background': '#d9240017',
            'editorBracketMatch.border': '#d9240047',
            'editorSuggestWidget.background': '#111113',
            'editorSuggestWidget.border': '#27272a',
            'editorWidget.background': '#111113',
        },
        rules: [
            { token: 'comment', foreground: '71717a' },
            { token: 'keyword', foreground: 'fb923c', fontStyle: 'bold' },
            { token: 'string', foreground: '34d399' },
            { token: 'number', foreground: 'c084fc' },
            { token: 'type', foreground: '60a5fa' },
            { token: 'delimiter', foreground: 'd4d4d8' },
        ],
    });
}

export default function CodeEditor({
    path,
    value,
    onChange,
}: {
    path: string;
    value: string;
    onChange: (value: string) => void;
}) {
    const { resolvedAppearance } = useAppearance();
    const [EditorComponent, setEditorComponent] =
        useState<EditorComponentType | null>(null);
    const editorRef = useRef<MonacoEditorInstance | null>(null);
    const monacoRef = useRef<MonacoInstance | null>(null);
    const language = useMemo(() => detectEditorLanguage(path), [path]);
    const theme = resolvedAppearance === 'dark' ? DARK_THEME : LIGHT_THEME;

    useEffect(() => {
        let mounted = true;

        import('@monaco-editor/react').then((module) => {
            if (mounted) {
                setEditorComponent(() => module.default);
            }
        });

        return () => {
            mounted = false;
        };
    }, []);

    const beforeMount: BeforeMount = (monaco) => {
        defineThemes(monaco);
        monacoRef.current = monaco;
    };

    const onMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;
        monaco.editor.setTheme(theme);
    };

    useEffect(() => {
        if (monacoRef.current) {
            monacoRef.current.editor.setTheme(theme);
        }
    }, [theme]);

    return (
        <div className="h-[68vh] overflow-hidden bg-background">
            {EditorComponent ? (
                <EditorComponent
                    beforeMount={beforeMount}
                    defaultLanguage={language}
                    language={language}
                    onMount={onMount}
                    onChange={(nextValue: string | undefined) =>
                        onChange(nextValue ?? '')
                    }
                    options={{
                        automaticLayout: true,
                        bracketPairColorization: { enabled: true },
                        cursorBlinking: 'smooth',
                        fontFamily:
                            'JetBrains Mono, SFMono-Regular, ui-monospace, monospace',
                        fontLigatures: true,
                        fontSize: 13,
                        lineHeight: 22,
                        minimap: { enabled: false },
                        padding: { top: 16, bottom: 16 },
                        renderWhitespace: 'selection',
                        roundedSelection: true,
                        scrollbar: {
                            alwaysConsumeMouseWheel: false,
                            verticalScrollbarSize: 10,
                        },
                        smoothScrolling: true,
                        wordWrap: 'on',
                    }}
                    path={path}
                    theme={theme}
                    value={value}
                />
            ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    <Spinner />
                    <span className="ml-3">Loading editor...</span>
                </div>
            )}
        </div>
    );
}
