# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Testing payments locally

Payments run through Cloud Functions, so local testing uses the Firebase
Emulator Suite under the offline `demo-surama` project — nothing touches the
real `surama-app` data. Requires Java 21+ (for the Firestore emulator).

**Automated check** — starts the emulators, seeds them, runs every payment
scenario (deposit, failed/cancelled/successful balance, guard rails), then
shuts down:

    npm run test:payments

**Clicking through in the browser** — three terminals:

    npm run emulators      # Emulator UI at http://127.0.0.1:4000
    npm run seed           # once the emulators are up; re-run to reset
    npm run dev:emulator   # app at http://localhost:5173

Sign in with password `password123` as `consumer@test.local`,
`provider@test.local` or `admin@test.local`. The consumer's requests are
seeded at each payment stage: one awaiting provider acceptance, one ready for
the deposit, and one ready for the balance. Payments use the Test plugin
(simulate success / failure / cancel); PayPal and MMG stay gated until their
sandbox credentials are in `functions/.env`.
