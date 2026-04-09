const extensionLanguageMap = new Map<string, string>([
    ['.c', 'c'],
    ['.cfg', 'ini'],
    ['.conf', 'ini'],
    ['.cpp', 'cpp'],
    ['.cs', 'csharp'],
    ['.css', 'css'],
    ['.dockerfile', 'dockerfile'],
    ['.env', 'shell'],
    ['.go', 'go'],
    ['.html', 'html'],
    ['.ini', 'ini'],
    ['.java', 'java'],
    ['.js', 'javascript'],
    ['.json', 'json'],
    ['.kt', 'kotlin'],
    ['.log', 'plaintext'],
    ['.lua', 'lua'],
    ['.md', 'markdown'],
    ['.mjs', 'javascript'],
    ['.php', 'php'],
    ['.properties', 'ini'],
    ['.py', 'python'],
    ['.rb', 'ruby'],
    ['.rs', 'rust'],
    ['.sh', 'shell'],
    ['.sql', 'sql'],
    ['.toml', 'toml'],
    ['.ts', 'typescript'],
    ['.tsx', 'typescript'],
    ['.txt', 'plaintext'],
    ['.xml', 'xml'],
    ['.yaml', 'yaml'],
    ['.yml', 'yaml'],
    ['.zsh', 'shell'],
]);

export function detectEditorLanguage(path: string): string {
    const fileName = path.split('/').pop()?.toLowerCase() ?? '';

    if (fileName === 'dockerfile') {
        return 'dockerfile';
    }

    if (fileName === '.env' || fileName.startsWith('.env.')) {
        return 'shell';
    }

    const matchedExtension = [...extensionLanguageMap.keys()]
        .filter((extension) => fileName.endsWith(extension))
        .toSorted((left, right) => right.length - left.length)[0];

    if (!matchedExtension) {
        return 'plaintext';
    }

    return extensionLanguageMap.get(matchedExtension) ?? 'plaintext';
}
