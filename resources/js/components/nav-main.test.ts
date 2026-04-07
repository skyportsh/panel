import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const navMainPath = resolve(import.meta.dirname, 'nav-main.tsx');

test('grouped nav items can disable pinning and keep the chevron aligned right', () => {
    const navMainContents = readFileSync(navMainPath, 'utf8');

    assert.match(navMainContents, /const isPinnable = item\.pinnable !== false;/);
    assert.match(navMainContents, /ChevronRight className="ml-auto/);
    assert.match(navMainContents, /\{isPinnable \? \(/);
});
