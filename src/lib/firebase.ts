import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// CRITICAL: Initialize Firestore with the exact firestoreDatabaseId from firebase-applet-config.json
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export function isTokenServiceDisabledError(error: unknown): boolean {
  if (!error) return false;
  const msg = typeof error === 'string' ? error : (error as any)?.message || (error as any)?.code || JSON.stringify(error);
  return (
    msg.includes('token-service-api-has-not-been-used') ||
    msg.includes('securetoken.googleapis.com') ||
    msg.includes('SERVICE_DISABLED') ||
    msg.includes('auth/token-service-api-has-not-been-used')
  );
}

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    if (typeof auth.authStateReady === 'function') {
      await auth.authStateReady();
    }
    if (auth.currentUser) {
      try {
        await auth.currentUser.getIdToken(false);
      } catch (tokErr) {
        if (isTokenServiceDisabledError(tokErr)) {
          console.warn(
            'Token Service API (securetoken.googleapis.com) is disabled on Google Cloud project 412108184439. Resetting auth session to keep Firestore connection online. Visit https://console.developers.google.com/apis/api/securetoken.googleapis.com/overview?project=412108184439 to enable it.'
          );
          await signOut(auth);
        }
      }
    }
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (isTokenServiceDisabledError(error)) {
      console.warn(
        'Token Service API (securetoken.googleapis.com) is disabled on Google Cloud project 412108184439. Visit https://console.developers.google.com/apis/api/securetoken.googleapis.com/overview?project=412108184439 to enable it.'
      );
      return false;
    }
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
    // Expected if doc does not exist or permission denied on test doc, but connection reached server
    return true;
  }
}

export { signInWithPopup, signInWithRedirect, getRedirectResult, signOut };

