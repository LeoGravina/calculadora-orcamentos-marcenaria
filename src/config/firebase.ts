import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_API_KEY as string,
  authDomain: process.env.REACT_APP_AUTH_DOMAIN as string,
  projectId: process.env.REACT_APP_PROJECT_ID as string,
  storageBucket: process.env.REACT_APP_STORAGE_BUCKET as string,
  messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID as string,
  appId: process.env.REACT_APP_APP_ID as string,
  measurementId: process.env.REACT_APP_MEASUREMENT_ID as string,
};

const app = initializeApp(firebaseConfig);

// Persistência offline: lê/escreve no cache local e sincroniza quando a rede volta.
// Com fallback caso o ambiente não suporte IndexedDB (ex.: aba privada).
let firestore;
try {
  firestore = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
} catch (e) {
  // Fallback sem cache persistente
  firestore = initializeFirestore(app, {});
}

export const db = firestore;
