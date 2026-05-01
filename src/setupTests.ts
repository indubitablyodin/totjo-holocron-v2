import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

import { resetPwaUpdateStateForTests } from '@/app/pwaUpdate';

afterEach(() => {
  resetPwaUpdateStateForTests();
  cleanup();
});
