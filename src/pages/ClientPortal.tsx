import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  Package,
  ChevronDown
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import RDRLogo from "@/components/RDRLogo";
import AvatarUpload from "@/components/AvatarUpload";
import { ClientDeliveriesSimple } from "@/components/ClientDeliveriesSimple";
import { ClientNotificationBell } from "@/components/ClientNotificationBell";
import ResumeUpload from "@/components/ResumeUpload";
import { MessagingCenter } from '@/components/MessagingCenter';
import CalendlyEmbed from "@/components/CalendlyEmbed";

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
  session_booked?: boolean;
}

const PROGRESS_STEPS = [
  { id: 1, title: "Intake Form", description: "Complete your intake questionnaire", icon: FileText },
  { id: 2, title: "Upload Resume", description: "Upload your current resume", icon: Upload },
  { id: 3, title: "Book Session", description: "Schedule your consultation", icon: Calendar },
  { id: 4, title: "In Progress", description: "We're working on your documents", icon: Clock },
  { id: 5, title: "Review & Download", description: "View your package checklist and download completed documents", icon: Download }
];

export default function ClientPortal() {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [needsPhotoUpload, setNeedsPhotoUpload] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [documents, setDocuments] = useState<any[]>([]);
  const [trainingMaterials, setTrainingMaterials] = useState<any[]>([]);
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0 });
  const [showIntakeForm, setShowIntakeForm] = useState(false);
  const [showResumeUpload, setShowResumeUpload] = useState(false);
  const [showCalendlyBooking, setShowCalendlyBooking] = useState(false);
  const [activeTab, setActiveTab] = useState("deliveries");
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
      navigate('/customer/login');
    }
  }, [user, authLoading, navigate]);

  // Handle case where user is authenticated but has no client profile
  useEffect(() => {
    if (!authLoading && !loading && user && !profile) {
      console.log('ClientPortal: User authenticated but no client profile found, checking if admin...');
      checkIfUserIsAdmin();
    }
  }, [user, authLoading, loading, profile, navigate, location.pathname]);

  const checkIfUserIsAdmin = async () => {
    try {
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id)
        .maybeSingle();
      
    if (userRole?.role === 'admin') {
        if (location.pathname === '/portal') {
          console.log('ClientPortal: Admin accessed /portal; staying on client portal');
          return;
        }
        console.log('ClientPortal: User is admin, redirecting to admin dashboard');
        navigate('/admin');
      } else {
        if (location.pathname === '/portal') {
          console.log('ClientPortal: Non-admin without client profile on /portal; staying on client portal');
          return;
        }
        console.log('ClientPortal: User is not admin and has no client profile');
        // Only redirect to login if they're not an admin and we're not explicitly on /portal
        navigate('/customer/login');
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      if (location.pathname !== '/portal') {
        navigate('/customer/login');
      }
    }
  };

  useEffect(() => {
    if (user) {
      fetchClientProfile();
      fetchDocuments();
      fetchTrainingMaterials();
      loadSavedProgress();
    }
  }, [user]);

  // Load saved progress from localStorage and database
  const loadSavedProgress = async () => {
    try {
      // Load localStorage progress
      const saved = localStorage.getItem(`progress_${user?.id}`);
      if (saved) {
        const localProgress = JSON.parse(saved);
        console.log('Loaded local progress:', localProgress);
      }

      // Load saved intake form data if exists and we have a profile
      if (profile?.id && user?.id) {
        const { data: draftData } = await supabase
          .from('intake_form_drafts')
          .select('form_data')
          .eq('user_id', user.id)
          .eq('client_id', profile.id)
          .maybeSingle();

        if (draftData?.form_data) {
          setFormData(draftData.form_data as any);
          console.log('Loaded saved form data:', draftData.form_data);
        }
      }
    } catch (error) {
      console.error('Error loading saved progress:', error);
    }
  };

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

      // Check if user exists as a client (prefer user_id to satisfy RLS)
      const { data: clientDataByUserId } = await supabase
        .from('clients')
        .select(`
          *,
          service_types (name)
        `)
        .eq('user_id', user?.id)
        .maybeSingle();

      // Fallback: if not found, try matching by email (works for admins)
      const clientData = clientDataByUserId ?? (
        await supabase
          .from('clients')
          .select(`
            *,
            service_types (name)
          `)
          .eq('email', user?.email)
          .maybeSingle()
      ).data;

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
          bio: profileData?.bio,
          session_booked: clientData.session_booked || false
        });

        // Check if profile photo is needed
        if (!profileData?.avatar_url) {
          setNeedsPhotoUpload(true);
        }
        
        // Load saved progress after profile is set
        setTimeout(() => loadSavedProgress(), 100);
      } else {
        // If no client record exists and the user is an admin, only create a temporary view when explicitly on /portal
        const { data: userRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user?.id)
          .maybeSingle();

        if (userRole?.role === 'admin' && location.pathname === '/portal') {
          setProfile({
            id: user?.id || 'admin',
            name:
              profileData?.display_name ||
              [profileData?.first_name, profileData?.last_name].filter(Boolean).join(' ') ||
              (user?.email?.split('@')[0] || 'Admin User'),
            email: user?.email || '',
            avatar_url: profileData?.avatar_url,
            service_type: 'Admin Access',
            estimated_delivery_date: undefined,
            status: 'active',
            progress_step: 1,
            first_name: profileData?.first_name,
            last_name: profileData?.last_name,
            phone: profileData?.phone,
            location: profileData?.location,
            job_title: profileData?.job_title,
            industry: profileData?.industry,
            website: profileData?.website,
            bio: profileData?.bio,
            session_booked: false
          });
        }
      }
    } catch (error) {
      console.error('Error fetching client profile:', error);
    } finally {
      setLoading(false);
    }
  };


  const fetchDocuments = async () => {
    try {
      if (!user) return;

      // Find the current client's id
      const { data: clientRow } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!clientRow) {
        setDocuments([]);
        return;
      }

      // Fetch uploaded documents for this client
      const { data: uploadedDocs, error } = await supabase
        .from('document_uploads')
        .select('*')
        .eq('client_id', clientRow.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform uploaded documents to match UI format
      const transformedDocs = uploadedDocs?.map(doc => ({
        id: doc.id,
        name: doc.file_name,
        type: doc.document_type,
        status: 'completed', // Uploaded documents are completed
        icon: FileText,
        file_size: doc.file_size,
        created_at: doc.created_at,
        download_url: doc.file_path,
        bucket_name: doc.bucket_name
      })) || [];

      // Add standard project documents (these are placeholders for deliverables)
      const standardDocs = [
        {
          id: 'resume-deliverable',
          name: 'Professional Resume',
          type: 'resume',
          status: 'in_progress',
          icon: FileText
        },
        {
          id: 'cover-letter-deliverable',
          name: 'Cover Letter Template',
          type: 'cover_letter',
          status: 'pending',
          icon: FileText
        }
      ];

      // Combine uploaded docs with standard project docs
      setDocuments([...transformedDocs, ...standardDocs]);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setDocuments([]);
    }
  };

  const handleDocumentDownload = async (doc: any) => {
    try {
      if (!doc.download_url || !doc.bucket_name) {
        toast({
          title: "Download Error",
          description: "Document download information is missing.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Preparing Download",
        description: `Preparing ${doc.name} for download...`,
      });

      // Get signed URL for download
      const { data, error } = await supabase.storage
        .from(doc.bucket_name)
        .createSignedUrl(doc.download_url, 60); // 60 seconds expiry

      if (error) throw error;

      if (data?.signedUrl) {
        // Fetch the file as a blob to force download
        const response = await fetch(data.signedUrl);
        if (!response.ok) throw new Error('Failed to fetch file');
        
        const blob = await response.blob();
        
        // Create blob URL and trigger download
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = doc.name;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up blob URL
        URL.revokeObjectURL(blobUrl);

        toast({
          title: "Download Complete",
          description: `${doc.name} has been downloaded to your downloads folder.`,
        });
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: "Download Failed",
        description: "There was an error downloading the document. Please try again.",
        variant: "destructive",
      });
    }
  };

  const fetchTrainingMaterials = async () => {
    try {
      if (!user) return;

      // Find the current client's id and service type
      const { data: clientRow } = await supabase
        .from('clients')
        .select('id, service_type_id, service_types (id)')
        .eq('user_id', user.id)
        .maybeSingle();

      const clientId = clientRow?.id;
      const serviceTypeId = (clientRow as any)?.service_type_id || (clientRow as any)?.service_types?.id;

      if (!clientId || !serviceTypeId) {
        setTrainingMaterials([]);
        return;
      }

      // Fetch assignments by service and any manual client access in parallel
      const [serviceMap, manualAccess] = await Promise.all([
        supabase.from('service_training_materials').select('training_material_id').eq('service_type_id', serviceTypeId),
        supabase.from('client_training_access').select('training_material_id').eq('client_id', clientId),
      ]);

      const serviceIds = (serviceMap.data || []).map((r: any) => r.training_material_id);
      const manualIds = (manualAccess.data || []).map((r: any) => r.training_material_id);
      const materialIds = Array.from(new Set([...serviceIds, ...manualIds])).filter(Boolean);

      if (materialIds.length === 0) {
        setTrainingMaterials([]);
        return;
      }

      const { data: materials, error } = await supabase
        .from('training_materials')
        .select('*')
        .in('id', materialIds)
        .eq('is_active', true);

      if (error) throw error;
      setTrainingMaterials(materials || []);
    } catch (error) {
      console.error('Error fetching training materials:', error);
      setTrainingMaterials([]);
    }
  };

  const determineProgressStep = (clientData: any) => {
    // Check localStorage for saved progress
    const saved = localStorage.getItem(`progress_${user?.id}`);
    if (saved) {
      const localProgress = JSON.parse(saved);
      const completedSteps = Object.values(localProgress).filter(Boolean).length;
      return Math.min(completedSteps + 1, 5); // Max step 5
    }
    
    // Check database fields for completion
    let step = 1;
    if (clientData.intake_form_submitted) step = Math.max(step, 2);
    if (clientData.resume_uploaded) step = Math.max(step, 3);
    if (clientData.session_booked) step = Math.max(step, 4);
    
    console.log('Determined progress step for client:', step, clientData);
    return step;
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

  const handleIntakeFormClick = async () => {
    console.log('Opening intake form...');
    
    // Load existing data from drafts or history
    try {
      // First try to load from drafts
      const { data: draftData } = await supabase
        .from('intake_form_drafts')
        .select('form_data')
        .eq('user_id', user?.id)
        .eq('client_id', profile?.id)
        .maybeSingle();

      if (draftData?.form_data) {
        console.log('Found draft data:', draftData.form_data);
        setFormData(draftData.form_data as any);
      } else {
        // If no draft, try to load from history
        const { data: historyData } = await supabase
          .from('client_history')
          .select('metadata')
          .eq('client_id', profile?.id)
          .eq('action_type', 'intake_form_submitted')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (historyData?.metadata) {
          console.log('Found existing intake form data:', historyData.metadata);
          setFormData(historyData.metadata as any);
        }
      }
    } catch (error) {
      console.error('Error loading intake form data:', error);
    }
    
    setShowIntakeForm(true);
    toast({
      title: "Intake Form",
      description: "Opening your intake questionnaire...",
    });
  };

  const handleResumeUploadClick = () => {
    console.log('*** Opening resume upload modal ***');
    setShowResumeUpload(true);
    
    // Show appropriate toast based on whether documents already exist
    const hasUploaded = profile?.progress_step && profile.progress_step > 2;
    toast({
      title: hasUploaded ? "Add More Documents" : "Resume Upload",
      description: hasUploaded ? "Upload additional documents to your project." : "Upload your resume and supporting documents.",
    });
  };

  const handleMenuItemClick = (tab: string) => {
    setActiveTab(tab);
  };

  const handleSessionBookingClick = () => {
    console.log('Opening session booking...');
    setShowCalendlyBooking(true);
  };

  const handleStepClick = (stepId: number) => {
    console.log('*** Step clicked in ClientPortal:', stepId);
    switch (stepId) {
      case 1:
        handleIntakeFormClick();
        break;
      case 2:
        handleResumeUploadClick();
        break;
      case 3:
        handleSessionBookingClick();
        break;
      case 5:
        // Navigate to deliveries tab to see package checklist
        setActiveTab('deliveries');
        toast({
          title: "Your Package Deliverables",
          description: "View your package checklist and download completed documents.",
        });
        break;
      default:
        console.log('No handler for step:', stepId);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const newFormData = {
      ...formData,
      [name]: value
    };
    setFormData(newFormData);
    
    // Auto-save draft to database
    saveDraft(newFormData);
  };

  const saveDraft = async (data: any) => {
    if (!user?.id || !profile?.id) return;
    
    try {
      await supabase
        .from('intake_form_drafts')
        .upsert({
          user_id: user.id,
          client_id: profile.id,
          form_data: data
        });
      console.log('Draft saved:', data);
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile?.id) {
      toast({
        title: "Error",
        description: "No client profile found.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Insert into client_history table (for updates, this creates a new history entry)
      const historyData = {
        client_id: profile.id,
        action_type: 'intake_form_submitted',
        description: profile.progress_step > 1 ? 'Client updated intake form with career details' : 'Client submitted intake form with career details',
        metadata: formData,
        created_by: user?.id
      };

      console.log('Submitting intake form data:', historyData);

      const { data: historyResult, error: historyError } = await supabase
        .from('client_history')
        .insert(historyData)
        .select();

      if (historyError) {
        console.error('Error inserting client history:', historyError);
        console.error('Error details:', {
          code: historyError.code,
          message: historyError.message,
          details: historyError.details,
          hint: historyError.hint
        });
        throw historyError;
      }

      console.log('Successfully inserted client history:', historyResult);

      // Update client record to mark intake form as submitted
      const { error: clientError } = await supabase
        .from('clients')
        .update({ 
          intake_form_submitted: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (clientError) {
        console.error('Error updating client:', clientError);
        throw clientError;
      }

      // Update localStorage progress
      const saved = localStorage.getItem(`progress_${user?.id}`) || '{}';
      const localProgress = JSON.parse(saved);
      localProgress[1] = true; // Mark step 1 as completed
      localStorage.setItem(`progress_${user?.id}`, JSON.stringify(localProgress));

      // Delete the draft after successful submission
      await supabase
        .from('intake_form_drafts')
        .delete()
        .eq('client_id', profile.id)
        .eq('user_id', user.id);


      // Update profile to reflect the change
      setProfile(prev => prev ? { ...prev, progress_step: Math.max(prev.progress_step, 2) } : null);

      toast({
        title: profile.progress_step > 1 ? "Form Updated!" : "Form Submitted!",
        description: profile.progress_step > 1 ? "Your intake form has been updated successfully." : "Your intake form has been submitted successfully. We'll review your information and get back to you soon.",
      });

      // Reset form and close
      setFormData({
        currentJobTitle: '',
        targetJobTitle: '',
        industry: '',
        experience: '',
        careerGoals: '',
        challenges: '',
        additionalInfo: ''
      });
      setShowIntakeForm(false);

    } catch (error) {
      console.error('Error submitting intake form:', error);
      toast({
        title: "Error",
        description: "Failed to submit form. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile || !user) return;
    
    try {
      setLoading(true);
      
      // Update the profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: profile.email,
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone,
          location: profile.location,
          job_title: profile.job_title,
          industry: profile.industry,
          website: profile.website,
          bio: profile.bio,
          updated_at: new Date().toISOString(),
        });

      if (profileError) throw profileError;

      // Update the clients table 
      const { error: clientError } = await supabase
        .from('clients')
        .update({
          name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.name,
          email: profile.email,
          phone: profile.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (clientError) throw clientError;

      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved successfully.",
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to save profile changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCall = () => {
    const subject = `Call Request - ${profile?.name}`;
    const body = `Hi,\n\nI would like to schedule a call to discuss my project.\n\nClient: ${profile?.name}\nEmail: ${profile?.email}\nService: ${profile?.service_type}\n\nPlease let me know your availability.\n\nThank you!`;
    window.location.href = `mailto:support@resultsdrivenresumes.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };


  // Download PDF function
  const downloadPDF = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Download Started",
        description: `${fileName} is being downloaded.`
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Unable to download the file. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <span className="text-lg font-medium text-slate-700">Loading your portal...</span>
        </div>
      </div>
    );
  }

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
            <h2 className="text-xl font-bold mb-2 text-slate-800">Account Not Linked</h2>
            <p className="text-slate-600 mb-6">
              Your account isn't linked to a client profile yet. Please sign out and sign in again, or contact support if this issue persists.
            </p>
            <div className="space-y-3">
              <Button 
                onClick={async () => {
                  await signOut();
                  navigate('/customer/login');
                }} 
                className="w-full"
              >
                Sign Out & Try Again
              </Button>
              <Button 
                onClick={() => window.location.href = 'mailto:support@resultsdrivenresumes.com'} 
                variant="outline"
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

  // If showing intake form, render it full width
  if (showIntakeForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-6xl mx-auto">
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center pb-6">
              <div className="mb-6">
                <RDRLogo />
              </div>
              <CardTitle className="text-3xl font-bold text-slate-800 mb-2">
                {profile && profile.progress_step > 1 ? 'Update Your' : ''}
                Career Development Intake Form
              </CardTitle>
              <p className="text-slate-600 text-lg">
                {profile && profile.progress_step > 1 
                  ? 'Update your career information and goals' 
                  : 'Help us understand your career goals and current situation'
                }
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="currentJobTitle" className="text-sm font-medium text-slate-700">
                      Current Job Title
                    </Label>
                    <Input
                      id="currentJobTitle"
                      name="currentJobTitle"
                      value={formData.currentJobTitle}
                      onChange={handleInputChange}
                      placeholder="e.g., Software Engineer"
                      className="h-12"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="targetJobTitle" className="text-sm font-medium text-slate-700">
                      Target Job Title
                    </Label>
                    <Input
                      id="targetJobTitle"
                      name="targetJobTitle"
                      value={formData.targetJobTitle}
                      onChange={handleInputChange}
                      placeholder="e.g., Senior Software Engineer"
                      className="h-12"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="industry" className="text-sm font-medium text-slate-700">
                      Industry
                    </Label>
                    <Input
                      id="industry"
                      name="industry"
                      value={formData.industry}
                      onChange={handleInputChange}
                      placeholder="e.g., Technology, Healthcare"
                      className="h-12"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="experience" className="text-sm font-medium text-slate-700">
                      Years of Experience
                    </Label>
                    <Input
                      id="experience"
                      name="experience"
                      value={formData.experience}
                      onChange={handleInputChange}
                      placeholder="e.g., 5 years"
                      className="h-12"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="careerGoals" className="text-sm font-medium text-slate-700">
                      Career Goals
                    </Label>
                    <Textarea
                      id="careerGoals"
                      name="careerGoals"
                      value={formData.careerGoals}
                      onChange={handleInputChange}
                      placeholder="Describe your short-term and long-term career objectives..."
                      className="min-h-32 resize-none"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="challenges" className="text-sm font-medium text-slate-700">
                      Current Challenges
                    </Label>
                    <Textarea
                      id="challenges"
                      name="challenges"
                      value={formData.challenges}
                      onChange={handleInputChange}
                      placeholder="What challenges are you facing in your job search or career progression?"
                      className="min-h-32 resize-none"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="additionalInfo" className="text-sm font-medium text-slate-700">
                    Additional Information
                  </Label>
                  <Textarea
                    id="additionalInfo"
                    name="additionalInfo"
                    value={formData.additionalInfo}
                    onChange={handleInputChange}
                    placeholder="Any additional information you'd like us to know about your background, achievements, or specific requirements..."
                    className="min-h-24 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-4 pt-6 border-t border-slate-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowIntakeForm(false)}
                    className="px-8 py-3 text-base"
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-3 text-base bg-primary hover:bg-primary/90"
                  >
                    {loading ? (profile && profile.progress_step > 1 ? "Updating..." : "Submitting...") : (profile && profile.progress_step > 1 ? "Update Form" : "Submit Form")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <RDRLogo />
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Client Dashboard</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ClientNotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors">
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
                    </div>
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white border shadow-lg z-50">
                  <DropdownMenuItem onClick={() => handleMenuItemClick("profile")} className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleMenuItemClick("help")} className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4" />
                    Help
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleMenuItemClick("training")} className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Training
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleMenuItemClick("action-items")} className="flex items-center gap-2">
                    <ListTodo className="h-4 w-4" />
                    Action Items
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleMenuItemClick("documents")} className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    My Uploaded Documents
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleMenuItemClick("deliveries")} className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Completed Document Deliveries
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={async () => {
                      await signOut();
                      toast({
                        title: "Logged out successfully",
                        description: "You have been signed out of your account."
                      });
                      window.location.href = "/login";
                    }}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
              Your Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">Overall Progress</span>
                  <span className="text-primary font-semibold">{Math.round(getProgressPercentage())}% Complete</span>
                </div>
                <Progress value={getProgressPercentage()} className="h-3" />
              </div>
              
              <div className="grid gap-4">
                {PROGRESS_STEPS.map((step, index) => {
                  const isCompleted = profile.progress_step > step.id;
                  const isCurrent = profile.progress_step === step.id;
                  const IconComponent = step.icon;
                  // Step 4 is locked until session is booked (using actual database value, not localStorage)
                  const isStep4Locked = step.id === 4 && profile.session_booked !== true;
                  // Make intake form and resume upload always clickable, others only when current
                  const isClickable = !isStep4Locked && (step.id === 1 || step.id === 2 || step.id === 3 || (step.id === profile.progress_step && !isCompleted));
                  
                  console.log(`Step ${step.id}: session_booked=${profile.session_booked}, isStep4Locked=${isStep4Locked}`);
                  
                  return (
                    <div 
                      key={step.id} 
                      className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                        isCompleted ? 'bg-green-50 border-green-200' :
                        isStep4Locked ? 'bg-slate-100 border-slate-200 opacity-60' :
                        isCurrent ? 'bg-primary/5 border-primary/20' :
                        'bg-slate-50 border-slate-200'
                      } ${isClickable ? 'cursor-pointer hover:shadow-md hover:border-primary/40' : ''}`}
                      onClick={() => isClickable && handleStepClick(step.id)}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isCompleted ? 'bg-green-500 text-white' :
                        isStep4Locked ? 'bg-slate-400 text-white' :
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
                        <p className="text-sm text-slate-600">
                          {isStep4Locked 
                            ? "Complete your consultation first - we'll start after your session" 
                            : step.description}
                        </p>
                      </div>
                      {isCompleted && (
                        <Badge variant="default" className="bg-green-500">
                          Complete
                        </Badge>
                      )}
                      {isStep4Locked && (
                        <Badge variant="secondary" className="bg-slate-300 text-slate-600">
                          Waiting for Session
                        </Badge>
                      )}
                      {isCurrent && !isStep4Locked && (
                        <Badge variant="default">
                          In Progress
                        </Badge>
                      )}
                      {/* Show button for steps 1, 2, 3, 5 - but different labels based on completion */}
                      {(step.id === 1 || step.id === 2 || step.id === 3 || step.id === 5) && !isStep4Locked && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStepClick(step.id);
                          }}
                        >
                          {step.id === 1 && isCompleted ? 'Update' : 
                           step.id === 2 && isCompleted ? 'Add More' : 
                           step.id === 3 && isCompleted ? 'Rebook' : 
                           step.id === 5 ? 'View Checklist' : 'Start'} →
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 bg-white shadow-sm border">
            <TabsTrigger value="deliveries" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Deliveries
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              My Uploaded Documents
            </TabsTrigger>
            <TabsTrigger value="training" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Training
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Messages
            </TabsTrigger>
          </TabsList>


          {/* Deliveries Tab */}
          <TabsContent value="deliveries">
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  Your Deliveries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ClientDeliveriesSimple />
              </CardContent>
            </Card>
          </TabsContent>

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
                          {doc.status === 'completed' && doc.download_url && (
                            <Button 
                              className="w-full mt-4" 
                              variant="outline"
                              onClick={() => handleDocumentDownload(doc)}
                            >
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {trainingMaterials.length > 0 ? trainingMaterials.map((material) => (
                    <Card key={material.id} className="border border-slate-200 hover:shadow-lg transition-shadow overflow-hidden">
                      <div className="relative bg-white">
                        {material.thumbnail_url ? (
                          <img 
                            src={material.thumbnail_url} 
                            alt={material.name} 
                            className="w-full h-auto object-contain"
                            style={{ maxHeight: '400px' }}
                          />
                        ) : (
                          <div className="w-full h-64 bg-slate-100 flex items-center justify-center">
                            <FileText className="w-16 h-16 text-slate-400" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h3 className="text-lg font-bold mb-2 text-center">{material.name}</h3>
                        <p className="text-sm text-slate-600 mb-4 text-center">{material.description}</p>
                        <div className="flex flex-col gap-2">
                          <Button size="lg" className="w-full" asChild>
                            <a href={material.content_url} target="_blank" rel="noopener noreferrer">
                              <BookOpen className="w-5 h-5 mr-2" />
                              Start Reading
                            </a>
                          </Button>
                          <Button 
                            size="lg" 
                            variant="secondary" 
                            className="w-full"
                            onClick={() => downloadPDF(material.content_url, material.name)}
                          >
                            <Download className="w-5 h-5 mr-2" />
                            Download
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )) : (
                    <div className="col-span-full text-center py-12">
                      <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500 text-lg">No training materials available yet.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            {user && profile && (
              <MessagingCenter
                clientId={profile.id}
                clientName={profile.name}
                userRole="client"
                currentUserId={user.id}
              />
            )}
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
                {/* Profile Photo Section - Centered at top */}
                <div className="text-center mb-8">
                  <div className="inline-block">
                    <AvatarUpload 
                      currentAvatarUrl={profile.avatar_url}
                      onAvatarUpdate={(url) => {
                        setProfile(prev => prev ? { ...prev, avatar_url: url } : null);
                      }}
                      size="lg"
                      showUploadButton={true}
                    />
                  </div>
                  <div className="mt-4">
                    <h3 className="text-xl font-semibold">{profile.name}</h3>
                    <p className="text-slate-600">{profile.email}</p>
                  </div>
                </div>

                {/* Profile Information Form */}
                <div className="max-w-2xl mx-auto">
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Edit className="w-5 h-5" />
                      Personal Information
                    </h4>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={profile.first_name || ''}
                          onChange={(e) => setProfile(prev => prev ? { ...prev, first_name: e.target.value } : null)}
                          placeholder="Enter your first name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={profile.last_name || ''}
                          onChange={(e) => setProfile(prev => prev ? { ...prev, last_name: e.target.value } : null)}
                          placeholder="Enter your last name"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profile.email || ''}
                        onChange={(e) => setProfile(prev => prev ? { ...prev, email: e.target.value } : null)}
                        placeholder="Enter your email"
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={profile.phone || ''}
                        onChange={(e) => setProfile(prev => prev ? { ...prev, phone: e.target.value } : null)}
                        placeholder="Enter your phone number"
                      />
                    </div>

                    <div>
                      <Label htmlFor="location">Address/Location</Label>
                      <Input
                        id="location"
                        value={profile.location || ''}
                        onChange={(e) => setProfile(prev => prev ? { ...prev, location: e.target.value } : null)}
                        placeholder="Enter your address or location"
                      />
                    </div>

                    <div>
                      <Label htmlFor="jobTitle">Job Title</Label>
                      <Input
                        id="jobTitle"
                        value={profile.job_title || ''}
                        onChange={(e) => setProfile(prev => prev ? { ...prev, job_title: e.target.value } : null)}
                        placeholder="Enter your job title"
                      />
                    </div>

                    <div>
                      <Label htmlFor="industry">Industry</Label>
                      <Input
                        id="industry"
                        value={profile.industry || ''}
                        onChange={(e) => setProfile(prev => prev ? { ...prev, industry: e.target.value } : null)}
                        placeholder="Enter your industry"
                      />
                    </div>

                    <div>
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        type="url"
                        value={profile.website || ''}
                        onChange={(e) => setProfile(prev => prev ? { ...prev, website: e.target.value } : null)}
                        placeholder="Enter your website URL"
                      />
                    </div>

                    <div>
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={profile.bio || ''}
                        onChange={(e) => setProfile(prev => prev ? { ...prev, bio: e.target.value } : null)}
                        placeholder="Tell us about yourself"
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-3 pt-6">
                      <Button 
                        onClick={handleSaveProfile} 
                        className="flex-1"
                        disabled={!profile || loading}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {loading ? "Saving..." : "Save Changes"}
                      </Button>
                      <Button 
                        onClick={handleRequestCall} 
                        variant="outline"
                        className="flex-1"
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        Request a Call
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Service Information */}
                <div className="mt-12 max-w-2xl mx-auto">
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Service Information
                    </h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Service Package</label>
                      <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
                        <p className="font-semibold text-primary">{profile.service_type}</p>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Project Status</label>
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <Badge variant={profile.status === 'active' ? 'default' : 'secondary'}>
                          {profile.status}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Estimated Delivery</label>
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4" />
                          {profile.estimated_delivery_date ? 
                            new Date(profile.estimated_delivery_date).toLocaleDateString() : 
                            'To be determined'
                          }
                        </p>
                      </div>
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

        {/* Your Deliveries Section */}

        {/* Floating Help Button */}
        <div className="fixed bottom-6 right-6">
          <Button size="lg" className="rounded-full shadow-lg h-14 w-14" onClick={handleRequestCall}>
            <Phone className="w-6 h-6" />
          </Button>
        </div>
      </main>

      {/* Resume Upload Modal */}
      {showResumeUpload && profile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <ResumeUpload
              clientId={profile.id}
              onUploadComplete={async () => {
                setShowResumeUpload(false);
                
                // Update localStorage progress to mark step 2 as completed
                const saved = localStorage.getItem(`progress_${user?.id}`) || '{}';
                const localProgress = JSON.parse(saved);
                localProgress[2] = true; // Mark step 2 (resume upload) as completed
                localStorage.setItem(`progress_${user?.id}`, JSON.stringify(localProgress));
                
                // Refetch profile and documents to get updated data
                await fetchClientProfile();
                await fetchDocuments();
                toast({
                  title: "Documents Uploaded!",
                  description: "Your resume and documents have been uploaded successfully.",
                });
              }}
              onClose={() => setShowResumeUpload(false)}
            />
          </div>
        </div>
      )}

      {/* Calendly Booking Modal */}
      {showCalendlyBooking && (
        <div className="fixed inset-0 bg-background z-50 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b bg-background">
            <h2 className="text-xl font-semibold">Schedule Your Consultation</h2>
            <div className="flex items-center gap-3">
              <Button 
                variant="default"
                onClick={async () => {
                  setShowCalendlyBooking(false);
                  
                  // Update localStorage progress to mark step 3 as completed
                  const saved = localStorage.getItem(`progress_${user?.id}`) || '{}';
                  const localProgress = JSON.parse(saved);
                  localProgress[3] = true;
                  localStorage.setItem(`progress_${user?.id}`, JSON.stringify(localProgress));
                  
                  // Update database
                  if (profile?.id) {
                    await supabase
                      .from('clients')
                      .update({ session_booked: true, updated_at: new Date().toISOString() })
                      .eq('id', profile.id);
                  }
                  
                  await fetchClientProfile();
                  toast({
                    title: "Session Booked!",
                    description: "Your consultation has been scheduled successfully.",
                  });
                }}
              >
                I've Booked My Session
              </Button>
              <Button variant="outline" onClick={() => setShowCalendlyBooking(false)}>
                Back to Dashboard
              </Button>
            </div>
          </div>
          <div className="flex-1">
            <iframe
              src="https://calendly.com/resultsdrivenresumes/resume-clarity-research-review-interview-session"
              width="100%"
              height="100%"
              frameBorder="0"
              title="Schedule Consultation"
            />
          </div>
        </div>
      )}
    </div>
  );
}