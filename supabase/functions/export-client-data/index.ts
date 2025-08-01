import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ClientExportData {
  client: any;
  intakeForm: any;
  history: any[];
  documents: any[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Verify the user is authenticated and is an admin
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if user is admin
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!userRole || userRole.role !== 'admin') {
      throw new Error('Admin access required')
    }

    const url = new URL(req.url)
    const format = url.searchParams.get('format') || 'json'
    const clientId = url.searchParams.get('clientId')

    console.log('Exporting client data, format:', format, 'clientId:', clientId)

    // Fetch all clients or specific client
    let clientsQuery = supabase
      .from('clients')
      .select('*')

    if (clientId) {
      clientsQuery = clientsQuery.eq('id', clientId)
    }

    const { data: clients, error: clientsError } = await clientsQuery

    if (clientsError) {
      throw new Error(`Failed to fetch clients: ${clientsError.message}`)
    }

    const exportData: ClientExportData[] = []

    // For each client, gather all their data
    for (const client of clients || []) {
      console.log('Processing client:', client.id)

      // Get intake form data
      const { data: intakeHistory } = await supabase
        .from('client_history')
        .select('*')
        .eq('client_id', client.id)
        .eq('action_type', 'intake_form_submitted')
        .order('created_at', { ascending: false })
        .limit(1)

      // Get all client history
      const { data: allHistory } = await supabase
        .from('client_history')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })

      // Get any documents/uploads (if they exist)
      // Note: This assumes you have a documents table linked to clients
      const { data: documents } = await supabase
        .from('documents')
        .select('*')
        .eq('owner_id', client.user_id)

      exportData.push({
        client,
        intakeForm: intakeHistory?.[0] || null,
        history: allHistory || [],
        documents: documents || []
      })
    }

    if (format === 'csv') {
      // Convert to CSV format
      const csvRows = []
      
      // CSV Headers
      csvRows.push([
        'Client ID',
        'Name',
        'Email',
        'Phone',
        'Status',
        'Service Type',
        'Created Date',
        'Intake Form Data',
        'Document Count'
      ].join(','))

      // CSV Data
      for (const item of exportData) {
        const intakeData = item.intakeForm?.metadata ? 
          JSON.stringify(item.intakeForm.metadata).replace(/"/g, '""') : ''
        
        csvRows.push([
          item.client.id,
          `"${item.client.name}"`,
          `"${item.client.email}"`,
          `"${item.client.phone || ''}"`,
          item.client.status,
          item.client.service_type_id || '',
          item.client.created_at,
          `"${intakeData}"`,
          item.documents.length
        ].join(','))
      }

      const csvContent = csvRows.join('\n')
      
      return new Response(csvContent, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="client-data-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    } else {
      // Return JSON format
      return new Response(JSON.stringify({
        exportDate: new Date().toISOString(),
        totalClients: exportData.length,
        data: exportData
      }, null, 2), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="client-data-${new Date().toISOString().split('T')[0]}.json"`
        }
      })
    }

  } catch (error) {
    console.error('Export error:', error)
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})