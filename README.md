# Astromi

Astromi is a mobile astrology application with a Node.js API, Firebase-backed
authentication, and a RabbitMQ notification worker.

## Project layout

- `mobile-app/` — Expo and React Native application
- `main-api/` — API for profiles, chat, and notifications
- `notification-service/` — RabbitMQ consumer and Firebase Cloud Messaging worker
- Root-level files — an additional API implementation

## Local configuration

Copy the relevant `.env.example` to `.env` in each service directory and replace
the sample values with your own local configuration. Never commit `.env` files.

Firebase Admin SDK services also need a Firebase service-account JSON file
downloaded from your own Firebase project. Keep it at the path configured by
`GOOGLE_APPLICATION_CREDENTIALS`; service-account files are ignored by Git.

For Android builds, download your own `google-services.json` from Firebase and
place it in `mobile-app/`. This file is intentionally not included.

The mobile app reads Firebase web configuration from `mobile-app/.env`. Expo
`EXPO_PUBLIC_` values are included in the app bundle, so they are not suitable
for private credentials. Restrict Firebase API keys in the provider console.
Set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` there for native Google sign-in. The
Android package name in `mobile-app/app.json` is a generic placeholder; register
that package name in your Firebase project or replace it with your own.

Install dependencies in the service directory you intend to run, then use its
`npm start` script. MongoDB and RabbitMQ must be available for the corresponding
services.
