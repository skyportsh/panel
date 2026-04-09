import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const sidebarPath = resolve(import.meta.dirname, 'app-sidebar.tsx');

test('server sidebar includes the compact server card, switcher, and power actions', () => {
    const sidebarContents = readFileSync(sidebarPath, 'utf8');

    assert.match(sidebarContents, /function ServerSidebarCard/);
    assert.match(sidebarContents, /<PlaceholderPattern/);
    assert.match(
        sidebarContents,
        /border-sidebar-border\/70 bg-transparent px-2\.5 py-1\.5/,
    );
    assert.match(
        sidebarContents,
        /truncate text-sm font-semibold text-sidebar-foreground/,
    );
    assert.match(sidebarContents, /Toggle server switcher/);
    assert.match(sidebarContents, /serverHrefForPage/);
    assert.match(sidebarContents, /active:scale-95/);
    assert.match(sidebarContents, /max-h-64 opacity-100/);
    assert.match(sidebarContents, /max-h-0 opacity-0/);
    assert.match(sidebarContents, /No other servers yet\./);
    assert.match(sidebarContents, /Open server power actions/);
    assert.match(sidebarContents, />\s*Start\s*</);
    assert.match(sidebarContents, />\s*Restart\s*</);
    assert.match(sidebarContents, />\s*Stop\s*</);
    assert.match(sidebarContents, />\s*Kill\s*</);
});
