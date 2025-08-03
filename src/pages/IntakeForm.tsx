import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import RDRLogo from '@/components/RDRLogo';
import { Save, Clock } from 'lucide-react';

export default function IntakeForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get('client');
  
  const [formData, setFormData] = useState({
    currentJobTitle: '',
    targetJobTitle: '',
    industry: '',
    experience: '',
    careerGoals: '',
    challenges: '',
    additionalInfo: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveCountRef = useRef(0);

  // Load saved draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      if (!user?.id || !clientId) return;
      
      try {
        const { data, error } = await (supabase as any)
          .from('intake_form_drafts')
          .select('form_data, updated_at')
          .eq('client_id', clientId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error loading draft:', error);
          return;
        }

        if (data) {
          setFormData(data.form_data);
          setLastSaved(new Date(data.updated_at));
          toast({
            title: "Draft Loaded",
            description: "Your previously saved progress has been restored.",
          });
        }
      } catch (error) {
        console.error('Error loading draft:', error);
      }
    };

    loadDraft();
  }, [user?.id, clientId]);

  // Auto-save functionality
  const saveDraft = useCallback(async (data: typeof formData, showToast = false) => {
    if (!user?.id || !clientId || saving) return;

    try {
      setSaving(true);
      saveCountRef.current += 1;
      const currentSaveCount = saveCountRef.current;

      const { error } = await (supabase as any).rpc('save_intake_draft', {
        p_client_id: clientId,
        p_user_id: user.id,
        p_form_data: data
      });

      // Only update UI if this is the most recent save attempt
      if (currentSaveCount === saveCountRef.current) {
        if (error) {
          console.error('Error saving draft:', error);
          if (showToast) {
            toast({
              title: "Save Failed",
              description: "Failed to save your progress. Please try again.",
              variant: "destructive",
            });
          }
        } else {
          setLastSaved(new Date());
          setIsDirty(false);
          if (showToast) {
            toast({
              title: "Progress Saved",
              description: "Your form progress has been saved.",
            });
          }
        }
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      if (showToast) {
        toast({
          title: "Save Failed",
          description: "Failed to save your progress. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setSaving(false);
    }
  }, [user?.id, clientId, saving]);

  // Auto-save timer setup
  useEffect(() => {
    if (isDirty && !saving) {
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      // Set new timeout for 5 seconds
      autoSaveTimeoutRef.current = setTimeout(() => {
        saveDraft(formData);
      }, 5000);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [formData, isDirty, saving, saveDraft]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleManualSave = () => {
    saveDraft(formData, true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

     try {
      console.log('=== INTAKE FORM SUBMISSION DEBUG ===');
      console.log('Form data:', formData);
      console.log('Client ID from URL:', clientId);
      console.log('Client ID type:', typeof clientId);
      console.log('User from auth:', user);
      console.log('User ID:', user?.id);
      console.log('User email:', user?.email);

      if (!clientId) {
        throw new Error('No client ID provided in URL');
      }

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Check current auth session
      const { data: session, error: sessionError } = await supabase.auth.getSession();
      console.log('Current session:', session);
      console.log('Session error:', sessionError);

      // First verify we can read the client data
      console.log('=== TESTING CLIENT ACCESS ===');
      
      // Try to find ANY client first to see if RLS is the issue
      console.log('Testing: Can we see any clients?');
      const { data: allClients, error: allClientsError } = await supabase
        .from('clients')
        .select('id, user_id, name, email')
        .limit(5);
      
      console.log('All accessible clients:', allClients);
      console.log('All clients error:', allClientsError);
      
      // Now try to find the specific client
      console.log('Testing: Can we see the specific client?');
      const { data: clientCheck, error: clientCheckError } = await supabase
        .from('clients')
        .select('id, user_id, name, email')
        .eq('id', clientId)
        .maybeSingle();
      
      console.log('Specific client query result:', clientCheck);
      console.log('Specific client query error:', clientCheckError);
      
      if (clientCheckError) {
        console.error('Cannot access client:', clientCheckError);
        throw new Error(`Cannot access client: ${clientCheckError.message}`);
      }
      
      if (!clientCheck) {
        console.error('Client not found with ID:', clientId);
        console.error('This might be an RLS policy issue');
        throw new Error('Client not found. Please check the URL and try again.');
      }
      
      console.log('SUCCESS: Found client:', clientCheck);

      // Save intake form data to client history
      console.log('Inserting into client_history...');
      
      // Ensure metadata is properly formatted JSON
      const metadata = JSON.parse(JSON.stringify(formData));
      console.log('Metadata to insert:', metadata);
      console.log('Metadata type:', typeof metadata);
      
      const insertData = {
        client_id: clientId,
        action_type: 'intake_form_completed',
        description: 'Client completed intake questionnaire',
        metadata: metadata,
        created_by: user?.id
      };
      
      console.log('Full insert data:', insertData);
      console.log('Client ID:', clientId, 'Type:', typeof clientId);
      console.log('User ID:', user?.id, 'Type:', typeof user?.id);
      
      const { data: historyData, error: historyError } = await supabase
        .from('client_history')
        .insert(insertData)
        .select();

      if (historyError) {
        console.error('History insert error:', historyError);
        console.error('Error details:', JSON.stringify(historyError, null, 2));
        throw historyError;
      }
      console.log('History inserted successfully:', historyData);

      // Update client progress
      console.log('Updating client progress...');
      const { data: updateData, error: updateError } = await supabase
        .from('clients')
        .update({ 
          intake_form_submitted: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', clientId)
        .select();

      if (updateError) {
        console.error('Client update error:', updateError);
        throw updateError;
      }
      console.log('Client updated successfully:', updateData);

      toast({
        title: "Intake Form Submitted!",
        description: "Thank you for completing your intake questionnaire. We'll review your information and get started on your project.",
      });

      // Delete the draft after successful submission
      try {
        await (supabase as any)
          .from('intake_form_drafts')
          .delete()
          .eq('client_id', clientId)
          .eq('user_id', user.id);
      } catch (error) {
        console.error('Error deleting draft:', error);
      }

      // Close the popup window and refresh parent
      if (window.opener) {
        window.opener.location.reload();
        window.close();
      } else {
        navigate('/portal');
      }
    } catch (error: any) {
      console.error('Error submitting intake form:', error);
      toast({
        title: "Error",
        description: `Failed to submit intake form: ${error.message || 'Please try again.'}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <RDRLogo />
          <h1 className="text-3xl font-bold text-slate-800 mt-4">Client Intake Questionnaire</h1>
          <p className="text-slate-600 mt-2">Help us understand your career goals and create the perfect resume for you</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Tell us about yourself</span>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {saving && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </div>
                )}
                {lastSaved && !saving && (
                  <div className="flex items-center gap-1">
                    <Save className="h-4 w-4" />
                    <span>
                      Saved {lastSaved.toLocaleTimeString()}
                    </span>
                  </div>
                )}
                {isDirty && !saving && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleManualSave}
                    className="h-7 px-2 text-xs"
                  >
                    <Save className="h-3 w-3 mr-1" />
                    Save Progress
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="currentJobTitle">Current Job Title</Label>
                  <Input
                    id="currentJobTitle"
                    value={formData.currentJobTitle}
                    onChange={(e) => handleInputChange('currentJobTitle', e.target.value)}
                    placeholder="e.g., Senior Software Engineer"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="targetJobTitle">Target Job Title</Label>
                  <Input
                    id="targetJobTitle"
                    value={formData.targetJobTitle}
                    onChange={(e) => handleInputChange('targetJobTitle', e.target.value)}
                    placeholder="e.g., Lead Software Engineer"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    placeholder="e.g., 5-7 years"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="careerGoals">Career Goals</Label>
                <Textarea
                  id="careerGoals"
                  value={formData.careerGoals}
                  onChange={(e) => handleInputChange('careerGoals', e.target.value)}
                  placeholder="What are your short-term and long-term career goals?"
                  rows={4}
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
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="additionalInfo">Additional Information</Label>
                <Textarea
                  id="additionalInfo"
                  value={formData.additionalInfo}
                  onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
                  placeholder="Any additional information you'd like us to know?"
                  rows={3}
                />
              </div>

              <div className="flex gap-4">
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Submitting...' : 'Submit Intake Form'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => window.close()}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}