import fs from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import type { Connect, Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const testSyncStorePath = path.resolve(rootDir, '.sisyphus', 'tmp', 'test-sync-store.json');

function getBasePath() {
  if (process.env.GITHUB_PAGES !== 'true') {
    return '/';
  }

  const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'totjo-holocron-v2';
  return `/${repositoryName}/`;
}

type TestSyncStore = Record<string, unknown>;

function sendJson(response: ServerResponse, statusCode: number, payload: unknown) {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(payload));
}

async function ensureTestSyncStoreFile() {
  await fs.mkdir(path.dirname(testSyncStorePath), { recursive: true });

  try {
    await fs.access(testSyncStorePath);
  } catch {
    await fs.writeFile(testSyncStorePath, JSON.stringify({}), 'utf8');
  }
}

async function readTestSyncStore(): Promise<TestSyncStore> {
  await ensureTestSyncStoreFile();

  try {
    return JSON.parse(await fs.readFile(testSyncStorePath, 'utf8')) as TestSyncStore;
  } catch {
    return {};
  }
}

async function writeTestSyncStore(store: TestSyncStore) {
  await ensureTestSyncStoreFile();
  await fs.writeFile(testSyncStorePath, JSON.stringify(store, null, 2), 'utf8');
}

async function readRequestBody(request: IncomingMessage): Promise<string> {
  const chunks: Uint8Array[] = [];

  for await (const chunk of request) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks).toString('utf8');
}

async function handleTestSyncApi(
  request: IncomingMessage,
  response: ServerResponse,
  next: Connect.NextFunction,
) {
  const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');

  if (requestUrl.pathname !== '/api/test-sync/profile') {
    next();
    return;
  }

  if (request.method === 'GET') {
    const userId = requestUrl.searchParams.get('userId');

    if (!userId) {
      sendJson(response, 400, { error: 'Missing userId query parameter.' });
      return;
    }

    const store = await readTestSyncStore();
    sendJson(response, 200, { profile: store[userId] ?? null });
    return;
  }

  if (request.method === 'DELETE') {
    const userId = requestUrl.searchParams.get('userId');

    if (!userId) {
      sendJson(response, 400, { error: 'Missing userId query parameter.' });
      return;
    }

    const store = await readTestSyncStore();
    delete store[userId];
    await writeTestSyncStore(store);
    sendJson(response, 200, { cleared: true });
    return;
  }

  if (request.method === 'PUT') {
    const rawBody = await readRequestBody(request);
    const payload = JSON.parse(rawBody || '{}') as {
      userId?: string;
      profile?: unknown;
    };

    if (!payload.userId || payload.profile === undefined) {
      sendJson(response, 400, { error: 'PUT body must include userId and profile.' });
      return;
    }

    const store = await readTestSyncStore();
    store[payload.userId] = payload.profile;
    await writeTestSyncStore(store);
    sendJson(response, 200, { saved: true });
    return;
  }

  sendJson(response, 405, { error: 'Method not allowed.' });
}

function testSyncApiPlugin(): Plugin {
  const middleware: Connect.NextHandleFunction = (request, response, next) => {
    void handleTestSyncApi(request, response, next).catch((error: unknown) => {
      next(error as Error);
    });
  };

  return {
    name: 'totjo-test-sync-api',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig({
  base: getBasePath(),
  plugins: [
    react(),
    testSyncApiPlugin(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectRegister: false,
      includeAssets: ['apple-touch-icon.png', 'favicon.png', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: false,
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,json,png,svg,webmanifest,wav,mp3}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    css: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
