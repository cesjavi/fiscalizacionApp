# fiscalizacionApp

This is an Ionic React project using Vite.

## Descripción de la aplicación

- Autenticación con Firebase Authentication para registro e inicio de sesión. El
  registro guarda el DNI directamente en Firestore, lo que permite habilitar
  un login alternativo por DNI sin necesidad de un backend.
- Flujo de selección de mesa (`SelectMesa`) que guarda la mesa elegida en `localStorage`.
- Gestión de votantes offline con Dexie en las páginas `AddVoter` y `VoterList`.
- Carga de resultados de escrutinio desde `Escrutinio`, incluyendo el almacenamiento de la foto final.
- Páginas de ejemplo adicionales como `VoterCount` y otras.

**Nota**: la aplicación no requiere un servidor backend; el directorio `server/`
corresponde a una implementación previa y puede ignorarse.

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

## API configuration

The authentication endpoint is built from the `VITE_API_BASE` environment variable.
Set it to the base URL of your backend (omit `/api` and the trailing slash) when running
or building the app:

```bash
VITE_API_BASE="https://api.example.com" npm run dev
VITE_API_BASE="https://api.example.com" npm run build
```

If `VITE_API_BASE` is not provided, the app defaults to
`http://api.lalibertadavanzacomuna7.com`.

### Fiscalización credentials

The fiscalización lookup page requires credentials to authenticate against the
API. Provide them through the following environment variables:

```
VITE_FISCALIZACION_USER=<usuario>
VITE_FISCALIZACION_PASS=<password>
```

Add these variables to your environment or `.env` file when running or building
the app.

## Firebase configuration

Copy `.env.example` to `.env` and add your Firebase project keys:

```bash
cp .env.example .env
# edit .env
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

## User authentication

User accounts are handled directly through **Firebase Authentication**. Al
registrarse se guarda el DNI en Firestore, lo que permite implementar un
login alternativo por DNI sin necesidad de un backend.

### Registering and logging in

Create an account on the **Register** page using your email, DNI and password.
Then sign in on the **Login** page with the same email and password. During
registration, the DNI is stored in Firestore and can be used later for an
optional DNI-based login without any backend.

## Local database

The app now stores its offline data using **IndexedDB** through the
[Dexie](https://dexie.org) library. Most desktop browsers allow sites to use
roughly 50% of the available disk space for IndexedDB. Mobile browsers often set
stricter limits in the range of 50–100 MB.

### Clearing the database

During development or testing you may need to remove the local database. Open
your browser's developer tools and locate **Application › IndexedDB**. From
there you can delete the `fiscalizacionApp` database. You can also run the
following snippet in the console:

```javascript
indexedDB.deleteDatabase('fiscalizacionApp');
```

Reload the app to recreate an empty database.
