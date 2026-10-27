# Guía para agentes

- Es una SPA React/Vite; la entrada está en `src/main.jsx` y la app en `src/App.jsx`. Los estilos usan Tailwind mediante el plugin de Vite.
- QR y Code 128, así como la búsqueda, filtros y persistencia del historial, se gestionan en `src/App.jsx`. El historial se guarda en `localStorage` bajo `clave-codes-v1`; no se sincroniza con Firebase.
- `src/lib/firebase.js` solo inicializa/exporta el SDK si están definidas las variables `VITE_FIREBASE_*`. Son valores incluidos en el cliente: nunca pongas secretos de servidor ahí. Reglas e índices de Firestore están en `firestore.rules` y `firestore.indexes.json`.
- Comandos disponibles: `npm run dev`, `npm run build`, `npm run preview`, `npm test` y `npm run test:coverage`. La suite está en `tests/`; no hay scripts de lint ni typecheck.
- Firebase Hosting publica `dist/` y reescribe rutas a `index.html` (`firebase.json`). `dist/` es salida generada; no edites sus archivos manualmente.
