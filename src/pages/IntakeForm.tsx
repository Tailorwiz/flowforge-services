import React, { useState, useEffect } from 'react';
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Submitting intake form with data:', formData);
      console.log('Client ID:', clientId);
      console.log('User ID:', user?.id);
      console.log('User object:', user);

      // First verify we can read the client data
      console.log('Verifying client access...');
      const { data: clientCheck, error: clientCheckError } = await supabase
        .from('clients')
        .select('id, user_id, name')
        .eq('id', clientId)
        .single();
      
      if (clientCheckError) {
        console.error('Cannot access client:', clientCheckError);
        throw new Error(`Cannot access client: ${clientCheckError.message}`);
      }
      console.log('Client data:', clientCheck);

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
            <CardTitle>Tell us about yourself</CardTitle>
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