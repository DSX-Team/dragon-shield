import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Tv, Users, Lock, Zap } from "lucide-react";
import type { User } from "@supabase/supabase-js";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        navigate("/dashboard");
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setUser(session.user);
          navigate("/dashboard");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5">
        <div className="container mx-auto px-4 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex items-center justify-center mb-6">
              <Shield className="h-16 w-16 text-primary mr-4" />
              <h1 className="text-5xl font-bold">Dragon Shield IPTV</h1>
            </div>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Professional IPTV streaming platform with enterprise-grade features, 
              secure content delivery, and comprehensive management tools.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/auth")}>
                Get Started
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
                Sign In
              </Button>
              <Button 
                size="lg" 
                variant="destructive" 
                onClick={() => navigate("/admin/login")}
                className="mt-2"
              >
                <Shield className="h-4 w-4 mr-2" />
                Admin Login
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Enterprise Features</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built for broadcasters, content distributors, and streaming service providers
              who demand reliability, security, and scalability.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <Tv className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Multi-Channel Streaming</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Support for unlimited channels with adaptive bitrate streaming,
                  HLS/DASH delivery, and real-time transcoding using FFMPEG 7.1.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Lock className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Security & Compliance</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Enterprise-grade security with JWT authentication, role-based access,
                  license verification, and comprehensive audit logging.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Advanced subscription management, concurrent stream limits,
                  user analytics, and flexible package configurations.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>API Compatible</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Full Xtream Codes API compatibility ensures seamless integration
                  with existing IPTV applications and player software.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Scalable Infrastructure</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Multi-server architecture with edge nodes, load balancing,
                  and auto-scaling capabilities for global content delivery.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Tv className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Content Management</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  VOD library management, EPG integration, automatic thumbnails,
                  and metadata enrichment for enhanced user experience.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of content providers using Dragon Shield IPTV 
            for reliable, scalable streaming infrastructure.
          </p>
          <Button size="lg" onClick={() => navigate("/auth")}>
            Start Your Free Trial
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-5 w-5 mr-2" />
            <span className="font-medium">Dragon Shield IPTV</span>
          </div>
          <p className="text-sm">
            Professional IPTV streaming platform. Built for enterprise scale.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
