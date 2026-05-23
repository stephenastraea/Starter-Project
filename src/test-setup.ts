import '@testing-library/jest-dom/vitest';
import { Blob as NodeBlob } from 'node:buffer';

// jsdom installs a Blob that lacks `.stream()`, which breaks Web Streams interop.
// Restore Node's native Blob (which implements stream()) for tests that need it.
if (typeof (globalThis as { Blob: typeof Blob }).Blob.prototype.stream !== 'function') {
  (globalThis as unknown as { Blob: unknown }).Blob = NodeBlob;
}
