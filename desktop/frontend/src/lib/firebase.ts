import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyA7DEU6uF8XQ2uqclKr0ka_TAwNcARIadE",
  authDomain: "cloud-todo-app-928.firebaseapp.com",
  projectId: "cloud-todo-app-928",
  storageBucket: "cloud-todo-app-928.firebasestorage.app",
  messagingSenderId: "797424987905",
  appId: "1:797424987905:web:0c1165414969ea38747500",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Optional: ensure prompt for account selection
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export const signInWithGoogle = async (): Promise<User> => {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

export const logOut = async (): Promise<void> => {
  await signOut(auth);
};

export { onAuthStateChanged };
export type { User };
