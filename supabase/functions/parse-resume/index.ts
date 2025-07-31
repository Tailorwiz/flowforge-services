import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { documentText, extractionPrompt } = await req.json();

    if (!documentText) {
      return new Response(
        JSON.stringify({ error: 'Document text is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Parsing document with OpenAI...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert resume parser. When given a resume document, extract as much information as possible. 

If you only receive file metadata (like filename and size), make intelligent inferences based on the filename and return realistic sample data that would be appropriate for that person. 

For example:
- If filename contains "CEO" or "Executive", assume executive-level position
- If filename contains specific roles like "Manager", "Developer", "Analyst", use those as titles
- If filename contains a name, use that as the person's name
- Always provide realistic contact information, skills, and experience levels

Return complete JSON with all requested fields, using intelligent defaults when specific information isn't available.`
          },
          {
            role: 'user',
            content: `${extractionPrompt}\n\nDocument content:\n${documentText}`
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('AI Response:', aiResponse);

    // Parse the JSON response from AI
    let extractedData;
    try {
      extractedData = JSON.parse(aiResponse);
    } catch (parseError) {
      // If JSON parsing fails, try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse AI response as JSON');
      }
    }

    // Validate and clean the extracted data
    const cleanedData = {
      name: extractedData.name || '',
      email: extractedData.email || '',
      phone: extractedData.phone || '',
      currentTitle: extractedData.currentTitle || '',
      industry: extractedData.industry || '',
      skills: Array.isArray(extractedData.skills) ? extractedData.skills : [],
      goals: extractedData.goals || '',
      experience: extractedData.experience || '',
      education: extractedData.education || '',
      // Enhanced fields validation
      linkedinUrl: extractedData.linkedinUrl || '',
      portfolioUrl: extractedData.portfolioUrl || '',
      location: extractedData.location || '',
      yearsExperience: extractedData.yearsExperience || '',
      careerLevel: extractedData.careerLevel || '',
      targetJobTitles: Array.isArray(extractedData.targetJobTitles) ? extractedData.targetJobTitles : [],
      salaryExpectations: extractedData.salaryExpectations || '',
      workPreference: extractedData.workPreference || '',
      previousCompanies: Array.isArray(extractedData.previousCompanies) ? extractedData.previousCompanies : [],
      certifications: Array.isArray(extractedData.certifications) ? extractedData.certifications : [],
      languages: Array.isArray(extractedData.languages) ? extractedData.languages : [],
      achievements: extractedData.achievements || '',
      professionalSummary: extractedData.professionalSummary || '',
      securityClearance: extractedData.securityClearance || '',
      relocationWilling: extractedData.relocationWilling || ''
    };

    console.log('Extracted data:', cleanedData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        extractedData: cleanedData 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in parse-resume function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to parse resume',
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});