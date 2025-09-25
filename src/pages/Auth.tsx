import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Shield, Play, Tv, Zap, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [signInData, setSignInData] = useState({
    email: "",
    password: ""
  });

  const [signUpData, setSignUpData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  useEffect(() => {
    // Check for existing session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        navigate("/dashboard");
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setUser(session.user);
          navigate("/dashboard");
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInData.email,
        password: signInData.password
      });

      if (error) {
        setError(error.message);
        toast({
          title: "Sign In Failed",
          description: error.message,
          variant: "destructive"
        });
      } else if (data.user) {
        toast({
          title: "Welcome back!",
          description: "Successfully signed in to your account."
        });
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (signUpData.password !== signUpData.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (signUpData.password.length < 6) {
      setError("Password must be at least 6 characters");
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            username: signUpData.username
          }
        }
      });

      if (error) {
        setError(error.message);
        toast({
          title: "Sign Up Failed",
          description: error.message,
          variant: "destructive"
        });
      } else if (data.user) {
        toast({
          title: "Account Created!",
          description: "Please check your email to verify your account."
        });
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted"
        style={{ backgroundImage: "var(--auth-bg)" }}
      />
      
      {/* Floating Geometric Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-br from-xtream-blue/20 to-xtream-navy/20 rounded-full animate-float blur-xl" />
        <div className="absolute top-40 right-32 w-24 h-24 bg-gradient-to-br from-xtream-orange/20 to-accent/20 rounded-lg rotate-45 animate-float-delayed blur-lg" />
        <div className="absolute bottom-32 left-40 w-40 h-40 bg-gradient-to-br from-primary/10 to-xtream-blue/10 rounded-full animate-float blur-2xl" />
        <div className="absolute bottom-20 right-20 w-28 h-28 bg-gradient-to-br from-accent/15 to-xtream-orange/15 rounded-lg rotate-12 animate-float-delayed blur-lg" />
        
        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px]" />
      </div>

      {/* Main Content */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
          
          {/* Left Side - Branding & Features */}
          <div className="space-y-8 text-center lg:text-left animate-slide-in-up">
            <div className="space-y-4">
              <div className="flex items-center justify-center lg:justify-start gap-3 mb-6">
                <div className="relative">
                  <Shield className="h-12 w-12 text-primary animate-glow-pulse" />
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg animate-pulse" />
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-xtream-blue to-xtream-navy bg-clip-text text-transparent">
                  Dragon Shield
                </h1>
              </div>
              
              <p className="text-xl lg:text-2xl font-semibold text-xtream-navy dark:text-xtream-blue-light">
                Professional IPTV Management Platform
              </p>
              
              <p className="text-muted-foreground text-lg max-w-lg">
                Experience the next generation of streaming technology with advanced channel management, 
                real-time analytics, and enterprise-grade security.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12">
              <div className="flex flex-col items-center lg:items-start space-y-3 group">
                <div className="p-3 bg-gradient-to-br from-xtream-blue/10 to-xtream-navy/10 rounded-xl group-hover:from-xtream-blue/20 group-hover:to-xtream-navy/20 transition-all duration-300">
                  <Tv className="h-6 w-6 text-xtream-blue" />
                </div>
                <div className="text-center lg:text-left">
                  <h3 className="font-semibold text-foreground">Live Streaming</h3>
                  <p className="text-sm text-muted-foreground">High-quality streams</p>
                </div>
              </div>
              
              <div className="flex flex-col items-center lg:items-start space-y-3 group">
                <div className="p-3 bg-gradient-to-br from-xtream-orange/10 to-accent/10 rounded-xl group-hover:from-xtream-orange/20 group-hover:to-accent/20 transition-all duration-300">
                  <Zap className="h-6 w-6 text-xtream-orange" />
                </div>
                <div className="text-center lg:text-left">
                  <h3 className="font-semibold text-foreground">Fast Performance</h3>
                  <p className="text-sm text-muted-foreground">Lightning speed</p>
                </div>
              </div>
              
              <div className="flex flex-col items-center lg:items-start space-y-3 group">
                <div className="p-3 bg-gradient-to-br from-success/10 to-success/20 rounded-xl group-hover:from-success/20 group-hover:to-success/30 transition-all duration-300">
                  <Play className="h-6 w-6 text-success" />
                </div>
                <div className="text-center lg:text-left">
                  <h3 className="font-semibold text-foreground">Easy Management</h3>
                  <p className="text-sm text-muted-foreground">Intuitive controls</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Auth Form */}
          <div className="flex justify-center lg:justify-end animate-fade-in-scale">
            <Card className="w-full max-w-md backdrop-blur-xl bg-card/80 shadow-2xl border border-border/50 relative overflow-hidden">
              {/* Glass Effect Overlay */}
              <div 
                className="absolute inset-0 opacity-50"
                style={{ background: "var(--gradient-glass)" }}
              />
              
              <CardHeader className="relative space-y-1 text-center pb-6">
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-xtream-blue to-xtream-navy bg-clip-text text-transparent">
                  Access Portal
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Sign in to your Dragon Shield account
                </CardDescription>
              </CardHeader>
              
              <CardContent className="relative">
                <Tabs defaultValue="signin" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50 backdrop-blur-sm">
                    <TabsTrigger 
                      value="signin" 
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-xtream-blue data-[state=active]:to-xtream-navy data-[state=active]:text-white transition-all duration-300"
                    >
                      Sign In
                    </TabsTrigger>
                    <TabsTrigger 
                      value="signup"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-xtream-orange data-[state=active]:to-accent data-[state=active]:text-white transition-all duration-300"
                    >
                      Sign Up
                    </TabsTrigger>
                  </TabsList>

                  {error && (
                    <Alert variant="destructive" className="mb-6 animate-slide-in-up">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <TabsContent value="signin">
                    <form onSubmit={handleSignIn} className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email" className="text-sm font-medium">Email</Label>
                        <Input
                          id="signin-email"
                          type="email"
                          placeholder="Enter your email"
                          value={signInData.email}
                          onChange={(e) => setSignInData(prev => ({ ...prev, email: e.target.value }))}
                          className="bg-background/50 backdrop-blur-sm border-border/50 focus:bg-background/70 transition-all duration-300"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="signin-password" className="text-sm font-medium">Password</Label>
                        <div className="relative">
                          <Input
                            id="signin-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            value={signInData.password}
                            onChange={(e) => setSignInData(prev => ({ ...prev, password: e.target.value }))}
                            className="bg-background/50 backdrop-blur-sm border-border/50 focus:bg-background/70 transition-all duration-300 pr-10"
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-xtream-blue to-xtream-navy hover:from-xtream-blue-light hover:to-xtream-navy text-white font-medium py-2.5 transition-all duration-300 shadow-lg hover:shadow-xl" 
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Signing In...
                          </>
                        ) : (
                          "Sign In"
                        )}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup">
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-username" className="text-sm font-medium">Username</Label>
                        <Input
                          id="signup-username"
                          type="text"
                          placeholder="Choose a username"
                          value={signUpData.username}
                          onChange={(e) => setSignUpData(prev => ({ ...prev, username: e.target.value }))}
                          className="bg-background/50 backdrop-blur-sm border-border/50 focus:bg-background/70 transition-all duration-300"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="Enter your email"
                          value={signUpData.email}
                          onChange={(e) => setSignUpData(prev => ({ ...prev, email: e.target.value }))}
                          className="bg-background/50 backdrop-blur-sm border-border/50 focus:bg-background/70 transition-all duration-300"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="signup-password" className="text-sm font-medium">Password</Label>
                        <div className="relative">
                          <Input
                            id="signup-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Create a password"
                            value={signUpData.password}
                            onChange={(e) => setSignUpData(prev => ({ ...prev, password: e.target.value }))}
                            className="bg-background/50 backdrop-blur-sm border-border/50 focus:bg-background/70 transition-all duration-300 pr-10"
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="signup-confirm" className="text-sm font-medium">Confirm Password</Label>
                        <div className="relative">
                          <Input
                            id="signup-confirm"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm your password"
                            value={signUpData.confirmPassword}
                            onChange={(e) => setSignUpData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            className="bg-background/50 backdrop-blur-sm border-border/50 focus:bg-background/70 transition-all duration-300 pr-10"
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-xtream-orange to-accent hover:from-xtream-orange/90 hover:to-accent/90 text-white font-medium py-2.5 transition-all duration-300 shadow-lg hover:shadow-xl" 
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating Account...
                          </>
                        ) : (
                          "Create Account"
                        )}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;