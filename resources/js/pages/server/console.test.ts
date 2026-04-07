import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const consolePagePath = resolve(import.meta.dirname, 'console.tsx');

test('server console page uses the admin-style title format and simplified websocket console layout', () => {
    const consolePageContents = readFileSync(consolePagePath, 'utf8');

    assert.match(
        consolePageContents,
        /<Head title=\{`\$\{server\.name\} — Console`\} \/>/,
    );
    assert.match(consolePageContents, /<ServerStatusDot status=\{effectiveState\} \/>/);
    assert.match(consolePageContents, /label="IP address"/);
    assert.match(consolePageContents, /label="Node"/);
    assert.match(consolePageContents, /label="Cargo"/);
    assert.match(consolePageContents, /PlaceholderPattern/);
    assert.match(consolePageContents, /overflow-hidden rounded-xl border border-border\/70 bg-background shadow-sm/);
    assert.match(consolePageContents, /relative overflow-hidden border-t border-border\/70 bg-muted\/15 p-2/);
    assert.match(consolePageContents, /Waiting for console output/);
    assert.match(consolePageContents, /Connecting\.\.\./);
    assert.match(consolePageContents, /Requesting console logs\.\.\./);
    assert.match(consolePageContents, /event: "send logs"/);
    assert.match(consolePageContents, /event: "send command"/);
    assert.match(consolePageContents, /Type a command and press enter/);
    assert.match(consolePageContents, /const showKillInStopSlot =/);
    assert.match(consolePageContents, /effectiveState === "starting" \|\| effectiveState === "stopping"/);
    assert.match(consolePageContents, /<Play \/>[\s\S]*Start[\s\S]*<RotateCw \/>[\s\S]*Restart[\s\S]*<Square \/>[\s\S]*Stop/);
    assert.match(consolePageContents, /variant="secondary"[\s\S]*<Square \/>[\s\S]*Stop/);
    assert.match(consolePageContents, /variant="secondary"[\s\S]*<X \/>[\s\S]*Kill/);
    assert.match(consolePageContents, /line\.tone === "system" \? "\[Skyport Daemon\]: " : null/);
    assert.match(consolePageContents, /line\.tone === "input" \? "> " : null/);
    assert.match(consolePageContents, /ansiSegments/);
    assert.doesNotMatch(consolePageContents, /container@pterodactyl/);
    assert.doesNotMatch(consolePageContents, /Sent Command/);
    assert.doesNotMatch(consolePageContents, /Connected to console\./);
    assert.doesNotMatch(consolePageContents, /Control the server lifecycle/);
    assert.doesNotMatch(consolePageContents, /Live console/);
});
