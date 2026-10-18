import 'fake-indexeddb/auto';

// jsdom has no object URLs; images just need a stable string.
let n = 0;
if (!URL.createObjectURL) URL.createObjectURL = () => `blob:test/${++n}`;
if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {};
