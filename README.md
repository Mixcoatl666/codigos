# Clave · Generador de códigos

Aplicación web con React, Vite y Tailwind CSS para generar un código QR y un código de barras Code 128 a partir del mismo texto.

## Ejecutar

```bash
npm install
npm run dev
```

Abre la dirección local que imprime Vite en la terminal.

## Datos

El historial se guarda en `localStorage` del navegador. No se envía a un servidor y permanece disponible en el mismo navegador y dispositivo.

## Preparar Firebase / Cloud Firestore

`firebase` ya está instalado. La inicialización está en `src/lib/firebase.js` y exporta `firebaseApp`, `db` y `firebaseConfigured`.

1. En Firebase Console, crea un proyecto o abre el que ya tienes y registra una aplicación web (`</>`). Copia el objeto de configuración web.
2. En la raíz de este proyecto, copia `.env.example` a `.env.local` y pega los valores en las variables `VITE_FIREBASE_*` correspondientes.
3. En Firebase Console, crea la base de datos de **Cloud Firestore**.
4. Reinicia Vite con `npm run dev` para cargar las variables nuevas.

Ejemplo de importación desde un módulo de la app:

```js
import { db, firebaseConfigured } from './lib/firebase'
import { collection, addDoc, getDocs } from 'firebase/firestore'

if (firebaseConfigured) {
  const codesRef = collection(db, 'codes')
  // addDoc(codesRef, { text: 'TEXTOBAR001', createdAt: new Date() })
  // const snapshot = await getDocs(codesRef)
}
```

El generador todavía guarda su historial en `localStorage`; esta configuración solo prepara el SDK. Antes de pasar ese historial a Firestore, crea reglas de seguridad acordes con el acceso deseado. No habilites reglas abiertas para lectura y escritura. Las variables `VITE_*` se incluyen en el bundle del navegador, así que no pongas claves privadas de servidor ahí.

## Funciones

- Generación de QR y Code 128.
- Vista de escaneo ampliada para QR y barras, al crear un código o tocar cualquiera de las tarjetas; pensada para leerlo desde otro dispositivo.
- Descarga individual de cada código en PNG.
- Historial con búsqueda, filtro por fecha y borrado de elementos.
- Copia del texto al portapapeles.
