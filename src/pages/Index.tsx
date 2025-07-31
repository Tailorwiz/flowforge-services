import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ClientManager } from "@/components/ClientManager";
import { ServiceTypeAdmin } from "@/components/ServiceTypeAdmin";
import { ReminderManager } from "@/components/ReminderManager";
import { DailyDigest } from "@/components/DailyDigest";
import { AdminProfile } from "@/components/AdminProfile";
import { AdminCommandCenter } from "@/components/AdminCommandCenter";
import { NotificationCenter } from "@/components/NotificationCenter";
import TrainingMaterialUpload from "@/components/TrainingMaterialUpload";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Bell, 
  Settings, 
  User, 
  Calendar,
  LogOut,
  Zap,
  Clock,
  AlertTriangle,
  ChevronDown
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import RDRLogo from "@/components/RDRLogo";
import AvatarUpload from "@/components/AvatarUpload";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Index = () => {
  const [activeTab, setActiveTab] = useState<'digest' | 'command' | 'clients' | 'training' | 'reminders' | 'notifications' | 'services' | 'profile'>('digest');
  const [userProfile, setUserProfile] = useState<any>(null);
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

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
      <div className="flex items-center justify-center min-h-screen bg-rdr-light-gray">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-rdr-navy border-t-rdr-gold mx-auto mb-4"></div>
          <span className="text-lg font-medium text-rdr-navy">Loading RDR Project Portal...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const sidebarItems = [
    { id: 'command', label: 'Command Center', icon: LayoutDashboard, color: 'text-rdr-navy' },
    { id: 'clients', label: 'Client Management', icon: Users, color: 'text-blue-600' },
    { id: 'digest', label: 'Daily Digest', icon: Calendar, color: 'text-green-600' },
    { id: 'training', label: 'Training Materials', icon: BookOpen, color: 'text-purple-600' },
    { id: 'reminders', label: 'Reminders', icon: Clock, color: 'text-orange-600' },
    { id: 'notifications', label: 'Notifications', icon: Bell, color: 'text-red-600' },
    { id: 'services', label: 'Service Settings', icon: Settings, color: 'text-gray-600' },
    { id: 'profile', label: 'Admin Profile', icon: User, color: 'text-indigo-600' },
  ];

  return (
    <div className="min-h-screen bg-rdr-light-gray flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-xl border-r border-border flex flex-col">
        {/* Logo Header */}
        <div className="p-6 border-b border-border">
          <RDRLogo />
          <p className="text-sm text-rdr-medium-gray mt-2">Admin Dashboard</p>
        </div>

        {/* Quick Stats */}
        <div className="p-4 border-b border-border">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-rdr-light-gray rounded-lg p-2">
              <div className="flex items-center justify-center mb-1">
                <Zap className="w-4 h-4 text-rdr-gold" />
              </div>
              <div className="text-xs font-medium text-rdr-navy">5</div>
              <div className="text-xs text-rdr-medium-gray">Rush</div>
            </div>
            <div className="bg-rdr-light-gray rounded-lg p-2">
              <div className="flex items-center justify-center mb-1">
                <Clock className="w-4 h-4 text-orange-500" />
              </div>
              <div className="text-xs font-medium text-rdr-navy">12</div>
              <div className="text-xs text-rdr-medium-gray">Due</div>
            </div>
            <div className="bg-rdr-light-gray rounded-lg p-2">
              <div className="flex items-center justify-center mb-1">
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <div className="text-xs font-medium text-rdr-navy">3</div>
              <div className="text-xs text-rdr-medium-gray">Overdue</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200
                    ${activeTab === item.id 
                      ? 'bg-rdr-navy text-white shadow-lg' 
                      : 'text-rdr-medium-gray hover:bg-rdr-light-gray hover:text-rdr-navy'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 ${activeTab === item.id ? 'text-white' : item.color}`} />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full p-3 h-auto justify-start">
                <div className="flex items-center gap-3 w-full">
                  <AvatarUpload 
                    currentAvatarUrl={userProfile?.avatar_url}
                    onAvatarUpdate={(url) => setUserProfile({...userProfile, avatar_url: url})}
                    size="md"
                    showUploadButton={true}
                  />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-rdr-navy truncate">
                      {userProfile?.display_name || user.email}
                    </p>
                    <p className="text-xs text-rdr-medium-gray">Administrator</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-rdr-medium-gray" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setActiveTab('profile')}>
                <User className="w-4 h-4 mr-2" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-rdr-navy font-heading">
              {sidebarItems.find(item => item.id === activeTab)?.label || 'Dashboard'}
            </h1>
          </div>

          {/* Content */}
          <div className="bg-white rounded-xl shadow-lg border border-border min-h-[600px] p-6">
            {activeTab === 'digest' && <DailyDigest />}
            {activeTab === 'command' && <AdminCommandCenter />}
            {activeTab === 'clients' && <ClientManager />}
            {activeTab === 'training' && <TrainingMaterialUpload />}
            {activeTab === 'reminders' && <ReminderManager />}
            {activeTab === 'notifications' && <NotificationCenter />}
            {activeTab === 'services' && <ServiceTypeAdmin />}
            {activeTab === 'profile' && <AdminProfile />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
