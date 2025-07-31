import React, { createContext, useContext, useState, useEffect } from 'react';

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
    const res = await fetch('/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: dni, password }),
    });
    if (!res.ok) {
      throw new Error('Login failed');
    }
    const data = await res.json();
    const info = { dni: data.username } as UserInfo;
    setUser(info);
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(info));
  };

  const register = async (dni: string, password: string) => {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: dni, password }),
    });
    if (!res.ok) {
      throw new Error('Register failed');
    }
    const info = { dni } as UserInfo;
    setUser(info);
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(info));
  };

  const logout = async () => {
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

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
