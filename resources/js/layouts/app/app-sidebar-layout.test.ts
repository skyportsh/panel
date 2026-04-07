import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const layoutPath = resolve(
    import.meta.dirname,
    'app-sidebar-layout.tsx',
);

const commandPalettePath = resolve(
    import.meta.dirname,
    '../../components/command-palette.tsx',
);

test('app sidebar layout does not mount the command palette', () => {
    const layoutContents = readFileSync(layoutPath, 'utf8');

    assert.doesNotMatch(layoutContents, /CommandPalette/);
    assert.doesNotMatch(layoutContents, /command-palette/);
});

test('command palette component has been removed', () => {
    assert.equal(existsSync(commandPalettePath), false);
});
