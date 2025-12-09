import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ClientProgressSidebar } from "@/components/ClientProgressSidebar";
import { ClientStepContent } from "@/components/ClientStepContent";
import { ClientDeliveriesSimple } from "@/components/ClientDeliveriesSimple";
import { ClientDocumentsChecklist } from "@/components/ClientDocumentsChecklist";
import { MessagingCenter } from "@/components/MessagingCenter";
import ResumeUpload from "@/components/ResumeUpload";
import CalendlyEmbed from "@/components/CalendlyEmbed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import AvatarUpload from "@/components/AvatarUpload";
import { User, Save, Menu, X, Clock, BookOpen, Play, FileText, ExternalLink } from "lucide-react";
import { differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds, format } from "date-fns";

interface ClientProfile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  service_type: string;
  session_booked?: boolean;
  intake_form_submitted?: boolean;
  resume_uploaded?: boolean;
  estimated_delivery_date?: string;
  is_rush?: boolean;
  first_name?: string;
  last_name?: string;
  phone?: string;
  job_title?: string;
  bio?: string;
}

interface TrainingMaterial {
  id: string;
  name: string;
  description?: string;
  content_url?: string;
  type: string;
  thumbnail_url?: string;
}

export default function ClientPortalSimple() {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [trainingMaterials, setTrainingMaterials] = useState<TrainingMaterial[]>([]);
  
  // Countdown timer
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  
  // Step-specific UI states
  const [showResumeUpload, setShowResumeUpload] = useState(false);
  const [showCalendly, setShowCalendly] = useState(false);
  
  // Profile editing
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    job_title: '',
    bio: ''
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/customer-auth');
    } else if (user) {
      fetchClientProfile();
      fetchTrainingMaterials();
    }
  }, [user, authLoading]);

  // Countdown timer effect
  useEffect(() => {
    if (!profile?.estimated_delivery_date) return;
    
    const updateCountdown = () => {
      const now = new Date();
      const dueDate = new Date(profile.estimated_delivery_date!);
      
      if (dueDate <= now) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      
      const days = differenceInDays(dueDate, now);
      const hours = differenceInHours(dueDate, now) % 24;
      const minutes = differenceInMinutes(dueDate, now) % 60;
      const seconds = differenceInSeconds(dueDate, now) % 60;
      
      setTimeRemaining({ days, hours, minutes, seconds });
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [profile?.estimated_delivery_date]);

  const fetchClientProfile = async () => {
    try {
      setLoading(true);
      
      const { data: clientData, error } = await supabase
        .from('clients')
        .select(`
          id, name, email, session_booked, intake_form_submitted, resume_uploaded,
          estimated_delivery_date, is_rush,
          service_types(name)
        `)
        .eq('user_id', user?.id)
        .single();

      if (error || !clientData) {
        console.error('Error fetching client:', error);
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('avatar_url, first_name, last_name, phone, job_title, bio')
        .eq('id', user?.id)
        .single();

      const clientProfile: ClientProfile = {
        id: clientData.id,
        name: clientData.name,
        email: clientData.email,
        avatar_url: profileData?.avatar_url,
        service_type: (clientData as any).service_types?.name || 'Service Package',
        session_booked: clientData.session_booked,
        intake_form_submitted: clientData.intake_form_submitted,
        resume_uploaded: clientData.resume_uploaded,
        estimated_delivery_date: clientData.estimated_delivery_date,
        is_rush: clientData.is_rush,
        first_name: profileData?.first_name,
        last_name: profileData?.last_name,
        phone: profileData?.phone,
        job_title: profileData?.job_title,
        bio: profileData?.bio
      };

      setProfile(clientProfile);
      setProfileForm({
        first_name: clientProfile.first_name || '',
        last_name: clientProfile.last_name || '',
        phone: clientProfile.phone || '',
        job_title: clientProfile.job_title || '',
        bio: clientProfile.bio || ''
      });

      // Determine initial step based on progress
      if (!clientProfile.intake_form_submitted) {
        setCurrentStep(1);
      } else if (!clientProfile.resume_uploaded) {
        setCurrentStep(2);
      } else if (!clientProfile.session_booked) {
        setCurrentStep(3);
      } else {
        setCurrentStep(5);
      }

    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrainingMaterials = async () => {
    try {
      const { data } = await supabase
        .from('training_materials')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      setTrainingMaterials(data || []);
    } catch (error) {
      console.error('Error fetching training materials:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/customer-auth');
  };

  const handleHelp = () => {
    const subject = `Help Request - ${profile?.name}`;
    const body = `Hi,\n\nI need help with my project.\n\nClient: ${profile?.name}\nEmail: ${profile?.email}\n\nPlease describe your issue:\n\n`;
    window.location.href = `mailto:support@resultsdrivenresumes.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleStepAction = (stepId: number) => {
    switch (stepId) {
      case 1:
        navigate(`/intake-form?clientId=${profile?.id}`);
        break;
      case 2:
        // TODO: Metrics worksheet
        toast({ title: "Coming Soon", description: "Metrics worksheet will be available soon." });
        break;
      case 3:
        setShowResumeUpload(true);
        break;
      case 4:
        // TODO: Additional documents upload
        toast({ title: "Coming Soon", description: "Document upload will be available soon." });
        break;
      case 5:
        // TODO: Notes textarea
        toast({ title: "Coming Soon", description: "Notes section will be available soon." });
        break;
      case 6:
        setShowCalendly(true);
        break;
    }
  };

  const handleSaveProfile = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: profileForm.first_name,
          last_name: profileForm.last_name,
          phone: profileForm.phone,
          job_title: profileForm.job_title,
          bio: profileForm.bio
        })
        .eq('id', user?.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, ...profileForm } : null);
      setEditingProfile(false);
      toast({ title: "Profile Updated", description: "Your changes have been saved." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save profile.", variant: "destructive" });
    }
  };

  // Build steps data - Onboarding Process
  const steps = [
    // Section 1: Send Us Your Documents
    {
      id: 1,
      title: "Client Worksheet",
      description: profile?.intake_form_submitted ? "Completed" : "About you",
      isCompleted: !!profile?.intake_form_submitted,
      isActive: currentStep === 1,
      isLocked: false
    },
    {
      id: 2,
      title: "Metrics Worksheet",
      description: "Your achievements",
      isCompleted: false,
      isActive: currentStep === 2,
      isLocked: false
    },
    {
      id: 3,
      title: "Resume(s)",
      description: profile?.resume_uploaded ? "Uploaded" : "Current resume",
      isCompleted: !!profile?.resume_uploaded,
      isActive: currentStep === 3,
      isLocked: false
    },
    {
      id: 4,
      title: "Other Documents",
      description: "Supporting files",
      isCompleted: false,
      isActive: currentStep === 4,
      isLocked: false
    },
    {
      id: 5,
      title: "Notes for Us",
      description: "Special requests",
      isCompleted: false,
      isActive: currentStep === 5,
      isLocked: false
    },
    // Section 2: Book Your Clarity Call
    {
      id: 6,
      title: "Schedule Clarity Call",
      description: profile?.session_booked ? "Booked" : "Book your call",
      isCompleted: !!profile?.session_booked,
      isActive: currentStep === 6,
      isLocked: false
    }
  ];

  const completedSteps = steps.filter(s => s.isCompleted).length;
  const overallProgress = (completedSteps / 6) * 100;

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-lg font-semibold mb-2">Account Not Linked</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Your account isn't linked to a client profile yet.
            </p>
            <Button onClick={handleSignOut}>Sign Out</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasDeadline = profile.estimated_delivery_date && (timeRemaining.days > 0 || timeRemaining.hours > 0 || timeRemaining.minutes > 0);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Countdown Timer Banner */}
      {hasDeadline && (
        <div className={`w-full py-3 px-4 text-center ${profile.is_rush ? 'bg-red-500' : 'bg-primary'} text-white`}>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="font-medium">
                {profile.is_rush ? 'RUSH Delivery' : 'Estimated Delivery'}:
              </span>
              <span>{format(new Date(profile.estimated_delivery_date!), 'MMM dd, yyyy')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div className="bg-white/20 rounded px-2 py-1">
                  <span className="font-mono font-bold">{String(timeRemaining.days).padStart(2, '0')}</span>
                  <span className="text-xs ml-1">d</span>
                </div>
                <div className="bg-white/20 rounded px-2 py-1">
                  <span className="font-mono font-bold">{String(timeRemaining.hours).padStart(2, '0')}</span>
                  <span className="text-xs ml-1">h</span>
                </div>
                <div className="bg-white/20 rounded px-2 py-1">
                  <span className="font-mono font-bold">{String(timeRemaining.minutes).padStart(2, '0')}</span>
                  <span className="text-xs ml-1">m</span>
                </div>
                <div className="bg-white/20 rounded px-2 py-1">
                  <span className="font-mono font-bold">{String(timeRemaining.seconds).padStart(2, '0')}</span>
                  <span className="text-xs ml-1">s</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex">
        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b flex items-center justify-between px-4 z-40" style={{ top: hasDeadline ? '52px' : '0' }}>
          <button onClick={() => setShowMobileSidebar(true)}>
            <Menu className="h-6 w-6" />
          </button>
          <span className="font-medium">{steps.find(s => s.id === currentStep)?.title || 'Portal'}</span>
          <div className="w-6" />
        </div>

        {/* Mobile Sidebar Overlay */}
        {showMobileSidebar && (
          <div className="lg:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowMobileSidebar(false)} />
            <div className="absolute left-0 top-0 h-full">
              <ClientProgressSidebar
                steps={steps}
                currentStep={currentStep}
                onStepSelect={(id) => { setCurrentStep(id); setShowMobileSidebar(false); }}
                clientName={profile.name}
                clientEmail={profile.email}
                avatarUrl={profile.avatar_url}
                serviceType={profile.service_type}
                overallProgress={overallProgress}
                onSignOut={handleSignOut}
                onHelp={handleHelp}
              />
              <button className="absolute top-4 right-4 p-2" onClick={() => setShowMobileSidebar(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <ClientProgressSidebar
            steps={steps}
            currentStep={currentStep}
            onStepSelect={setCurrentStep}
            clientName={profile.name}
            clientEmail={profile.email}
            avatarUrl={profile.avatar_url}
            serviceType={profile.service_type}
            overallProgress={overallProgress}
            onSignOut={handleSignOut}
            onHelp={handleHelp}
          />
        </div>

        {/* Main Content */}
        <main className="flex-1 pt-14 lg:pt-0" style={{ paddingTop: hasDeadline ? 'calc(52px + 56px)' : undefined }}>
          {/* Steps 1-6 Content */}
          {currentStep >= 1 && currentStep <= 6 && (
            <ClientStepContent
              stepId={currentStep}
              isCompleted={steps[currentStep - 1].isCompleted}
              isLocked={steps[currentStep - 1].isLocked}
              onAction={() => handleStepAction(currentStep)}
            >
              {currentStep === 3 && showResumeUpload && (
                <ResumeUpload
                  clientId={profile.id}
                  onUploadComplete={() => {
                    setShowResumeUpload(false);
                    fetchClientProfile();
                    toast({ title: "Resume Uploaded!", description: "Your resume has been uploaded successfully." });
                  }}
                />
              )}

              {currentStep === 6 && showCalendly && (
                <CalendlyEmbed
                  calendlyUrl="https://calendly.com/resultsdrivenresumes"
                  onBookingComplete={() => {
                    setShowCalendly(false);
                    fetchClientProfile();
                    toast({ title: "Call Booked!", description: "Your clarity call has been scheduled." });
                  }}
                  onClose={() => setShowCalendly(false)}
                />
              )}
            </ClientStepContent>
          )}

          {/* Messages (Step 7) */}
          {currentStep === 7 && (
            <div className="p-6">
              <MessagingCenter
                clientId={profile.id}
                clientName={profile.name}
                userRole="client"
                currentUserId={user?.id || ''}
              />
            </div>
          )}

          {/* Training Materials (Step 8) */}
          {currentStep === 8 && (
            <div className="p-6">
              <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    <BookOpen className="h-6 w-6 text-primary" />
                    Training Materials
                  </h1>
                  <p className="text-muted-foreground">
                    Resources to help you with your job search and career development.
                  </p>
                </div>

                {trainingMaterials.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Training Materials Yet</h3>
                      <p className="text-muted-foreground">Check back soon for helpful resources.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {trainingMaterials.map((material) => (
                      <Card key={material.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                        {material.thumbnail_url && (
                          <div className="aspect-video bg-muted">
                            <img 
                              src={material.thumbnail_url} 
                              alt={material.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              {material.type === 'VIDEO' ? (
                                <Play className="h-4 w-4 text-primary" />
                              ) : (
                                <FileText className="h-4 w-4 text-primary" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-sm mb-1 truncate">{material.name}</h3>
                              {material.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">{material.description}</p>
                              )}
                              <Badge variant="secondary" className="mt-2 text-xs">
                                {material.type}
                              </Badge>
                            </div>
                          </div>
                          {material.content_url && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full mt-3"
                              onClick={() => window.open(material.content_url, '_blank')}
                            >
                              <ExternalLink className="h-3 w-3 mr-2" />
                              View
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Profile (Step 9) */}
          {currentStep === 9 && (
            <div className="max-w-2xl mx-auto p-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    My Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex justify-center">
                    <AvatarUpload
                      currentAvatarUrl={profile.avatar_url}
                      onAvatarUpdate={(url) => setProfile(prev => prev ? { ...prev, avatar_url: url } : null)}
                      size="lg"
                      showUploadButton={true}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>First Name</Label>
                      <Input
                        value={profileForm.first_name}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, first_name: e.target.value }))}
                        disabled={!editingProfile}
                      />
                    </div>
                    <div>
                      <Label>Last Name</Label>
                      <Input
                        value={profileForm.last_name}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, last_name: e.target.value }))}
                        disabled={!editingProfile}
                      />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                        disabled={!editingProfile}
                      />
                    </div>
                    <div>
                      <Label>Job Title</Label>
                      <Input
                        value={profileForm.job_title}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, job_title: e.target.value }))}
                        disabled={!editingProfile}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Bio</Label>
                    <Textarea
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                      disabled={!editingProfile}
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2">
                    {editingProfile ? (
                      <>
                        <Button onClick={handleSaveProfile}>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </Button>
                        <Button variant="outline" onClick={() => setEditingProfile(false)}>
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button variant="outline" onClick={() => setEditingProfile(true)}>
                        Edit Profile
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* My New Resume Documents (Step 10) */}
          {currentStep === 10 && (
            <div className="p-6">
              <div className="max-w-4xl mx-auto">
                <ClientDocumentsChecklist />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
