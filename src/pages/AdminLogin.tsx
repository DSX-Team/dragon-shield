import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Shield, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

const AdminLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });

  useEffect(() => {
    // Check for existing session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Check if user is admin
        const { data: profile } = await supabase
          .from("profiles")
          .select("roles")
          .eq("user_id", session.user.id)
          .single();

        if (profile?.roles?.includes("admin")) {
          setUser(session.user);
          navigate("/admin");
        } else {
          // Not an admin, sign out and show error
          await supabase.auth.signOut();
          setError("Access denied. Admin privileges required.");
        }
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Check if user is admin
          const { data: profile } = await supabase
            .from("profiles")
            .select("roles")
            .eq("user_id", session.user.id)
            .single();

          if (profile?.roles?.includes("admin")) {
            setUser(session.user);
            navigate("/admin");
          } else {
            // Not an admin, sign out
            await supabase.auth.signOut();
            setError("Access denied. Admin privileges required.");
          }
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password
      });

      if (error) {
        setError(error.message);
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive"
        });
      } else if (data.user) {
        // Check if user is admin
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("roles, username")
          .eq("user_id", data.user.id)
          .single();

        if (profileError || !profile?.roles?.includes("admin")) {
          await supabase.auth.signOut();
          setError("Access denied. This account does not have administrator privileges.");
          toast({
            title: "Access Denied",
            description: "Administrator privileges required.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Admin Access Granted",
            description: `Welcome back, ${profile.username}!`
          });
          // Navigation will be handled by the auth state change listener
        }
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error("Admin login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFirstAdmin = async () => {
    setIsLoading(true);
    setError("");

    try {
      // Check if any admin users exist
      const { data: adminCheck } = await supabase
        .from("profiles")
        .select("id")
        .contains("roles", ["admin"])
        .limit(1);

      if (adminCheck && adminCheck.length > 0) {
        setError("Admin users already exist. Please use regular login.");
        setIsLoading(false);
        return;
      }

      // Create first admin account with a standard email domain
      const { data, error } = await supabase.auth.signUp({
        email: "admin@example.com",
        password: "DragonAdmin123!",
        options: {
          emailRedirectTo: `${window.location.origin}/admin`,
          data: {
            username: "admin"
          }
        }
      });

      if (error) {
        setError(error.message);
      } else if (data.user) {
        // Update the profile to have admin role
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ roles: ["admin"] })
          .eq("user_id", data.user.id);

        if (updateError) {
          console.error("Error updating admin role:", updateError);
        }

        toast({
          title: "First Admin Created", 
          description: "Default admin account created. Email: admin@example.com, Password: DragonAdmin123!",
        });

        setLoginData({
          email: "admin@example.com",
          password: "DragonAdmin123!"
        });
      }
    } catch (err) {
      setError("Failed to create first admin account");
      console.error("Create first admin error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="absolute top-4 left-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
            <Shield className="h-8 w-8 text-primary mr-2" />
            <CardTitle className="text-2xl font-bold text-destructive">Admin Access</CardTitle>
          </div>
          <CardDescription>
            Administrator login for Dragon Shield IPTV
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Administrator Email</Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="Enter admin email"
                value={loginData.email}
                onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                placeholder="Enter admin password"
                value={loginData.password}
                onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading} variant="destructive">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Admin Login
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-muted-foreground text-center mb-3">
              First time setup?
            </p>
            <Button 
              onClick={handleCreateFirstAdmin} 
              variant="outline" 
              className="w-full"
              disabled={isLoading}
            >
              Create First Admin Account
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t">
            <p className="text-xs text-muted-foreground text-center">
              Regular users should use the <button 
                onClick={() => navigate("/auth")}
                className="text-primary underline"
              >
                standard login
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;