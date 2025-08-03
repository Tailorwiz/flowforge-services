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
import AdminDashboard from "./AdminDashboard";
import { AdminDeliveryManager } from "@/components/AdminDeliveryManager";
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
  ChevronDown,
  FileText,
  Package
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
  const [activeTab, setActiveTab] = useState<'digest' | 'command' | 'clients' | 'training' | 'reminders' | 'notifications' | 'services' | 'profile' | 'intake-review' | 'deliveries'>('digest');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [dashboardStats, setDashboardStats] = useState({
    rushCount: 0,
    dueCount: 0,
    overdueCount: 0
  });
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    } else if (user) {
      // Check if user is admin, if not redirect to customer portal
      checkUserRole();
    }
  }, [user, loading, navigate]);

  const checkUserRole = async () => {
    try {
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id)
        .maybeSingle();
      
      if (userRole?.role !== 'admin') {
        navigate("/portal");
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      // If can't determine role, redirect to portal for safety
      navigate("/portal");
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchDashboardStats();
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
      console.log('Fetched user profile:', data);
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const { data: clients, error } = await supabase
        .from('clients')
        .select('id, is_rush, estimated_delivery_date, status')
        .eq('status', 'active');

      if (error) throw error;

      const today = new Date().toISOString().split('T')[0];
      
      const rushCount = clients?.filter(client => client.is_rush).length || 0;
      const dueCount = clients?.filter(client => 
        client.estimated_delivery_date === today && !client.is_rush
      ).length || 0;
      const overdueCount = clients?.filter(client => 
        client.estimated_delivery_date < today && !client.is_rush
      ).length || 0;

      setDashboardStats({
        rushCount,
        dueCount,
        overdueCount
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  // Listen for real-time profile updates
  useEffect(() => {
    if (user) {
      const channel = supabase
        .channel('profile-changes')
        .on('postgres_changes', 
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'profiles',
            filter: `id=eq.${user.id}`
          }, 
          (payload) => {
            console.log('Profile updated via realtime:', payload);
            setUserProfile(payload.new);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  // Listen for real-time client updates to refresh dashboard stats
  useEffect(() => {
    if (user) {
      const channel = supabase
        .channel('client-changes')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'clients'
          }, 
          () => {
            fetchDashboardStats();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  // Listen for profile updates from other components
  useEffect(() => {
    const handleProfileUpdate = (event: any) => {
      console.log('Profile update event received:', event.detail);
      setUserProfile(prev => ({...prev, ...event.detail}));
      fetchUserProfile(); // Refresh from database
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/login");
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
    { id: 'intake-review', label: 'Intake Review', icon: FileText, color: 'text-teal-600' },
    { id: 'deliveries', label: 'Delivery Manager', icon: Package, color: 'text-emerald-600' },
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
              <div className="text-xs font-medium text-rdr-navy">{dashboardStats.rushCount}</div>
              <div className="text-xs text-rdr-medium-gray">Rush</div>
            </div>
            <div className="bg-rdr-light-gray rounded-lg p-2">
              <div className="flex items-center justify-center mb-1">
                <Clock className="w-4 h-4 text-orange-500" />
              </div>
              <div className="text-xs font-medium text-rdr-navy">{dashboardStats.dueCount}</div>
              <div className="text-xs text-rdr-medium-gray">Due</div>
            </div>
            <div className="bg-rdr-light-gray rounded-lg p-2">
              <div className="flex items-center justify-center mb-1">
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <div className="text-xs font-medium text-rdr-navy">{dashboardStats.overdueCount}</div>
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

        {/* User Section - Simplified */}
        <div className="p-4 border-t border-border">
          <Button 
            onClick={handleSignOut} 
            variant="outline" 
            size="sm"
            className="w-full flex items-center gap-2 text-rdr-medium-gray hover:text-rdr-navy border-border"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 pb-1">
          {/* Header */}
          <div className="mb-2 flex items-center justify-between">
            <div className="mt-2">
              <h1 className="text-3xl font-bold text-rdr-navy font-heading">
                {sidebarItems.find(item => item.id === activeTab)?.label || 'Dashboard'}
              </h1>
            </div>
            
            {/* User Profile Section - Top Right */}
            <div className="flex items-center gap-4 -mt-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="p-3 h-auto">
                    <div className="flex items-center gap-3">
                      <AvatarUpload 
                        currentAvatarUrl={userProfile?.avatar_url}
                        onAvatarUpdate={(url) => {
                          console.log('Top right avatar updated:', url);
                          setUserProfile(prev => ({...prev, avatar_url: url}));
                          // Force a profile refresh to sync everywhere
                          setTimeout(() => {
                            fetchUserProfile();
                          }, 500);
                        }}
                        size="lg"
                        showUploadButton={true}
                      />
                      <div className="text-left">
                        <p className="text-sm font-medium text-rdr-navy">
                          {userProfile?.display_name || user.email}
                        </p>
                        <p className="text-xs text-rdr-medium-gray">Administrator</p>
                      </div>
                      <ChevronDown className="w-4 h-4 text-rdr-medium-gray ml-2" />
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

          {/* Content */}
          <div className="bg-white rounded-xl shadow-lg border border-border min-h-[600px] p-6 mt-1">
            {activeTab === 'digest' && <DailyDigest />}
            {activeTab === 'command' && <AdminCommandCenter />}
            {activeTab === 'intake-review' && <AdminDashboard />}
            {activeTab === 'deliveries' && <AdminDeliveryManager />}
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
