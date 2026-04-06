import assert from 'node:assert/strict';
import test from 'node:test';

import {
    centeredDialogMotionClass,
    dialogOverlayMotionClass,
    fullscreenDialogMotionClass,
    sheetMotionClass,
    sheetSideMotionClass,
} from '@/components/ui/dialog-motion';

const sharedMotionClasses = [
    dialogOverlayMotionClass,
    centeredDialogMotionClass,
    fullscreenDialogMotionClass,
    sheetMotionClass,
];

test('shared dialog motion classes include enter and exit animations', () => {
    for (const motionClass of sharedMotionClasses) {
        assert.match(motionClass, /data-\[state=open\]:animate-in/);
        assert.match(motionClass, /data-\[state=closed\]:animate-out/);
        assert.match(motionClass, /data-\[state=closed\]:duration-200/);
        assert.match(motionClass, /data-\[state=open\]:duration-300/);
    }
});

test('sheet side motion classes include direction-specific enter and exit animations', () => {
    assert.match(
        sheetSideMotionClass.right,
        /data-\[state=closed\]:slide-out-to-right/,
    );
    assert.match(
        sheetSideMotionClass.right,
        /data-\[state=open\]:slide-in-from-right/,
    );
    assert.match(
        sheetSideMotionClass.left,
        /data-\[state=closed\]:slide-out-to-left/,
    );
    assert.match(
        sheetSideMotionClass.left,
        /data-\[state=open\]:slide-in-from-left/,
    );
    assert.match(
        sheetSideMotionClass.top,
        /data-\[state=closed\]:slide-out-to-top/,
    );
    assert.match(
        sheetSideMotionClass.top,
        /data-\[state=open\]:slide-in-from-top/,
    );
    assert.match(
        sheetSideMotionClass.bottom,
        /data-\[state=closed\]:slide-out-to-bottom/,
    );
    assert.match(
        sheetSideMotionClass.bottom,
        /data-\[state=open\]:slide-in-from-bottom/,
    );
});
