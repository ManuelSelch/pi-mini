import { test } from 'node:test';
import { NativeDriver } from '../support/native-driver.mjs';

test('the native WebView connects through the SDK to a real isolated runtime in a fixed-size window', async () => {
  const app = new NativeDriver();
  await app.launch();

  app.expectFixedCompanionWindow();
  app.expectRealSessionReady();
});
