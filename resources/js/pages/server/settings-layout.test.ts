import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const settingsPagePath = resolve(import.meta.dirname, 'settings.tsx');

test('server settings page uses the simplified copy and taller startup select', () => {
    const settingsPageContents = readFileSync(settingsPagePath, 'utf8');

    assert.match(
        settingsPageContents,
        /description="Change your server's name\."/,
    );
    assert.doesNotMatch(
        settingsPageContents,
        /Rename the server without changing its allocation or cargo\./,
    );
    assert.doesNotMatch(settingsPageContents, /Startup behaviour/);
    assert.doesNotMatch(settingsPageContents, /Selected runtime/);
    assert.match(settingsPageContents, /className="min-h-16 w-full py-3"/);
});
