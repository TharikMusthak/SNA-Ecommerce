/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getProfile,
  loginUser,
  logoutUser,
  registerUser,
} from "@services/auth.service";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Get currently authenticated user
  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await getProfile();

      setUser(currentUser);

      return currentUser;
    } catch (error) {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Login
  const login = useCallback(async (credentials) => {
 
    const userData = await loginUser(credentials);
 
    setUser(userData);

    return userData;
  }, []);

  // Register
  const register = useCallback(async (payload) => {
    const userData = await registerUser(payload);

    setUser(userData);

    return userData;
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
    }
  }, []);

  // Update user locally
  const updateProfile = useCallback((updatedUser) => {
    setUser((currentUser) => {
      if (!currentUser) return updatedUser;

      return {
        ...currentUser,
        ...updatedUser,
      };
    });
  }, []);

  // Check session when application starts
  useEffect(() => {
    let active = true;

    const initializeAuth = async () => {
      try {
        const currentUser = await getProfile();

        if (active) {
          setUser(currentUser);
        }
      } catch {
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      active = false;
    };
  }, []);

  // Clear user when API reports unauthorized
  useEffect(() => {
    const clearSession = () => {
      setUser(null);
    };

    window.addEventListener("sna:unauthorized", clearSession);

    return () => {
      window.removeEventListener("sna:unauthorized", clearSession);
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),

      login,
      register,
      logout,

      refreshUser,
      updateProfile,
    }),
    [
      user,
      loading,
      login,
      register,
      logout,
      refreshUser,
      updateProfile,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};

export default AuthProvider;