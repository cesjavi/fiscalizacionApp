import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  UserCredential,
} from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';


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

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
      const userCredential: UserCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const info: UserInfo = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
      };
      try {
        await setDoc(doc(db, 'users', info.uid), info, { merge: true });
      } catch (error) {
        console.error('Error guardando usuario en Firestore:', error);
      }
      setUser(info);
      setIsAuthenticated(true);
      localStorage.setItem('user', JSON.stringify(info));
    } catch (error) {
      console.error('Error en login:', error);
      throw new Error('Usuario o clave incorrectos');
    }
  };

  const loginWithDni = async (dni: string, password: string) => {
    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni, password }),
      });
      if (!res.ok) {
        throw new Error('Usuario o clave incorrectos');
      }
      const data = await res.json();
      const info: UserInfo = {
        uid: dni,
        email: data.email,
        dni,
      };
      setUser(info);
      setIsAuthenticated(true);
      localStorage.setItem('user', JSON.stringify(info));
    } catch (error) {
      console.error('Error en login con DNI:', error);
      throw new Error('Usuario o clave incorrectos');
    }
  };

  const register = async (email: string, dni: string, password: string) => {
    try {
      const userCredential: UserCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const info: UserInfo = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        dni,
      };
      try {
        await setDoc(doc(db, 'users', info.uid), info);
      } catch (error) {
        console.error('Error guardando usuario en Firestore:', error);
      }
      setUser(info);
      setIsAuthenticated(true);
      localStorage.setItem('user', JSON.stringify(info));
      return;
    } catch (error) {
      console.error('Error en registro:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('No se pudo registrar');
    }
  };


  const logout = async () => {
    // There is no server session to invalidate, simply clear local data.
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

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
