# Audio Frontend

React + TypeScript app built with Vite for uploading audio files to a FastAPI backend.

## Prerequisites
- Node.js 18.18 or newer (Node 20 LTS recommended for parity with Vite tooling).
- npm (ships with Node) or another package manager such as pnpm/yarn if you prefer.
- A running backend that exposes `POST /upload` for receiving audio files (see [Backend Integration](#backend-integration)).

Confirm your versions:

```bash
node --version
npm --version
```

## Install & Start (Development)
1. Install dependencies the first time:
   ```bash
   npm install
   ```
2. Start the Vite development server:
   ```bash
   npm run dev
   ```
3. Open the URL printed in the terminal (defaults to `http://localhost:5173`) to view the app. Hot Module Replacement (HMR) is enabled for rapid iteration.

Stop the dev server with `Ctrl+C`.

## Backend Integration
- The frontend currently posts uploads to `https://audio-backend-5j3t.onrender.com/upload`.
- To target a local FastAPI server instead, define a `VITE_API_BASE_URL` environment variable:
  1. Create `.env.local` in the project root.
  2. Add `VITE_API_BASE_URL=http://localhost:8000`.
  3. Update the fetch call in `src/App.tsx` to use `import.meta.env.VITE_API_BASE_URL` (or `/api` if you configure a proxy).
- Example FastAPI dev command:
  ```bash
  uvicorn main:app --reload --port 8000
  ```
- Ensure your backend handles multipart form uploads and returns JSON with a user-facing message.

## Optional: Dev Proxy
If you prefer not to manage env files during development, configure `vite.config.ts`:

```ts
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
});
```

Then adjust the frontend request to hit `/api/upload`. Vite will forward the call to FastAPI, avoiding CORS issues.

## Available Scripts
- `npm run dev` – start the Vite dev server.
- `npm run build` – create a production build (`dist` folder).
- `npm run preview` – preview the production build locally.
- `npm run lint` – run ESLint over the codebase.

## Project Structure
- `src/main.tsx` – React entry point.
- `src/App.tsx` – main UI for the uploader.
- `public/` – static assets served by Vite.
- `vite.config.ts` – Vite configuration, extend as needed.

## Troubleshooting
- If `npm run dev` fails, delete `node_modules`, reinstall, and ensure Node is up to date.
- Backend CORS errors: enable CORS in FastAPI or use the Vite proxy approach above.

---

Need help wiring up the fetch call or refining the UI? Reach out and we can iterate on the next steps together.
