import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBolZ9vMyaY6Ay5yTd7Di6a_1ckHQUzpPA",
  authDomain: "rpis-temperatura.firebaseapp.com",
  projectId: "rpis-temperatura",
  storageBucket: "rpis-temperatura.firebasestorage.app",
  messagingSenderId: "61307858613",
  appId: "1:61307858613:web:53abb7a4b7a218c3f2d8fc"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
