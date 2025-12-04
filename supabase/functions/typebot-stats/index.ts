const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TYPEBOT_BASE_URL = 'https://typebot.origemdavida.online'
const WORKSPACE_ID = 'cmghj8t790000o918ec7vgtt8'

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

    const body = await req.json().catch(() => ({}))
    const action = body.action || 'stats'

    // List all typebots in workspace
    if (action === 'list') {
      const listUrl = `${TYPEBOT_BASE_URL}/api/v1/typebots?workspaceId=${WORKSPACE_ID}`
      console.log('[typebot-stats] Listing typebots from:', listUrl)

      const listResponse = await fetch(listUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${typebotToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!listResponse.ok) {
        const errorText = await listResponse.text()
        console.error('[typebot-stats] List API error:', listResponse.status, errorText)
        return new Response(
          JSON.stringify({ error: 'Failed to list typebots', details: errorText }),
          { status: listResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const listData = await listResponse.json()
      console.log('[typebot-stats] Typebots found:', JSON.stringify(listData))

      return new Response(
        JSON.stringify({ typebots: listData.typebots || listData }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get stats for a specific typebot
    const typebotId = body.typebotId
    if (!typebotId) {
      return new Response(
        JSON.stringify({ error: 'typebotId is required for stats action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    let allResults: any[] = []
    let cursor: string | null = null
    let hasMore = true
    
    while (hasMore) {
      const url: string = cursor 
        ? `${TYPEBOT_BASE_URL}/api/v1/typebots/${typebotId}/results?limit=100&cursor=${cursor}`
        : `${TYPEBOT_BASE_URL}/api/v1/typebots/${typebotId}/results?limit=100`
      
      console.log('[typebot-stats] Fetching results from:', url)

      const response: Response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${typebotToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[typebot-stats] Results API error:', response.status, errorText)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch Typebot results', details: errorText }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const data = await response.json()
      const results = data.results || []
      allResults = [...allResults, ...results]
      
      if (data.nextCursor) {
        cursor = data.nextCursor
      } else {
        hasMore = false
      }
      
      if (allResults.length >= 10000) {
        hasMore = false
      }
    }
    
    console.log('[typebot-stats] Total results fetched:', allResults.length)

    const todayCount = allResults.filter((result: any) => {
      const createdAt = new Date(result.createdAt)
      return createdAt >= today
    }).length

    const completedCount = allResults.filter((result: any) => result.isCompleted).length

    console.log('[typebot-stats] Today count:', todayCount)
    console.log('[typebot-stats] Completed count:', completedCount)

    const responseData = {
      stats: {
        totalViews: allResults.length,
        totalStarts: allResults.length,
        totalCompleted: completedCount,
      },
      todayCount,
      totalResults: allResults.length,
    }

    return new Response(
      JSON.stringify(responseData),
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
