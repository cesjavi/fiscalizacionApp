import React, { createContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  UserCredential,
} from 'firebase/auth';
import {
  getDocs,
  collection,
  doc,
  setDoc,
  query,
  where,
} from 'firebase/firestore';
import { auth, db } from './firebase'; // Asegurate de tener exportado auth y db correctamente
import { rtdb } from './firebase';
import { get, ref, set } from 'firebase/database';
// Interfaces
export interface UserInfo {
  uid: string;
  email: string | null;
  dni?: string;
}

export interface AuthContextType {
  user: UserInfo | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithDni: (dni: string, password: string) => Promise<void>;
  register: (email: string, dni: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

// Contexto
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Proveedor de contexto
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      setUser(JSON.parse(stored));
      setIsAuthenticated(true);
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const userCredential: UserCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      const userEmail = userCredential.user.email;

      try {
        const q = query(collection(db, 'users'), where('uid', '==', uid));
        const snapshot = await getDocs(q);
        let dni: string | undefined;

        if (!snapshot.empty) {
          dni = snapshot.docs[0].id;
        }

        const info: UserInfo = {
          uid,
          email: userEmail,
          dni,
        };

        await setDoc(doc(db, 'users', dni ?? uid), info, { merge: true });

        setUser(info);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(info));
      } catch (error) {
        console.error('Error guardando usuario en Firestore:', error);

        const fallbackInfo: UserInfo = {
          uid,
          email: userEmail,
        };
        setUser(fallbackInfo);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(fallbackInfo));
      }
    } catch (error) {
      console.error('Error en login:', error);
      throw new Error('Usuario o clave incorrectos');
    }
  };

  const loginWithDni = async (dni: string, password: string) => {
    try {
      const userRef = ref(rtdb, 'users/' + dni);
      const snapshot = await get(userRef);

      if (!snapshot.exists()) throw new Error('DNI no encontrado');

      const data = snapshot.val();

      let userCredential: UserCredential;
      try {
        userCredential = await signInWithEmailAndPassword(
          auth,
          data.email,
          password
        );
      } catch {
        throw new Error('Usuario o clave incorrectos');
      }

      if (userCredential.user.uid !== data.uid) {
        throw new Error('El usuario autenticado no coincide con el DNI');
      }

      const info: UserInfo = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        dni,
      };

      setUser(info);
      setIsAuthenticated(true);
      localStorage.setItem('user', JSON.stringify(info));
    } catch (error) {
      console.error('Error en login con DNI:', error);
      throw error instanceof Error
        ? error
        : new Error('No se pudo iniciar sesión');
    }
  };

  const register = async (email: string, dni: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    const userData = {
      uid,
      email,
      dni,
      password // ⚠️ solo para pruebas
    };

    // Guardar en Firestore: ID del documento = DNI
    await setDoc(doc(db, 'users', dni), userData);

    // Guardar en Realtime Database: nodo por DNI
    await set(ref(rtdb, 'users/' + dni), userData);

    setUser({ uid, email, dni });
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify({ uid, email, dni }));
  } catch (error) {
    console.error('Error en registro:', error);
    throw new Error('No se pudo registrar');
  }
};



  const logout = async () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithDni, register, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

import { useContext } from 'react';

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}