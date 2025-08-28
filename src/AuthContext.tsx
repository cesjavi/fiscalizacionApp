import React, { createContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  UserCredential,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  signOut,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { doc, setDoc } from 'firebase/firestore';
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
  token: string | null;
  login: (usuario: string, password: string) => Promise<string>;
  loginWithDni: (dni: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
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
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    if (stored) {
      setUser(JSON.parse(stored));
      setIsAuthenticated(true);
    }
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const login = async (usuario: string, password: string): Promise<string> => {
    try {
      const baseUrl =
        import.meta.env.VITE_API_URL ??
        'http://api.lalibertadavanzacomuna7.com/api';
      const response = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, password }),
      });

      if (!response.ok) {
        throw new Error('Usuario o clave incorrectos');
      }

      const data: {
        uid?: string;
        email?: string;
        dni?: string;
        token?: string;
      } = await response.json();

      if (!data.token) {
        throw new Error('Token no encontrado en la respuesta');
      }

      const info: UserInfo = {
        uid: data.uid ?? '',
        email: data.email ?? usuario,
        dni: data.dni,
      };

      setUser(info);
      setIsAuthenticated(true);
      localStorage.setItem('user', JSON.stringify(info));

      setToken(data.token);
      localStorage.setItem('token', data.token);

      return data.token;
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

  const loginWithGoogle = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        // Native (Android/iOS) via Capacitor plugin
        // Dynamic import to avoid breaking web builds if plugin is missing
        // @ts-expect-error – module es opcional en entornos web
        const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');

        // Start native Google sign-in via plugin
        const nativeSignIn = await FirebaseAuthentication.signInWithGoogle();
        const idToken = nativeSignIn?.credential?.idToken;
        if (!idToken) throw new Error('No se obtuvo idToken de Google');

        const credential = GoogleAuthProvider.credential(idToken);
        const firebaseResult = await signInWithCredential(auth, credential);
        const u = firebaseResult.user;

        const info: UserInfo = {
          uid: u.uid,
          email: u.email,
        };

        setUser(info);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(info));
        return;
      }

      // Web: use Firebase popup
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const u = result.user;

      const info: UserInfo = {
        uid: u.uid,
        email: u.email,
      };

      setUser(info);
      setIsAuthenticated(true);
      localStorage.setItem('user', JSON.stringify(info));
    } catch (error) {
      console.error('Error en login con Google:', error);
      throw new Error('No se pudo iniciar sesión con Google');
    }
  };



  const logout = async () => {
    try {
      await signOut(auth);
    } catch {
      // noop – continue clearing local state
    }
    setUser(null);
    setIsAuthenticated(false);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, loginWithDni, loginWithGoogle, register, logout, isAuthenticated }}>
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
