import AppRoutes from "./routes/AppRoutes";
import { useEffect } from "react";
import { useAuthStore } from "./store/useAuthStore";
import authService from "./services/authService";

function App() {
  const token = useAuthStore((state) => state.accessToken);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const setInitialized = useAuthStore((state) => state.setInitialized);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapAuth() {
      if (!token) {
        setInitialized(true);
        return;
      }

      try {
        const data = await authService.me();
        if (!cancelled) {
          setUser(data.user);
          setInitialized(true);
        }
      } catch {
        if (!cancelled) {
          logout();
        }
      }
    }

    bootstrapAuth();

    return () => {
      cancelled = true;
    };
  }, [token, setUser, logout, setInitialized]);

  return <AppRoutes />;
}

export default App;