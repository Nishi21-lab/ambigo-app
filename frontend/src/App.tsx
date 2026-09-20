import { useState, useEffect } from "react";
import { TripPage } from "./pages/TripPage";
import { AuthPage } from "./pages/AuthPage";
import { authApi } from "./services/api";
import { Logo } from "./components/UI/Logo";
import { Loader2 } from "lucide-react";

interface Session {
  name: string;
  email: string;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem("ambigo_token");
    if (token) {
      authApi
        .getMe()
        .then((res) => {
          setSession({
            name: res.driver.name,
            email: res.driver.email,
          });
        })
        .catch(() => {
          // Token is invalid or expired
          localStorage.removeItem("ambigo_token");
        })
        .finally(() => {
          setInitialized(true);
        });
    } else {
      setInitialized(true);
    }
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("ambigo_token");
    setSession(null);
  };

  const handleAuth = (user: { name: string; email: string }) => {
    setSession(user);
  };

  if (!initialized) {
    return (
      <div className="min-h-screen bg-ambigo-950 flex flex-col items-center justify-center p-4">
         <Logo variant="icon" size={48} className="mb-4 animate-bounce-subtle" />
         <Loader2 className="w-6 h-6 text-ambigo-500 animate-spin" />
         <p className="text-ambigo-400 mt-4 text-sm animate-pulse">Loading AmbiGo...</p>
      </div>
    );
  }

  if (!session) {
    return <AuthPage onAuth={handleAuth} />;
  }

  return <TripPage session={session} onSignOut={handleSignOut} />;
}
