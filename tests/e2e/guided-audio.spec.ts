import { expect, test } from '@playwright/test';

function makeWaveBuffer(seconds: number): Buffer {
  const sampleRate = 8000;
  const channels = 1;
  const bitsPerSample = 16;
  const blockAlign = (channels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const sampleCount = sampleRate * seconds;
  const dataSize = sampleCount * blockAlign;

  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let index = 0; index < sampleCount; index += 1) {
    const sample = Math.round(Math.sin((2 * Math.PI * 440 * index) / sampleRate) * 0.1 * 32767);
    buffer.writeInt16LE(sample, 44 + index * blockAlign);
  }

  return buffer;
}

test.describe('guided meditation audio', () => {
  test('uploads an audio guide and lists it in the audio manager', async ({ page }) => {
    await page.goto('/#/timer/guided-audio');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('guided-audio-upload-button')).toBeVisible();

    await page.getByTestId('guided-audio-upload-input').setInputFiles({
      name: 'Breath Guide.wav',
      mimeType: 'audio/wav',
      buffer: makeWaveBuffer(2),
    });

    await expect(page.getByTestId('guided-audio-upload-status')).toContainText('Added "Breath Guide"');
    await expect(page.getByTestId('guided-audio-list')).toContainText('Breath Guide');
  });

  test('guided mode without a default audio file redirects to the audio manager', async ({ page }) => {
    await page.goto('/#/timer');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('timer-mode-guided')).toBeVisible();
    await page.getByTestId('timer-mode-guided').click();

    await expect(page).toHaveURL(/\/timer\/guided-audio$/);
    await expect(page.getByTestId('guided-audio-upload-button')).toBeVisible();
  });

  test('guided session locks to the audio duration and completes when the file ends', async ({ page }) => {
    await page.goto('/#/timer/guided-audio');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('guided-audio-upload-input').setInputFiles({
      name: 'Silence Guide.wav',
      mimeType: 'audio/wav',
      buffer: makeWaveBuffer(2),
    });

    await expect(page.getByTestId('guided-audio-upload-status')).toContainText('Added "Silence Guide"');

    await page.goto('/#/settings/timer-defaults');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('setting-timer-default-guided-audio').selectOption({ label: 'Silence Guide' });
    await page.getByTestId('setting-timer-guided-cue-overlay').click();

    await page.goto('/#/timer');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('timer-mode-guided')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('timer-guided-duration')).toContainText('Duration locked to Silence Guide');
    await expect(page.getByTestId('timer-start')).toHaveText('Start guided session');

    await page.getByTestId('timer-start').click();

    await expect(page.getByTestId('timer-pause')).toBeVisible();
    await expect(page.getByTestId('timer-status')).toHaveText('Complete', { timeout: 15000 });
    await page.getByTestId('timer-details-toggle').click();
    await expect(page.getByTestId('timer-guided-audio-name')).toContainText('Silence Guide');
  });
});