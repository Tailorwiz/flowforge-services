import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { 
  Upload,
  FileText, 
  Calendar,
  MessageCircle,
  CheckCircle,
  Clock,
  Download,
  HelpCircle,
  User,
  Camera,
  Settings,
  Phone,
  Bell,
  BookOpen,
  AlertCircle
} from "lucide-react";
import RDRLogo from "@/components/RDRLogo";
import AvatarUpload from "@/components/AvatarUpload";

interface ClientProfile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  service_type: string;
  estimated_delivery_date?: string;
  status: string;
  progress_step: number;
}

const PROGRESS_STEPS = [
  { id: 1, title: "Intake Form", description: "Complete your intake questionnaire", icon: FileText },
  { id: 2, title: "Upload Resume", description: "Upload your current resume", icon: Upload },
  { id: 3, title: "Book Session", description: "Schedule your consultation", icon: Calendar },
  { id: 4, title: "In Progress", description: "We're working on your documents", icon: Clock },
  { id: 5, title: "Review & Download", description: "Review and download your completed documents", icon: Download }
];

export default function ClientPortal() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [needsPhotoUpload, setNeedsPhotoUpload] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [trainingMaterials, setTrainingMaterials] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0 });

  useEffect(() => {
    if (user) {
      fetchClientProfile();
      fetchMessages();
      fetchDocuments();
      fetchTrainingMaterials();
      fetchAlerts();
    }
  }, [user]);

  // Countdown timer effect
  useEffect(() => {
    if (!profile?.estimated_delivery_date) return;

    const updateTimer = () => {
      const deliveryDate = new Date(profile.estimated_delivery_date);
      const now = new Date();
      const timeDiff = deliveryDate.getTime() - now.getTime();
      
      if (timeDiff > 0) {
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        
        setTimeRemaining({ days, hours, minutes });
      } else {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0 });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [profile?.estimated_delivery_date]);

  const fetchClientProfile = async () => {
    try {
      // Check if user has a profile with avatar
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();

      // Check if user exists as a client
      const { data: clientData } = await supabase
        .from('clients')
        .select(`
          *,
          service_types (name)
        `)
        .eq('email', user?.email)
        .maybeSingle();

      if (clientData) {
        setProfile({
          id: clientData.id,
          name: clientData.name,
          email: clientData.email,
          avatar_url: profileData?.avatar_url,
          service_type: clientData.service_types?.name || 'Resume Package',
          estimated_delivery_date: clientData.estimated_delivery_date,
          status: clientData.status,
          progress_step: determineProgressStep(clientData)
        });

        // Check if profile photo is needed
        if (!profileData?.avatar_url) {
          setNeedsPhotoUpload(true);
        }
      }
    } catch (error) {
      console.error('Error fetching client profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    // Mock messages for now
    setMessages([
      {
        id: 1,
        sender: 'admin',
        message: 'Welcome to RDR Project Portal! We\'ll be working together to create your professional documents.',
        timestamp: new Date().toISOString(),
        sender_name: 'Results Driven Resumes'
      }
    ]);
  };

  const fetchDocuments = async () => {
    // Mock documents for now
    setDocuments([
      {
        id: 1,
        name: 'Professional Resume',
        type: 'resume',
        status: 'in_progress',
        icon: FileText
      },
      {
        id: 2,
        name: 'Cover Letter Template',
        type: 'cover_letter',
        status: 'pending',
        icon: FileText
      }
    ]);
  };

  const fetchTrainingMaterials = async () => {
    try {
      const { data } = await supabase
        .from('training_materials')
        .select('*')
        .eq('is_active', true);
      
      setTrainingMaterials(data || []);
    } catch (error) {
      console.error('Error fetching training materials:', error);
    }
  };

  const fetchAlerts = async () => {
    // Mock alerts for now
    setAlerts([
      {
        id: 1,
        type: 'info',
        title: 'Welcome!',
        message: 'Your project has been started. We\'ll keep you updated on progress.',
        timestamp: new Date().toISOString(),
        read: false
      },
      {
        id: 2,
        type: 'reminder',
        title: 'Document Upload',
        message: 'Please upload your current resume when convenient.',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        read: true
      }
    ]);
  };

  const determineProgressStep = (clientData: any) => {
    // Logic to determine current progress step based on client data
    // This would be based on your actual business logic
    return 2; // Example: currently on step 2
  };

  const getProgressPercentage = () => {
    if (!profile) return 0;
    return (profile.progress_step / PROGRESS_STEPS.length) * 100;
  };

  const getDaysUntilDelivery = () => {
    if (!profile?.estimated_delivery_date) return null;
    
    const deliveryDate = new Date(profile.estimated_delivery_date);
    const today = new Date();
    const diffTime = deliveryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const handlePhotoUpload = (avatarUrl: string) => {
    setProfile(prev => prev ? { ...prev, avatar_url: avatarUrl } : null);
    setNeedsPhotoUpload(false);
    toast({
      title: "Profile photo updated!",
      description: "Your profile photo has been successfully uploaded."
    });
  };

  const handleRequestCall = () => {
    const subject = `Call Request - ${profile?.name}`;
    const body = `Hi,\n\nI would like to schedule a call to discuss my project.\n\nClient: ${profile?.name}\nEmail: ${profile?.email}\nService: ${profile?.service_type}\n\nPlease let me know your availability.\n\nThank you!`;
    window.location.href = `mailto:support@resultsdrivenresumes.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const markAlertAsRead = (alertId: number) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, read: true } : alert
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <span className="text-lg font-medium text-slate-700">Loading your portal...</span>
        </div>
      </div>
    );
  };

  // Profile photo upload modal
  if (needsPhotoUpload) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="text-center">
            <div className="mb-4">
              <RDRLogo />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-800">Welcome to RDR Project Portal</CardTitle>
            <p className="text-slate-600">Let's get started by adding your profile photo</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                <Camera className="w-8 h-8 text-slate-400" />
              </div>
              <AvatarUpload 
                currentAvatarUrl={profile?.avatar_url}
                onAvatarUpdate={handlePhotoUpload}
                size="lg"
                showUploadButton={true}
              />
            </div>
            <div className="text-sm text-slate-600 space-y-2">
              <p><strong>Requirements:</strong></p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Clear headshot or professional photo</li>
                <li>JPG or PNG format</li>
                <li>Minimum 400x400 pixels</li>
              </ul>
              <p className="text-center mt-4 text-slate-500">
                This helps us personalize your experience and keep your account secure.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardContent className="text-center p-8">
            <div className="mb-4">
              <RDRLogo />
            </div>
            <h2 className="text-xl font-bold mb-2 text-slate-800">Welcome to RDR Project Portal</h2>
            <p className="text-slate-600 mb-6">
              Your account has been created successfully! We're setting up your customer profile. 
              Please contact us to get started with your project.
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => window.location.href = '/auth'} 
                variant="outline" 
                className="w-full"
              >
                Back to Sign In
              </Button>
              <Button 
                onClick={() => window.location.href = 'mailto:support@resultsdrivenresumes.com'} 
                className="w-full"
              >
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const daysUntilDelivery = getDaysUntilDelivery();
  const progressPercentage = getProgressPercentage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <RDRLogo />
              <div>
                <h1 className="text-xl font-bold text-slate-800">RDR Project Portal</h1>
                <p className="text-sm text-slate-600">Client Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                  <AvatarImage src={profile.avatar_url} alt={profile.name} />
                  <AvatarFallback>
                    <User className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                {!profile.avatar_url && (
                  <div className="absolute -bottom-1 -right-1 bg-orange-500 text-white rounded-full p-1">
                    <Camera className="h-3 w-3" />
                  </div>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-800">{profile.name}</p>
                <p className="text-xs text-slate-600">{profile.service_type}</p>
                {alerts.filter(a => !a.read).length > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <Bell className="h-3 w-3 text-orange-500" />
                    <span className="text-xs text-orange-600">{alerts.filter(a => !a.read).length} new</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Card */}
        <Card className="mb-8 shadow-lg border-0 bg-gradient-to-r from-primary to-primary/80">
          <CardContent className="p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">Welcome back, {profile.name.split(' ')[0]}!</h2>
                <p className="text-white/90">Your {profile.service_type} is in progress</p>
              </div>
              <div className="text-right">
                {daysUntilDelivery && (
                  <div>
                    <p className="text-white/90 text-sm">Estimated delivery</p>
                    <p className="text-2xl font-bold">
                      {daysUntilDelivery > 0 ? `${daysUntilDelivery} days` : 'Due now'}
                    </p>
                    {daysUntilDelivery > 0 && (
                      <p className="text-xs text-white/70 mt-1">
                        {timeRemaining.days} Days, {timeRemaining.hours} hours, {timeRemaining.minutes} Minutes
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Tracker */}
        <Card className="mb-8 shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              Your Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">Overall Progress</span>
                  <span className="text-primary font-semibold">{Math.round(progressPercentage)}% Complete</span>
                </div>
                <Progress value={progressPercentage} className="h-3" />
              </div>
              
              <div className="grid gap-4">
                {PROGRESS_STEPS.map((step, index) => {
                  const isCompleted = profile.progress_step > step.id;
                  const isCurrent = profile.progress_step === step.id;
                  const IconComponent = step.icon;
                  
                  return (
                    <div key={step.id} className={`flex items-center gap-4 p-4 rounded-lg border ${
                      isCompleted ? 'bg-green-50 border-green-200' :
                      isCurrent ? 'bg-primary/5 border-primary/20' :
                      'bg-slate-50 border-slate-200'
                    }`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isCompleted ? 'bg-green-500 text-white' :
                        isCurrent ? 'bg-primary text-white' :
                        'bg-slate-300 text-slate-600'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <IconComponent className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-800">{step.title}</h4>
                        <p className="text-sm text-slate-600">{step.description}</p>
                      </div>
                      {isCompleted && (
                        <Badge variant="default" className="bg-green-500">
                          Complete
                        </Badge>
                      )}
                      {isCurrent && (
                        <Badge variant="default">
                          In Progress
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="documents" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 bg-white shadow-sm border">
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="training" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Training
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Alerts
              {alerts.filter(a => !a.read).length > 0 && (
                <span className="bg-orange-500 text-white text-xs rounded-full px-1.5 py-0.5 ml-1">
                  {alerts.filter(a => !a.read).length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="help" className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Help
            </TabsTrigger>
          </TabsList>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle>Your Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {documents.map((doc) => {
                    const IconComponent = doc.icon;
                    return (
                      <Card key={doc.id} className="border border-slate-200 hover:shadow-md transition-shadow">
                        <CardContent className="p-6 text-center">
                          <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                            <IconComponent className="w-8 h-8 text-primary" />
                          </div>
                          <h3 className="font-semibold text-slate-800 mb-2">{doc.name}</h3>
                          <Badge variant={doc.status === 'in_progress' ? 'default' : 'secondary'}>
                            {doc.status === 'in_progress' ? 'In Progress' : 'Pending'}
                          </Badge>
                          {doc.status === 'completed' && (
                            <Button className="w-full mt-4" variant="outline">
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Training Materials Tab */}
          <TabsContent value="training">
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Training Materials
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {trainingMaterials.length > 0 ? trainingMaterials.map((material) => (
                    <Card key={material.id} className="border border-slate-200 hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="aspect-video bg-slate-100 rounded-lg mb-3 flex items-center justify-center">
                          {material.thumbnail_url ? (
                            <img src={material.thumbnail_url} alt={material.name} className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <FileText className="w-8 h-8 text-slate-400" />
                          )}
                        </div>
                        <h3 className="font-semibold text-sm mb-2">{material.name}</h3>
                        <p className="text-xs text-slate-600 mb-3">{material.description}</p>
                        <Button size="sm" className="w-full" asChild>
                          <a href={material.content_url} target="_blank" rel="noopener noreferrer">
                            <BookOpen className="w-4 h-4 mr-2" />
                            Access
                          </a>
                        </Button>
                      </CardContent>
                    </Card>
                  )) : (
                    <div className="col-span-full text-center py-8">
                      <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500">No training materials available yet.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle>Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {messages.map((message) => (
                    <div key={message.id} className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>RDR</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="bg-slate-100 rounded-lg p-3">
                          <p className="text-sm">{message.message}</p>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(message.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Type your message..."
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <Button>Send</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts">
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  Notifications & Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div 
                      key={alert.id} 
                      className={`p-4 rounded-lg border-l-4 ${
                        alert.type === 'info' ? 'bg-blue-50 border-blue-400' :
                        alert.type === 'reminder' ? 'bg-orange-50 border-orange-400' :
                        'bg-gray-50 border-gray-400'
                      } ${!alert.read ? 'ring-2 ring-primary/20' : ''}`}
                      onClick={() => markAlertAsRead(alert.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${
                          alert.type === 'info' ? 'bg-blue-100' :
                          alert.type === 'reminder' ? 'bg-orange-100' :
                          'bg-gray-100'
                        }`}>
                          {alert.type === 'info' ? (
                            <AlertCircle className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Clock className="w-4 h-4 text-orange-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-slate-800">{alert.title}</h4>
                            {!alert.read && (
                              <div className="w-2 h-2 bg-primary rounded-full"></div>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 mb-2">{alert.message}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(alert.timestamp).toLocaleDateString()} at {new Date(alert.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Profile & Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Profile Photo */}
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="relative inline-block">
                        <Avatar className="h-24 w-24 ring-4 ring-primary/20">
                          <AvatarImage src={profile.avatar_url} alt={profile.name} />
                          <AvatarFallback className="text-lg">
                            <User className="h-8 w-8" />
                          </AvatarFallback>
                        </Avatar>
                        <AvatarUpload 
                          currentAvatarUrl={profile.avatar_url}
                          onAvatarUpdate={(url) => {
                            setProfile(prev => prev ? { ...prev, avatar_url: url } : null);
                          }}
                          size="lg"
                          showUploadButton={true}
                        />
                      </div>
                      <h3 className="text-lg font-semibold mt-4">{profile.name}</h3>
                      <p className="text-slate-600">{profile.email}</p>
                    </div>
                  </div>

                  {/* Profile Info */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Service Package</label>
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="font-medium text-primary">{profile.service_type}</p>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Project Status</label>
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <Badge variant={profile.status === 'active' ? 'default' : 'secondary'}>
                          {profile.status}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Estimated Delivery</label>
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {profile.estimated_delivery_date ? 
                            new Date(profile.estimated_delivery_date).toLocaleDateString() : 
                            'To be determined'
                          }
                        </p>
                      </div>
                    </div>

                    <div className="pt-4">
                      <Button onClick={handleRequestCall} className="w-full" variant="outline">
                        <Phone className="w-4 h-4 mr-2" />
                        Request a Call
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Help Tab */}
          <TabsContent value="help">
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border border-slate-200">
                    <CardContent className="p-6 text-center">
                      <MessageCircle className="w-12 h-12 text-primary mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Send a Message</h3>
                      <p className="text-slate-600 mb-4">Have a question? Send us a message and we'll get back to you quickly.</p>
                      <Button className="w-full">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Start Chat
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border border-slate-200">
                    <CardContent className="p-6 text-center">
                      <Phone className="w-12 h-12 text-primary mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Schedule a Call</h3>
                      <p className="text-slate-600 mb-4">Want to discuss your project over the phone? Schedule a convenient time.</p>
                      <Button onClick={handleRequestCall} className="w-full" variant="outline">
                        <Phone className="w-4 h-4 mr-2" />
                        Request Call
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <div className="mt-8 p-6 bg-slate-50 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Frequently Asked Questions</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">How long does the process take?</h4>
                      <p className="text-sm text-slate-600">Most projects are completed within 5-7 business days, depending on the service package selected.</p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Can I request revisions?</h4>
                      <p className="text-sm text-slate-600">Yes! We include revisions with all our packages to ensure you're completely satisfied with the final result.</p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">How will I receive my documents?</h4>
                      <p className="text-sm text-slate-600">All completed documents will be available for download directly from this portal.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Floating Help Button */}
        <div className="fixed bottom-6 right-6">
          <Button size="lg" className="rounded-full shadow-lg h-14 w-14" onClick={handleRequestCall}>
            <Phone className="w-6 h-6" />
          </Button>
        </div>
      </main>
    </div>
  );
}