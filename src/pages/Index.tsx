import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ClientManager } from "@/components/ClientManager";
import { ServiceTypeAdmin } from "@/components/ServiceTypeAdmin";
import { ReminderManager } from "@/components/ReminderManager";
import { DailyDigest } from "@/components/DailyDigest";
import { AdminProfile } from "@/components/AdminProfile";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";
import { LogOut, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const [activeTab, setActiveTab] = useState<'digest' | 'clients' | 'reminders' | 'services' | 'profile'>('digest');
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your account."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth page
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Service Type Management System</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              {user.email}
            </div>
            <div className="flex gap-2">
              <Button 
                variant={activeTab === 'digest' ? 'default' : 'outline'}
                onClick={() => setActiveTab('digest')}
              >
                Daily Digest
              </Button>
              <Button 
                variant={activeTab === 'clients' ? 'default' : 'outline'}
                onClick={() => setActiveTab('clients')}
              >
                Client Management
              </Button>
              <Button 
                variant={activeTab === 'reminders' ? 'default' : 'outline'}
                onClick={() => setActiveTab('reminders')}
              >
                Reminders
              </Button>
              <Button 
                variant={activeTab === 'services' ? 'default' : 'outline'}
                onClick={() => setActiveTab('services')}
              >
                Service Settings
              </Button>
              <Button 
                variant={activeTab === 'profile' ? 'default' : 'outline'}
                onClick={() => setActiveTab('profile')}
              >
                Admin Profile
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleSignOut}
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
        
        {activeTab === 'digest' && <DailyDigest />}
        {activeTab === 'clients' && <ClientManager />}
        {activeTab === 'reminders' && <ReminderManager />}
        {activeTab === 'services' && <ServiceTypeAdmin />}
        {activeTab === 'profile' && <AdminProfile />}
      </div>
    </div>
  );
};

export default Index;
