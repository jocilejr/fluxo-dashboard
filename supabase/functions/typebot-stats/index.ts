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

    // Get stats from Typebot API
    const statsUrl = `${TYPEBOT_BASE_URL}/api/v1/typebots/${TYPEBOT_ID}/analytics/stats`
    console.log('[typebot-stats] Fetching stats from:', statsUrl)

    const statsResponse = await fetch(statsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${typebotToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!statsResponse.ok) {
      const errorText = await statsResponse.text()
      console.error('[typebot-stats] Stats API error:', statsResponse.status, errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch Typebot stats', details: errorText }),
        { status: statsResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const statsData = await statsResponse.json()
    console.log('[typebot-stats] Stats data:', JSON.stringify(statsData))

    // Get results list to calculate today's count
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

    let todayCount = 0
    let results: any[] = []

    if (resultsResponse.ok) {
      const resultsData = await resultsResponse.json()
      results = resultsData.results || []
      console.log('[typebot-stats] Total results:', results.length)

      // Count results from today
      todayCount = results.filter((result: any) => {
        const createdAt = new Date(result.createdAt)
        return createdAt >= today
      }).length

      console.log('[typebot-stats] Today count:', todayCount)
    } else {
      console.error('[typebot-stats] Results API error:', resultsResponse.status)
    }

    // Return combined stats
    const response = {
      stats: statsData.stats || {},
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
