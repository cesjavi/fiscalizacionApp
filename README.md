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

## Backend API

The Express API now uses **SQLite** for data persistence. The database file
`server/data.db` is created automatically when starting the server.

Install the backend dependencies and start the server:

```bash
cd server
npm install
```

The API stores user accounts in Firestore using Firebase Admin. Set the
`GOOGLE_APPLICATION_CREDENTIALS` environment variable to the path of your
service account JSON file before starting the server:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
node index.js
```

This initializes the database tables and serves the API on port `3000`.

### User registration and login

New users register by sending their **DNI** and a password to the `/api/users`
endpoint:

```bash
curl -X POST http://localhost:3000/api/users \
  -H 'Content-Type: application/json' \
  -d '{"username":"12345678","password":"secret"}'
```

After registering, log in on the `/login` page of the app using the same
DNI and password.

Passwords for users are now hashed using **bcryptjs**. Any existing entries in
the `users` table that stored plaintext passwords will no longer work for
authentication. Delete those rows or recreate the database after updating.

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
