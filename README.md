# Page Replacement Lab — Web Edition

A browser-based version of Page Replacement Lab, inspired by the original Python + CustomTkinter project. It includes FIFO, LRU, and Optimal page replacement, automatic playback, pause/resume, restart, speed control, page-reference visualization, RAM frames, and synchronized algorithm comparison.

## Run on Windows

1. Install Node.js LTS from https://nodejs.org/ if you do not already have it.
2. Extract this ZIP.
3. Open the extracted `page-replacement-lab-web` folder in VS Code.
4. Open **Terminal → New Terminal** and run:

```bash
npm install
npm run dev
```

5. Open the local address printed in the terminal (usually `http://localhost:5173`).

## Deploy to Vercel

1. Create a GitHub repository and upload the contents of this folder. `package.json` must be in the repository root.
2. Sign in to https://vercel.com/ with GitHub and choose **Add New → Project**.
3. Import the repository. Vercel should detect Vite automatically.
4. Use build command `npm run build` and output directory `dist` if asked.
5. Click **Deploy**. Vercel gives you a public `.vercel.app` link.

No Python server, database, API key, or paid backend is required. All simulation runs in the visitor's browser.
