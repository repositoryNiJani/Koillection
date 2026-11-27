import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/figtree';
import '@fontsource/pixelify-sans/500.css';
import '@fontsource/pixelify-sans/700.css';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { initDb } from './game/db.js';
import App from './App.jsx';
import './styles.css';

// Load SQLite (WebAssembly) first, then show the game.
initDb(() => wasmUrl).then(() => {
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
