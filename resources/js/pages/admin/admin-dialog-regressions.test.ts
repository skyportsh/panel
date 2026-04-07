import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const dialogPath = resolve(
    import.meta.dirname,
    '../../components/ui/dialog.tsx',
);

const nodesPagePath = resolve(import.meta.dirname, 'nodes.tsx');
const cargoPagePath = resolve(import.meta.dirname, 'cargo.tsx');
const usersPagePath = resolve(import.meta.dirname, 'users.tsx');
const locationsPagePath = resolve(import.meta.dirname, 'locations.tsx');
const serversPagePath = resolve(import.meta.dirname, 'servers.tsx');

test('fullscreen dialogs use inset sizing without outer overflow', () => {
    const dialogContents = readFileSync(dialogPath, 'utf8');

    assert.match(dialogContents, /fixed inset-4 z-50 flex min-h-0 flex-col overflow-hidden/);
    assert.match(dialogContents, /sm:inset-6 lg:inset-8/);
});

test('admin fullscreen dialog bodies only scroll inside the content area', () => {
    const pagePaths = [
        nodesPagePath,
        cargoPagePath,
        usersPagePath,
        locationsPagePath,
        serversPagePath,
    ];

    for (const pagePath of pagePaths) {
        const pageContents = readFileSync(pagePath, 'utf8');

        assert.match(
            pageContents,
            /min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-6 py-6/,
        );
    }
});

test('node allocations and cargo variables use table-style admin shells', () => {
    const nodesContents = readFileSync(nodesPagePath, 'utf8');
    const cargoContents = readFileSync(cargoPagePath, 'utf8');

    assert.match(
        nodesContents,
        /Bind ports to this node for server[\s\S]*relative flex items-center px-4 py-2\.5[\s\S]*overflow-hidden rounded-lg border border-border\/70 bg-background/,
    );
    assert.match(
        cargoContents,
        /Review environment variables exposed by this[\s\S]*relative flex items-center gap-4 px-4 py-2\.5[\s\S]*overflow-hidden rounded-lg border border-border\/70 bg-background/,
    );
});
