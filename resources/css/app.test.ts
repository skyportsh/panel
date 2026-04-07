import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const cssPath = resolve(import.meta.dirname, 'app.css');
const fontDir = resolve(import.meta.dirname, '../../public/fonts/ioskeley-mono');

test('app css configures Ioskeley Mono as the mono font family', () => {
    const css = readFileSync(cssPath, 'utf8');

    assert.match(css, /font-family: 'Ioskeley Mono';/);
    assert.match(css, /--font-mono:[\s\S]*'Ioskeley Mono'/);
    assert.match(css, /code,[\s\S]*pre,[\s\S]*font-family: var\(--font-mono\)/);
});

test('required Ioskeley Mono webfont files are present', () => {
    for (const file of [
        'IoskeleyMono-Regular.woff2',
        'IoskeleyMono-Italic.woff2',
        'IoskeleyMono-Medium.woff2',
        'IoskeleyMono-MediumItalic.woff2',
        'IoskeleyMono-SemiBold.woff2',
        'IoskeleyMono-SemiBoldItalic.woff2',
        'IoskeleyMono-Bold.woff2',
        'IoskeleyMono-BoldItalic.woff2',
    ]) {
        assert.equal(existsSync(resolve(fontDir, file)), true, `${file} is missing`);
    }
});
