import { NativeDriver } from '../support/native-driver.mjs';

// Explicit opt-in: uses the configured provider and can incur model charges.
const app = new NativeDriver();
await app.launch({ model: true });
app.expectFixedCompanionWindow();
app.expectRealSessionReady();
console.log('Real native model response:', app.expectModelResponse());
