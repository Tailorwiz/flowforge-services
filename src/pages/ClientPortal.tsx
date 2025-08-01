import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { 
  Upload,
  FileText, 
  Calendar,
  MessageCircle,
  MessageSquare,
  CheckCircle,
  Clock,
  Download,
  HelpCircle,
  User,
  LogOut,
  Camera,
  Settings,
  Phone,
  Bell,
  BookOpen,
  AlertCircle,
  ListTodo,
  UserCheck,
  Edit,
  Save,
  Package
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import RDRLogo from "@/components/RDRLogo";
import AvatarUpload from "@/components/AvatarUpload";
import { ClientDeliveries } from "@/components/ClientDeliveries";

interface ClientProfile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  service_type: string;
  estimated_delivery_date?: string;
  status: string;
  progress_step: number;
  first_name?: string;
  last_name?: string;
  phone?: string;
  location?: string;
  job_title?: string;
  industry?: string;
  website?: string;
  bio?: string;
}

const PROGRESS_STEPS = [
  { id: 1, title: "Intake Form", description: "Complete your intake questionnaire", icon: FileText },
  { id: 2, title: "Upload Resume", description: "Upload your current resume", icon: Upload },
  { id: 3, title: "Book Session", description: "Schedule your consultation", icon: Calendar },
  { id: 4, title: "In Progress", description: "We're working on your documents", icon: Clock },
  { id: 5, title: "Review & Download", description: "Review and download your completed documents", icon: Download }
];

export default function ClientPortal() {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [needsPhotoUpload, setNeedsPhotoUpload] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [trainingMaterials, setTrainingMaterials] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0 });
  const [actionItems, setActionItems] = useState<any[]>([]);
  
  // Intake form state
  const [showIntakeForm, setShowIntakeForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    currentJobTitle: '',
    targetJobTitle: '',
    industry: '',
    experience: '',
    careerGoals: '',
    challenges: '',
    additionalInfo: ''
  });

  // Handle authentication redirect
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // Handle case where user is authenticated but has no client profile
  useEffect(() => {
    if (!authLoading && !loading && user && !profile) {
      console.log('ClientPortal: User authenticated but no client profile found, checking if admin...');
      checkIfUserIsAdmin();
    }
  }, [user, authLoading, loading, profile, navigate]);

  const checkIfUserIsAdmin = async () => {
    try {
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id)
        .maybeSingle();
      
      if (userRole?.role === 'admin') {
        console.log('ClientPortal: User is admin, redirecting to admin dashboard');
        navigate('/admin');
      } else {
        console.log('ClientPortal: User is not admin and has no client profile');
        navigate('/login');
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      navigate('/login');
    }
  };

  useEffect(() => {
    if (user) {
      fetchClientProfile();
      fetchMessages();
      fetchDocuments();
      fetchTrainingMaterials();
      fetchAlerts();
      fetchActionItems();
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
    const interval = setInterval(updateTimer, 60000);

    return () => clearInterval(interval);
  }, [profile?.estimated_delivery_date]);

  const fetchClientProfile = async () => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();

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
          progress_step: determineProgressStep(clientData),
          first_name: profileData?.first_name || clientData.name?.split(' ')[0] || '',
          last_name: profileData?.last_name || clientData.name?.split(' ').slice(1).join(' ') || '',
          phone: clientData.phone || profileData?.phone,
          location: profileData?.location,
          job_title: profileData?.job_title,
          industry: profileData?.industry,
          website: profileData?.website,
          bio: profileData?.bio
        });

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
      
      const sampleMaterials = data && data.length > 0 ? data : [
        {
          id: 1,
          name: 'Java Programming Fundamentals',
          description: 'Learn the basics of Java programming with hands-on exercises and real-world examples.',
          content_url: '#',
          thumbnail_url: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
          is_active: true
        },
        {
          id: 2,
          name: 'Web Development Bootcamp',
          description: 'Complete guide to modern web development covering HTML, CSS, JavaScript, and frameworks.',
          content_url: '#',
          thumbnail_url: 'https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
          is_active: true
        }
      ];
      
      setTrainingMaterials(sampleMaterials);
    } catch (error) {
      console.error('Error fetching training materials:', error);
    }
  };

  const fetchAlerts = async () => {
    setAlerts([
      {
        id: 1,
        type: 'info',
        title: 'Welcome!',
        message: 'Your project has been started. We\'ll keep you updated on progress.',
        timestamp: new Date().toISOString(),
        read: false
      }
    ]);
  };

  const fetchActionItems = async () => {
    try {
      if (!profile?.id) return;
      
      const { data } = await supabase
        .from('client_tasks')
        .select('*')
        .eq('client_id', profile.id)
        .order('task_order', { ascending: true });
      
      const sampleItems = data && data.length > 0 ? data : [
        {
          id: 1,
          name: 'Complete Intake Questionnaire',
          description: 'Please fill out the detailed questionnaire about your career goals and experience.',
          status: 'pending',
          due_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
          task_order: 1,
          assigned_date: new Date().toISOString().split('T')[0]
        }
      ];
      
      setActionItems(sampleItems);
    } catch (error) {
      console.error('Error fetching action items:', error);
    }
  };

  const determineProgressStep = (clientData: any) => {
    console.log('Determining progress step for client:', clientData);
    return 1;
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

  const handleIntakeFormClick = () => {
    console.log('Opening intake form...');
    setShowIntakeForm(!showIntakeForm);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      console.log('=== INTAKE FORM SUBMISSION DEBUG ===');
      console.log('Form data:', formData);
      console.log('Client ID:', profile?.id);
      console.log('User ID:', user?.id);

      if (!profile?.id) {
        throw new Error('Client information not loaded');
      }

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const { data: historyData, error: historyError } = await supabase
        .from('client_history')
        .insert({
          client_id: profile.id,
          action_type: 'intake_form_completed',
          description: 'Client completed intake questionnaire',
          metadata: formData,
          created_by: user.id
        })
        .select();

      if (historyError) {
        console.error('History insert error:', historyError);
        throw historyError;
      }

      const { data: updateData, error: updateError } = await supabase
        .from('clients')
        .update({ 
          intake_form_submitted: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)
        .select();

      if (updateError) {
        console.error('Client update error:', updateError);
        throw updateError;
      }

      setProfile(prev => prev ? { ...prev, progress_step: 2 } : null);
      setShowIntakeForm(false);
      
      toast({
        title: "Intake Form Submitted!",
        description: "Thank you for completing your intake questionnaire. We'll review your information and get started on your project.",
      });

      setFormData({
        currentJobTitle: '',
        targetJobTitle: '',
        industry: '',
        experience: '',
        careerGoals: '',
        challenges: '',
        additionalInfo: ''
      });

    } catch (error: any) {
      console.error('Error submitting intake form:', error);
      toast({
        title: "Error",
        description: `Failed to submit intake form: ${error.message || 'Please try again.'}`,
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Profile Not Found</h2>
          <p className="text-slate-600 mb-4">We couldn't find your client profile. Please contact support.</p>
          <Button onClick={() => navigate('/login')}>Back to Login</Button>
        </div>
      </div>
    );
  }

  const daysUntilDelivery = getDaysUntilDelivery();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <RDRLogo className="h-8 w-auto" />
              <div className="hidden md:block">
                <h1 className="text-xl font-semibold text-slate-800">Client Portal</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback>
                    {profile.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                {needsPhotoUpload && (
                  <div className="relative">
                    <Camera className="h-4 w-4 text-orange-500" />
                    <div className="absolute -top-1 -right-1 h-3 w-3 bg-orange-500 rounded-full"></div>
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
                      {timeRemaining.days > 0 ? `${timeRemaining.days} days` : 'Due now'}
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
              Project Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-700">Overall Progress</span>
                <span className="text-sm text-slate-600">{Math.round(getProgressPercentage())}% Complete</span>
              </div>
              <Progress value={getProgressPercentage()} className="h-2" />
            </div>
            
            <div className="grid gap-4 md:grid-cols-5">
              {PROGRESS_STEPS.map((step, index) => {
                const IconComponent = step.icon;
                const isCompleted = profile.progress_step > step.id;
                const isCurrent = profile.progress_step === step.id;
                
                return (
                  <div key={step.id} className="text-center">
                    <div className={`
                      w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center
                      ${isCompleted ? 'bg-primary text-white' : 
                        isCurrent ? 'bg-primary/20 text-primary border-2 border-primary' : 
                        'bg-slate-100 text-slate-400'}
                    `}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <p className={`text-sm font-medium ${isCurrent ? 'text-primary' : 'text-slate-700'}`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{step.description}</p>
                    
                    {/* Show intake form directly under Step 1 when it's current */}
                    {step.id === 1 && isCurrent && (
                      <div className="mt-4 col-span-full">
                        <Collapsible open={showIntakeForm} onOpenChange={setShowIntakeForm}>
                          <CollapsibleTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={handleIntakeFormClick}
                              className="w-full max-w-xs mx-auto"
                            >
                              {showIntakeForm ? 'Hide Questionnaire' : 'Start Questionnaire'}
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-4">
                            <Card className="border shadow-sm w-full">
                              <CardHeader>
                                <CardTitle className="text-lg text-center">Intake Questionnaire</CardTitle>
                                <p className="text-sm text-slate-600 text-center">Please provide detailed information to help us create your perfect resume</p>
                              </CardHeader>
                              <CardContent>
                                <form onSubmit={handleIntakeSubmit} className="space-y-6">
                                  <div className="grid gap-6 lg:grid-cols-3 md:grid-cols-2">
                                    <div>
                                      <Label htmlFor="currentJobTitle">Current Job Title</Label>
                                      <Input
                                      id="currentJobTitle"
                                      value={formData.currentJobTitle}
                                      onChange={(e) => handleInputChange('currentJobTitle', e.target.value)}
                                      placeholder="e.g., Marketing Coordinator"
                                      required
                                    />
                                    </div>
                                  </div>

                                  <div>
                                      <Label htmlFor="targetJobTitle">Target Job Title</Label>
                                      <Input
                                      id="targetJobTitle"
                                      value={formData.targetJobTitle}
                                      onChange={(e) => handleInputChange('targetJobTitle', e.target.value)}
                                      placeholder="e.g., Marketing Manager"
                                      required
                                    />
                                    </div>

                                    <div>
                                      <Label htmlFor="industry">Industry</Label>
                                      <Input
                                      id="industry"
                                      value={formData.industry}
                                      onChange={(e) => handleInputChange('industry', e.target.value)}
                                      placeholder="e.g., Technology, Healthcare, Finance"
                                      required
                                    />
                                    </div>

                                    <div>
                                      <Label htmlFor="experience">Years of Experience</Label>
                                      <Input
                                      id="experience"
                                      value={formData.experience}
                                      onChange={(e) => handleInputChange('experience', e.target.value)}
                                      placeholder="e.g., 5 years"
                                      required
                                    />
                                  </div>

                                  <div className="grid gap-6 lg:grid-cols-2">
                                    <div>
                                      <Label htmlFor="careerGoals">Career Goals</Label>
                                    <Textarea
                                      id="careerGoals"
                                      value={formData.careerGoals}
                                      onChange={(e) => handleInputChange('careerGoals', e.target.value)}
                                      placeholder="Describe your short-term and long-term career objectives..."
                                      rows={3}
                                      required
                                    />
                                    </div>

                                    <div>
                                      <Label htmlFor="challenges">Current Challenges</Label>
                                      <Textarea
                                      id="challenges"
                                      value={formData.challenges}
                                      onChange={(e) => handleInputChange('challenges', e.target.value)}
                                      placeholder="What challenges are you facing in your job search or career?"
                                      rows={3}
                                    />
                                    </div>
                                  </div>

                                  <div>
                                    <Label htmlFor="additionalInfo">Additional Information</Label>
                                    <Textarea
                                      id="additionalInfo"
                                      value={formData.additionalInfo}
                                      onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
                                      placeholder="Any other information you'd like us to know..."
                                      rows={3}
                                    />
                                  </div>

                                  <div className="flex justify-center gap-4 pt-6">
                                    <Button type="submit" className="px-8" disabled={formLoading}>
                                      {formLoading ? "Submitting..." : "Submit Questionnaire"}
                                    </Button>
                                    <Button type="button" variant="outline" className="px-8" onClick={() => setShowIntakeForm(false)}>
                                      Cancel
                                    </Button>
                                  </div>
                                </form>
                              </CardContent>
                            </Card>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="deliveries" className="space-y-6">
          <TabsList className="grid w-full grid-cols-8 bg-white shadow-sm border">
            <TabsTrigger value="deliveries" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Deliveries
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="action-items" className="flex items-center gap-2">
              <ListTodo className="w-4 h-4" />
              Action Items
            </TabsTrigger>
            <TabsTrigger value="training" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Training
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Alerts
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="help" className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Help
            </TabsTrigger>
          </TabsList>

          {/* Deliveries Tab */}
          <TabsContent value="deliveries">
            <ClientDeliveries />
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {documents.map((doc) => {
                    const getIcon = (type: string) => {
                      switch (type.toLowerCase()) {
                        case 'resume': return FileText;
                        case 'cover letter': return MessageSquare;
                        case 'linkedin': return User;
                        default: return FileText;
                      }
                    };
                    const IconComponent = getIcon(doc.type);
                    
                    return (
                      <Card key={doc.id} className="border border-slate-200">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <IconComponent className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium text-slate-800">{doc.name}</h3>
                              <Badge variant={
                                doc.status === 'completed' ? 'default' :
                                doc.status === 'in_progress' ? 'secondary' : 'outline'
                              }>
                                {doc.status.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>
                          {doc.status === 'completed' && (
                            <Button size="sm" className="w-full">
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

          {/* Action Items Tab */}
          <TabsContent value="action-items">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListTodo className="w-5 h-5 text-primary" />
                  Action Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {actionItems.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{item.name}</h3>
                        <Badge variant={
                          item.status === 'completed' ? 'default' :
                          item.status === 'pending' ? 'secondary' :
                          item.status === 'waiting_admin' ? 'outline' : 'destructive'
                        }>
                          {item.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-slate-600 text-sm mb-2">{item.description}</p>
                      <p className="text-xs text-slate-500">Due: {item.due_date}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Training Tab */}
          <TabsContent value="training">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Training Materials
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {trainingMaterials.map((material) => (
                    <Card key={material.id} className="border border-slate-200 overflow-hidden">
                      <div className="aspect-video bg-slate-100">
                        <img 
                          src={material.thumbnail_url} 
                          alt={material.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-slate-800 mb-2">{material.name}</h3>
                        <p className="text-sm text-slate-600 mb-4 line-clamp-3">{material.description}</p>
                        <Button size="sm" className="w-full">
                          <BookOpen className="w-4 h-4 mr-2" />
                          Start Learning
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Messages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className="border rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {message.sender === 'admin' ? 'RDR' : 'You'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-slate-800">{message.sender_name}</p>
                            <span className="text-xs text-slate-500">
                              {new Date(message.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-slate-600">{message.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 border border-slate-200 rounded-lg">
                  <p className="text-sm text-slate-600 mb-3">Send us a message:</p>
                  <div className="flex gap-2">
                    <Input placeholder="Type your message..." className="flex-1" />
                    <Button>Send</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-primary" />
                  Notifications & Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div key={alert.id} className={`border rounded-lg p-4 ${!alert.read ? 'bg-blue-50 border-blue-200' : ''}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={
                              alert.type === 'info' ? 'default' :
                              alert.type === 'warning' ? 'secondary' :
                              alert.type === 'reminder' ? 'outline' : 'destructive'
                            }>
                              {alert.type}
                            </Badge>
                            <span className="text-xs text-slate-500">
                              {new Date(alert.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                          <h3 className="font-medium text-slate-800 mb-1">{alert.title}</h3>
                          <p className="text-slate-600 text-sm">{alert.message}</p>
                        </div>
                        {!alert.read && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => markAlertAsRead(alert.id)}
                          >
                            Mark as Read
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Profile Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {needsPhotoUpload && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <Camera className="h-5 w-5 text-orange-600" />
                      <div className="flex-1">
                        <h3 className="font-medium text-orange-800">Profile Photo Needed</h3>
                        <p className="text-sm text-orange-700">Please upload a professional headshot for your profile.</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <AvatarUpload onAvatarUpdate={handlePhotoUpload} />
                    </div>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" value={profile.first_name || ''} readOnly />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" value={profile.last_name || ''} readOnly />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={profile.email} disabled />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" value={profile.phone || ''} readOnly />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button className="flex-1">
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button onClick={handleSignOut} variant="outline">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Help Tab */}
          <TabsContent value="help">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardContent className="p-6 text-center">
                  <MessageCircle className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Contact Support</h3>
                  <p className="text-slate-600 mb-4">Have questions? Our support team is here to help.</p>
                  <Button className="w-full">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Send Message
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <Phone className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Schedule a Call</h3>
                  <p className="text-slate-600 mb-4">Want to discuss your project over the phone?</p>
                  <Button onClick={handleRequestCall} className="w-full" variant="outline">
                    <Phone className="w-4 h-4 mr-2" />
                    Request Call
                  </Button>
                </CardContent>
              </Card>
            </div>
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