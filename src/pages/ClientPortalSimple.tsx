import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ClientProgressSidebar } from "@/components/ClientProgressSidebar";
import { ClientStepContent } from "@/components/ClientStepContent";
import { ClientDeliveriesSimple } from "@/components/ClientDeliveriesSimple";
import { MessagingCenter } from "@/components/MessagingCenter";
import ResumeUpload from "@/components/ResumeUpload";
import CalendlyEmbed from "@/components/CalendlyEmbed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AvatarUpload from "@/components/AvatarUpload";
import { User, Save, Menu, X } from "lucide-react";

interface ClientProfile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  service_type: string;
  session_booked?: boolean;
  intake_form_submitted?: boolean;
  resume_uploaded?: boolean;
  first_name?: string;
  last_name?: string;
  phone?: string;
  job_title?: string;
  bio?: string;
}

export default function ClientPortalSimple() {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  
  // Step-specific UI states
  const [showIntakeForm, setShowIntakeForm] = useState(false);
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
    }
  }, [user, authLoading]);

  const fetchClientProfile = async () => {
    try {
      setLoading(true);
      
      const { data: clientData, error } = await supabase
        .from('clients')
        .select(`
          id, name, email, session_booked, intake_form_submitted, resume_uploaded,
          service_types(name)
        `)
        .eq('user_id', user?.id)
        .single();

      if (error || !clientData) {
        console.error('Error fetching client:', error);
        return;
      }

      // Get profile data
      const { data: profileData } = await supabase
        .from('profiles')
        .select('avatar_url, first_name, last_name, phone, job_title, bio')
        .eq('id', user?.id)
        .single();

      const profile: ClientProfile = {
        id: clientData.id,
        name: clientData.name,
        email: clientData.email,
        avatar_url: profileData?.avatar_url,
        service_type: (clientData as any).service_types?.name || 'Service Package',
        session_booked: clientData.session_booked,
        intake_form_submitted: clientData.intake_form_submitted,
        resume_uploaded: clientData.resume_uploaded,
        first_name: profileData?.first_name,
        last_name: profileData?.last_name,
        phone: profileData?.phone,
        job_title: profileData?.job_title,
        bio: profileData?.bio
      };

      setProfile(profile);
      setProfileForm({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        job_title: profile.job_title || '',
        bio: profile.bio || ''
      });

      // Determine initial step based on progress
      if (!profile.intake_form_submitted) {
        setCurrentStep(1);
      } else if (!profile.resume_uploaded) {
        setCurrentStep(2);
      } else if (!profile.session_booked) {
        setCurrentStep(3);
      } else {
        setCurrentStep(5); // Show deliveries by default once basics are done
      }

    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
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
        setShowResumeUpload(true);
        break;
      case 3:
        setShowCalendly(true);
        break;
      case 5:
        // Already showing deliveries
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

  // Build steps data
  const steps = [
    {
      id: 1,
      title: "Intake Form",
      description: profile?.intake_form_submitted ? "Completed" : "Tell us about you",
      isCompleted: !!profile?.intake_form_submitted,
      isActive: currentStep === 1,
      isLocked: false
    },
    {
      id: 2,
      title: "Upload Resume",
      description: profile?.resume_uploaded ? "Uploaded" : "Share your current resume",
      isCompleted: !!profile?.resume_uploaded,
      isActive: currentStep === 2,
      isLocked: false
    },
    {
      id: 3,
      title: "Book Session",
      description: profile?.session_booked ? "Scheduled" : "Schedule consultation",
      isCompleted: !!profile?.session_booked,
      isActive: currentStep === 3,
      isLocked: false
    },
    {
      id: 4,
      title: "In Progress",
      description: "We're working on it",
      isCompleted: false,
      isActive: currentStep === 4,
      isLocked: !profile?.intake_form_submitted || !profile?.resume_uploaded || !profile?.session_booked
    },
    {
      id: 5,
      title: "Your Documents",
      description: "Review & download",
      isCompleted: false,
      isActive: currentStep === 5,
      isLocked: false
    }
  ];

  const completedSteps = steps.filter(s => s.isCompleted).length;
  const overallProgress = (completedSteps / 5) * 100;

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

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b flex items-center justify-between px-4 z-40">
        <button onClick={() => setShowMobileSidebar(true)}>
          <Menu className="h-6 w-6" />
        </button>
        <span className="font-medium">{steps.find(s => s.id === currentStep)?.title}</span>
        <div className="w-6" /> {/* Spacer */}
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
            <button 
              className="absolute top-4 right-4 p-2"
              onClick={() => setShowMobileSidebar(false)}
            >
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
      <main className="flex-1 lg:pt-0 pt-14">
        {/* Steps 1-5 Content */}
        {currentStep >= 1 && currentStep <= 5 && (
          <ClientStepContent
            stepId={currentStep}
            isCompleted={steps[currentStep - 1].isCompleted}
            isLocked={steps[currentStep - 1].isLocked}
            onAction={() => handleStepAction(currentStep)}
          >
            {/* Step 2: Resume Upload */}
            {currentStep === 2 && showResumeUpload && (
              <ResumeUpload
                clientId={profile.id}
                onUploadComplete={() => {
                  setShowResumeUpload(false);
                  fetchClientProfile();
                  toast({ title: "Resume Uploaded!", description: "Your resume has been uploaded successfully." });
                }}
              />
            )}

            {/* Step 3: Calendly */}
            {currentStep === 3 && showCalendly && (
              <CalendlyEmbed
                calendlyUrl="https://calendly.com/resultsdrivenresumes"
                onBookingComplete={() => {
                  setShowCalendly(false);
                  fetchClientProfile();
                  toast({ title: "Session Booked!", description: "Your consultation has been scheduled." });
                }}
                onClose={() => setShowCalendly(false)}
              />
            )}

            {/* Step 5: Deliveries */}
            {currentStep === 5 && <ClientDeliveriesSimple />}
          </ClientStepContent>
        )}

        {/* Messages (Step 6) */}
        {currentStep === 6 && (
          <div className="p-6">
            <MessagingCenter
              clientId={profile.id}
              clientName={profile.name}
              userRole="client"
              currentUserId={user?.id || ''}
            />
          </div>
        )}

        {/* Profile (Step 7) */}
        {currentStep === 7 && (
          <div className="max-w-2xl mx-auto p-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  My Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar */}
                <div className="flex justify-center">
                  <AvatarUpload
                    currentAvatarUrl={profile.avatar_url}
                    onAvatarUpdate={(url) => setProfile(prev => prev ? { ...prev, avatar_url: url } : null)}
                    size="lg"
                    showUploadButton={true}
                  />
                </div>

                {/* Form */}
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
      </main>
    </div>
  );
}
