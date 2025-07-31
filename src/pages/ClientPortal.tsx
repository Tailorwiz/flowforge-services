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
  Camera
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

  useEffect(() => {
    if (user) {
      fetchClientProfile();
      fetchMessages();
      fetchDocuments();
    }
  }, [user]);

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
            <h2 className="text-xl font-bold mb-2 text-slate-800">Profile Not Found</h2>
            <p className="text-slate-600 mb-4">We couldn't find your client profile. Please contact support.</p>
            <Button variant="outline">Contact Support</Button>
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
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                <AvatarImage src={profile.avatar_url} alt={profile.name} />
                <AvatarFallback>
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-800">{profile.name}</p>
                <p className="text-xs text-slate-600">{profile.service_type}</p>
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
          <TabsList className="grid w-full grid-cols-3 bg-white shadow-sm border">
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              My Documents
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="help" className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Need Help?
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

          {/* Help Tab */}
          <TabsContent value="help">
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <HelpCircle className="w-16 h-16 text-primary mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">We're here to help!</h3>
                    <p className="text-slate-600 mb-6">
                      Have questions about your project or need assistance? Contact our support team.
                    </p>
                    <div className="space-y-3">
                      <Button className="w-full" size="lg">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Chat with Support
                      </Button>
                      <Button variant="outline" className="w-full" size="lg">
                        <Calendar className="w-4 h-4 mr-2" />
                        Schedule a Call
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Floating Help Button */}
        <div className="fixed bottom-6 right-6">
          <Button size="lg" className="rounded-full shadow-lg h-14 w-14">
            <HelpCircle className="w-6 h-6" />
          </Button>
        </div>
      </main>
    </div>
  );
}