import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TYPEBOT_BASE_URL = 'https://typebot.origemdavida.online'
const TYPEBOT_ID = 'cmghj8t790000o918ec7vgtt8'

Deno.serve(async (req) => {
  console.log('[typebot-stats] Request received')

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const typebotToken = Deno.env.get('TYPEBOT_API_TOKEN')
    
    if (!typebotToken) {
      console.error('[typebot-stats] TYPEBOT_API_TOKEN not configured')
      return new Response(
        JSON.stringify({ error: 'Typebot API token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get results list to calculate today's count and totals
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const resultsUrl = `${TYPEBOT_BASE_URL}/api/v1/typebots/${TYPEBOT_ID}/results?limit=1000`
    console.log('[typebot-stats] Fetching results from:', resultsUrl)

    const resultsResponse = await fetch(resultsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${typebotToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!resultsResponse.ok) {
      const errorText = await resultsResponse.text()
      console.error('[typebot-stats] Results API error:', resultsResponse.status, errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch Typebot results', details: errorText }),
        { status: resultsResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const resultsData = await resultsResponse.json()
    const results = resultsData.results || []
    console.log('[typebot-stats] Total results:', results.length)

    // Count results from today
    const todayCount = results.filter((result: any) => {
      const createdAt = new Date(result.createdAt)
      return createdAt >= today
    }).length

    // Count completed results (those with hasStarted and isCompleted)
    const completedCount = results.filter((result: any) => result.isCompleted).length

    console.log('[typebot-stats] Today count:', todayCount)
    console.log('[typebot-stats] Completed count:', completedCount)

    // Return stats based on results
    const response = {
      stats: {
        totalViews: results.length,
        totalStarts: results.length,
        totalCompleted: completedCount,
      },
      todayCount,
      totalResults: results.length,
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[typebot-stats] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
