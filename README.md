# fiscalizacionApp

This is an Ionic React project using Vite.

## Prerequisites

- **Node.js** 18 or later
- (Optional) **Xvfb** for running Cypress e2e tests on headless Linux

## Setup

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

The app will be available at [http://localhost:5173](http://localhost:5173).

### API server

Start the Express API with:

```bash
npm run start:server
```

By default it listens on port `3000` as defined in `server/index.js`.

You can point the frontend to a different API by setting `VITE_API_URL`:

```bash
VITE_API_URL=http://myhost:3000 npm run dev
```

## Linting

Run ESLint to analyze the project:

```bash
npm run lint
```

## Unit tests

Execute unit tests with Vitest:

```bash
npm run test.unit
```

## End-to-end tests

Make sure the dev server is running, then run Cypress:

```bash
npm run test.e2e
```

## Building an Android APK

This project uses Capacitor to generate native Android binaries. To build an APK:

1. Install **Android Studio** and ensure the Android SDK tools are available in your PATH.
2. Build the web assets and sync them to the Android platform:

   ```bash
   npm run build.android
   ```

3. Open the Android project in Android Studio:

   ```bash
   npm run open.android
   ```

4. In Android Studio, use **Build > Build Bundle(s) / APK(s)** to create the APK.


## Shared Components

Reusable UI components are available under `src/components`. These wrappers apply common Tailwind styles on top of Ionic elements:

```tsx
import { Button, Input, Card } from './src/components';

<Button expand="block">Click me</Button>
<Input value={text} onIonChange={...} />
<Card>Content</Card>
```

Use them in pages instead of raw `IonButton` or `IonInput` for a consistent look.
