import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, Mail, Lock, LogIn, Shield, Settings } from "lucide-react";
import RDRLogo from "@/components/RDRLogo";

export default function AdminAuth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        try {
          // Check user role to redirect appropriately
          const { data: userRole, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .maybeSingle();
          
          if (userRole?.role === 'admin') {
            navigate("/admin/dashboard");
          } else {
            navigate("/portal");
          }
        } catch (error) {
          navigate("/portal");
        }
      }
    };
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        // Defer the role checking to avoid auth state deadlock
        setTimeout(async () => {
          try {
            const { data: userRole, error } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .maybeSingle();
            
            if (userRole?.role === 'admin') {
              navigate("/admin/dashboard");
            } else {
              // If not admin, show error and sign out
              toast({
                title: "Access Denied",
                description: "You don't have administrator privileges.",
                variant: "destructive"
              });
              await supabase.auth.signOut();
            }
          } catch (error) {
            navigate("/portal");
          }
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setError("Invalid email or password. Please check your credentials and try again.");
        } else {
          setError(error.message);
        }
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-red-200 bg-white">
          <CardHeader className="space-y-4 text-center bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-t-lg">
            <div className="flex justify-center">
              <RDRLogo className="text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                <Shield className="w-6 h-6" />
                Administrator Login
              </CardTitle>
              <p className="text-red-100 mt-2">
                Secure access to system management
              </p>
            </div>
          </CardHeader>
          <CardContent className="mt-6">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSignIn} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="admin-email" className="flex items-center gap-2 text-gray-700">
                  <Mail className="w-4 h-4" />
                  Administrator Email
                </Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="Enter your admin email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-password" className="flex items-center gap-2 text-gray-700">
                  <Lock className="w-4 h-4" />
                  Administrator Password
                </Label>
                <div className="relative">
                  <Input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your admin password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="pr-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:ring-red-500 focus:border-red-500"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-gray-500 hover:text-gray-700"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 flex items-center justify-center gap-2" 
                disabled={loading}
              >
                {loading ? (
                  "Authenticating..."
                ) : (
                  <>
                    <Settings className="w-4 h-4" />
                    Access Admin Dashboard
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-500">
                Need customer access?{" "}
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-blue-600 hover:text-blue-700"
                  onClick={() => navigate("/customer/login")}
                >
                  Customer Portal
                </Button>
              </p>
            </div>

            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-amber-700 text-xs">
                <Shield className="w-3 h-3" />
                <span className="font-medium">Security Notice:</span>
              </div>
              <p className="text-amber-600 text-xs mt-1">
                Administrator access is restricted and monitored. Only authorized personnel should access this area.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}