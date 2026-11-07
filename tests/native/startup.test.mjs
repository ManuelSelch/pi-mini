import { test } from 'node:test';
import { NativeDriver } from '../support/native-driver.mjs';

test('the native WebView initializes a session on an external shared-server fixture in a fixed-size window', async () => {
  const app = new NativeDriver();
  await app.launch();

  app.expectFixedCompanionWindow();
  app.expectRealSessionReady();
});
