// @flow
import {bottom, collides, validateLayout, moveElement, compact, sortLayoutItemsByRowCol} from '../../lib/utils.js';
import assert from 'power-assert';

describe('bottom', () => {
  it('Handles an empty layout as input', () => {
    assert(bottom([]) === 0);
  });

  it('Returns the bottom coordinate of the layout', () => {
    assert(bottom([
      {x: 0, y: 1, w: 1, h: 1},
      {x: 1, y: 2, w: 1, h: 1}
    ]) === 3);
  });
});

describe('sortLayoutItemsByRowCol', () => {
  it('should sort by top to bottom right', () => {
    const layout = [
      {x: 1, y: 1, w: 1, h: 1, i: "2" },
      {x: 1, y: 0, w: 1, h: 1, i: "1" },
      {x: 0, y: 1, w: 2, h: 2, i: "3" }
    ];
    assert.deepEqual(sortLayoutItemsByRowCol(layout), [
      {x: 1, y: 0, w: 1, h: 1, i: "1" },
      {x: 0, y: 1, w: 2, h: 2, i: "3" },
      {x: 1, y: 1, w: 1, h: 1, i: "2" },
    ]);
  });
});

describe('collides', () => {
  it('Returns whether the layout items collide', () => {
    assert(collides(
      {x: 0, y: 1, w: 1, h: 1},
      {x: 1, y: 2, w: 1, h: 1}
    ) === false);
    assert(collides(
      {x: 0, y: 1, w: 1, h: 1},
      {x: 0, y: 1, w: 1, h: 1}
    ) === true);
  });
});

describe('validateLayout', () => {
  it('Validates an empty layout', () => {
    validateLayout([]);
  });
  it('Validates a populated layout', () => {
    validateLayout([
      {x: 0, y: 1, w: 1, h: 1},
      {x: 1, y: 2, w: 1, h: 1}
    ]);
  });
  it('Throws errors on invalid input', () => {
    assert.throws(() => {
      validateLayout([
        {x: 0, y: 1, w: 1, h: 1},
        {x: 1, y: 2, w: 1}
      ]);
    }, /layout\[1\]\.h must be a number!/i);
  });
});

describe('moveElement', () => {
  it('Does not change layout when colliding on no rearrangement mode', () => {
    const layout = [{x: 0, y: 1, w: 1, h: 1, moved: false}, {x: 1, y: 2, w: 1, h: 1, moved: false}];
    const layoutItem = layout[0];
    assert.deepEqual(moveElement(
      layout, layoutItem,
      1, 2, // x, y
      true, true // isUserAction, preventCollision
    ), [{x: 0, y: 1, w: 1, h: 1, moved: false}, {x: 1, y: 2, w: 1, h: 1, moved: false}]);
  });

  it('Does change layout when colliding in rearrangement mode', () => {
    const layout = [{x: 0, y: 0, w: 1, h: 1, moved: false}, {x: 1, y: 0, w: 1, h: 1, moved: false}];
    const layoutItem = layout[0];
    assert.deepEqual(moveElement(
      layout, layoutItem,
      1, 0, // x, y
      true, false, // isUserAction, preventCollision
      'vertical', 2 // compactType, cols
    ), [{x: 1, y: 0, w: 1, h: 1, moved: true}, {x: 1, y: 1, w: 1, h: 1, moved: true}]);
  });

  it('Moves elements out of the way without causing panel jumps when compaction is vertical', () => {
    const layout = [
      {x: 0, y: 0,  w: 1, h: 10, moved: false, i: 'A'},
      {x: 0, y: 10, w: 1, h: 1,  moved: false, i: 'B'},
      {x: 0, y: 11, w: 1, h: 1,  moved: false, i: 'C'},
    ];
    // move A down slightly so it collides with C; can cause C to jump above B.
    // We instead want B to jump above A (it has the room)
    const itemA = layout[0];
    assert.deepEqual(moveElement(
      layout, itemA,
      0, 1, // x, y
      true, false, // isUserAction, preventCollision
      'vertical', 10 // compactType, cols
    ), [
      {x: 0, y: 1,  w: 1, h: 10, moved: true, i: 'A'},
      {x: 0, y: 0,  w: 1, h: 1,  moved: true, i: 'B'},
      {x: 0, y: 11, w: 1, h: 1,  moved: false, i: 'C'},
    ]);
  });

  it('Calculates the correct collision when moving large object far', () => {
    const layout = [
      {x: 0, y: 0,  w: 1, h: 10, moved: false, i: 'A'},
      {x: 0, y: 10, w: 1, h: 1,  moved: false, i: 'B'},
      {x: 0, y: 11, w: 1, h: 1,  moved: false, i: 'C'},
    ];
    // Move A down by 2. This should move B above, but since we don't compact in between,
    // C should move below.
    const itemA = layout[0];
    assert.deepEqual(moveElement(
      layout, itemA,
      0, 2, // x, y
      true, false, // isUserAction, preventCollision
      'vertical', 10 // compactType, cols
    ), [
      {x: 0, y: 2, w: 1, h: 10, moved: true, i: 'A'},
      {x: 0, y: 1, w: 1, h: 1,  moved: true, i: 'B'},
      {x: 0, y: 12, w: 1, h: 1,  moved: true, i: 'C'},
    ]);
  });

  it('Moves elements out of the way without causing panel jumps when compaction is vertical (example case 13)', () => {
    const layout = [
      {x: 0, y: 0, w: 1, h: 1, i: 'A' },
      {x: 1, y: 0, w: 1, h: 1, i: 'B' },
      {x: 0, y: 1, w: 2, h: 2, i: 'C' }
    ];
    // move A over slightly so it collides with B; can cause C to jump above B
    // this test will check that that does not happen
    const itemA = layout[0];
    assert.deepEqual(moveElement(
      layout, itemA,
      1, 0, // x, y
      true, false, // isUserAction, preventCollision
      'vertical', 2 // compactType, cols
    ), [
      {x: 1, y: 0, w: 1, h: 1, i: 'A', moved: true },
      {x: 1, y: 1, w: 1, h: 1, i: 'B', moved: true },
      {x: 0, y: 2, w: 2, h: 2, i: 'C', moved: true }
    ]);
  });

  it('Moves elements out of the way without causing panel jumps when compaction is horizontal', () => {
    const layout = [
      {y: 0, x: 0,  h: 1,  w: 10, moved: false, i: 'A'},
      {y: 0, x: 11, h: 1,  w: 1,  moved: false, i: 'B'},
      {y: 0, x: 12, h: 1,  w: 1,  moved: false, i: 'C'},
    ];
    // move A over slightly so it collides with C; can cause C to jump left of B
    // this test will check that that does not happen
    const itemA = layout[0];
    assert.deepEqual(moveElement(
      layout, itemA,
      2, 0, // x, y
      true, false, // isUserAction, preventCollision
      'horizontal', 10 // compactType, cols
    ), [
      {y: 0, x: 2,  h: 1,  w: 10, moved: true, i: 'A'},
      {y: 0, x: 1,  h: 1,  w: 1,  moved: true, i: 'B'},
      {y: 0, x: 12, h: 1,  w: 1,  moved: false, i: 'C'},
    ]);
  });
});

describe('compact vertical', () => {
  it('Removes empty vertical space above item', () => {
    const layout = [{x: 0, y: 1, w: 1, h: 1}];
    assert.deepEqual(compact(layout, 'vertical', 10), [
      {x: 0, y: 0, w: 1, h: 1, moved: false}
    ]);
  });

  it('Resolve collision by moving item further down in array', () => {
    const layout = [
      {x: 0, y: 0, w: 1, h: 5, i: '1'},
      {x: 0, y: 1, w: 1, h: 1, i: '2'}
    ];
    assert.deepEqual(compact(layout, 'vertical', 10), [
      {x: 0, y: 0, w: 1, h: 5, i: '1', moved: false},
      {x: 0, y: 5, w: 1, h: 1, i: '2', moved: false}
    ]);
  });

  it('Handles recursive collision by moving new collisions out of the way before moving item down', () => {
    const layout = [
      {x: 0, y: 0, w: 2,  h: 5, i: '1'},
      {x: 0, y: 0, w: 10, h: 1, i: '2'},
      {x: 5, y: 1, w: 1,  h: 1, i: '3'},
      {x: 5, y: 2, w: 1,  h: 1, i: '4'},
      {x: 5, y: 3, w: 1,  h: 1, i: '5', static: true}
    ];
    assert.deepEqual(compact(layout, 'vertical', 10), [
      {x: 0, y: 0, w: 2,  h: 5, i: '1', moved: false},
      {x: 0, y: 5, w: 10, h: 1, i: '2', moved: false},
      {x: 5, y: 6, w: 1,  h: 1, i: '3', moved: false},
      {x: 5, y: 7, w: 1,  h: 1, i: '4', moved: false},
      {x: 5, y: 3, w: 1,  h: 1, i: '5', moved: false, static: true}
    ]);
  });

});

describe('compact horizontal', () => {
  it('compact horizontal should remove empty horizontal space to left of item', () => {
    const layout = [{x: 5, y: 5, w: 1, h: 1}];
    assert.deepEqual(compact(layout, 'horizontal', 10), [
      {x: 0, y: 0, w: 1, h: 1, moved: false}
    ]);
  });

  it('Resolve collision by moving item further to the right in array', () => {
    const layout = [
      {y: 0, x: 0, h: 1, w: 5, i: '1'},
      {y: 0, x: 1, h: 1, w: 1, i: '2'}
    ];
    assert.deepEqual(compact(layout, 'horizontal', 10), [
      {y: 0, x: 0, h: 1, w: 5, i: '1', moved: false},
      {y: 0, x: 5, h: 1, w: 1, i: '2', moved: false}
    ]);
  });

  it('Handles recursive collision by moving new collisions out of the way before moving item to the right', () => {
    const layout = [
      {y: 0, x: 0, h: 2,  w: 5, i: '1'},
      {y: 0, x: 0, h: 10, w: 1, i: '2'},
      {y: 5, x: 1, h: 1,  w: 1, i: '3'},
      {y: 5, x: 2, h: 1,  w: 1, i: '4'},
      {y: 5, x: 2, h: 1,  w: 1, i: '5', static: true}
    ];
    assert.deepEqual(compact(layout, 'horizontal', 10), [
      {y: 0, x: 0, h: 2,  w: 5, i: '1', moved: false},
      {y: 0, x: 5, h: 10, w: 1, i: '2', moved: false},
      {y: 5, x: 6, h: 1,  w: 1, i: '3', moved: false},
      {y: 5, x: 7, h: 1,  w: 1, i: '4', moved: false},
      {y: 5, x: 2, h: 1,  w: 1, i: '5', moved: false, static: true}
    ]);
  });
});


