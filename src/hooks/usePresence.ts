
'use client';
import { useEffect } from 'react';
import { rtdb, auth } from '@/lib/firebase';
import { ref, onDisconnect, set, serverTimestamp, onValue, goOnline, goOffline } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';

export default function usePresence() {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (!user) {
        goOffline(rtdb);
        return;
      };

      const myRef = ref(rtdb, `presence/${user.uid}`);
      const connectedRef = ref(rtdb, '.info/connected');

      onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
            set(myRef, { state: 'online', last_changed: serverTimestamp() });
            onDisconnect(myRef).set({ state: 'offline', last_changed: serverTimestamp() });
        }
      });
    });

    return () => unsubscribe();
  }, []);
}
