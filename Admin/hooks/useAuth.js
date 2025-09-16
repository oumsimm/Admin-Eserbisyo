import { useState, useEffect, createContext, useContext } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let unsubscribeProfile = null;
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }
      if (u) {
        const ref = doc(db, 'users', u.uid);
        unsubscribeProfile = onSnapshot(ref, (snap) => {
          setProfile(snap.exists() ? { id: snap.id, ...snap.data() } : null);
          setLoading(false);
        }, () => setLoading(false));
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const signIn = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    loading,
    profile,
    isAdmin: !!profile?.isAdmin || profile?.role === 'admin',
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
