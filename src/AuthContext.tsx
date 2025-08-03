import React, { createContext, useContext, useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from './firebase'; // Asegurate de tener este archivo correctamente configurado

export interface UserInfo {
  dni: string;
}

export interface AuthContextType {
  user: UserInfo | null;
  login: (dni: string, password: string) => Promise<void>;
  register: (dni: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

  const login = async (dni: string, password: string) => {
    const email = `${dni}`;
    try {
      console.log(email, password);
      await signInWithEmailAndPassword(auth, email, password);
      const info = { dni };
      setUser(info);
      setIsAuthenticated(true);
      localStorage.setItem('user', JSON.stringify(info));
    } catch (error) {
      console.error('Error en login:', error);
      throw new Error('Usuario o clave incorrectos');
    }
  };

  const register = async (email: string, dni: string, password: string) => {
  try {
    console.log(email, password);
    await createUserWithEmailAndPassword(auth, email, password);
    // Podés guardar el dni aparte si lo necesitás en localStorage:
    const info = { dni };
    setUser(info);
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(info));
  } catch (error) {
    console.error('Error en registro:', error);
    throw new Error('No se pudo registrar');
  }
};


  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated }}>
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
