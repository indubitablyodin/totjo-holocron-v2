import { spawn } from 'node:child_process';
import path from 'node:path';

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 'unknown'}`));
    });
    child.on('error', reject);
  });
}

const forwardedArgs = process.argv.slice(2).flatMap((argument) => {
  if (argument === '--') {
    return [];
  }

  if (argument === '--runInBand') {
    return ['--maxWorkers=1'];
  }

  return [argument];
});

const vitestEntryPath = path.resolve(process.cwd(), 'node_modules/vitest/vitest.mjs');

await run(process.execPath, ['--test', 'tests/policy-validation.test.cjs']);
await run(process.execPath, [vitestEntryPath, 'run', ...forwardedArgs]);
