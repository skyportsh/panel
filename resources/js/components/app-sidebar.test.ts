import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const sidebarPath = resolve(import.meta.dirname, 'app-sidebar.tsx');

test('server sidebar uses direct actions with networking as the only grouped section', () => {
    const sidebarContents = readFileSync(sidebarPath, 'utf8');

    assert.match(sidebarContents, /title: "Console"/);
    assert.match(sidebarContents, /title: "Files"/);
    assert.match(sidebarContents, /title: "Networking"/);
    assert.match(sidebarContents, /pinnable: false/);
    assert.match(sidebarContents, /title: "Allocations"/);
    assert.match(sidebarContents, /title: "Firewall"/);
    assert.match(sidebarContents, /title: "Interconnect"/);
    assert.match(sidebarContents, /title: "Settings"/);
    assert.doesNotMatch(sidebarContents, /title: server\.name/);
});
