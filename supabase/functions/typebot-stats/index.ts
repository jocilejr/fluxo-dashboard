const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TYPEBOT_BASE_URL = 'https://typebot.origemdavida.online'
const WORKSPACE_ID = 'cmghj8t790000o918ec7vgtt8'

async function getFluxosFolderId(typebotToken: string): Promise<string | null> {
  // First get root folders
  const foldersUrl = `${TYPEBOT_BASE_URL}/api/v1/folders?workspaceId=${WORKSPACE_ID}`
  console.log('[typebot-stats] Fetching folders from:', foldersUrl)

  const foldersResponse = await fetch(foldersUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${typebotToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!foldersResponse.ok) return null

  const foldersData = await foldersResponse.json()
  const folders = foldersData.folders || foldersData
  console.log('[typebot-stats] All folders:', JSON.stringify(folders))
  
  // Find "Espiritualidade" folder first
  const espiritualidadeFolder = folders?.find((f: any) => f.name === 'Espiritualidade')
  
  if (espiritualidadeFolder) {
    console.log('[typebot-stats] Found Espiritualidade folder ID:', espiritualidadeFolder.id)
    
    // Now fetch subfolders inside Espiritualidade
    const subFoldersUrl = `${TYPEBOT_BASE_URL}/api/v1/folders?workspaceId=${WORKSPACE_ID}&parentFolderId=${espiritualidadeFolder.id}`
    console.log('[typebot-stats] Fetching subfolders from:', subFoldersUrl)
    
    const subFoldersResponse = await fetch(subFoldersUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${typebotToken}`,
        'Content-Type': 'application/json',
      },
    })
    
    if (subFoldersResponse.ok) {
      const subFoldersData = await subFoldersResponse.json()
      const subFolders = subFoldersData.folders || subFoldersData
      console.log('[typebot-stats] Subfolders in Espiritualidade:', JSON.stringify(subFolders))
      
      const fluxosFolder = subFolders?.find((f: any) => f.name === 'Fluxos')
      if (fluxosFolder) {
        console.log('[typebot-stats] Found Fluxos folder ID:', fluxosFolder.id)
        return fluxosFolder.id
      }
    }
    
    // If no subfolder API, try finding Fluxos with parentFolderId matching Espiritualidade
    const fluxosFolder = folders?.find(
      (f: any) => f.name === 'Fluxos' && f.parentFolderId === espiritualidadeFolder.id
    )
    if (fluxosFolder) {
      console.log('[typebot-stats] Found Fluxos folder ID (from main list):', fluxosFolder.id)
      return fluxosFolder.id
    }
    
    // Fallback: return Espiritualidade folder if Fluxos not found
    console.log('[typebot-stats] Fluxos not found, using Espiritualidade folder')
    return espiritualidadeFolder.id
  }
  
  console.log('[typebot-stats] Espiritualidade folder not found')
  return null
}

async function getTypebotsInFolder(typebotToken: string, folderId: string): Promise<any[]> {
  const listUrl = `${TYPEBOT_BASE_URL}/api/v1/typebots?workspaceId=${WORKSPACE_ID}&folderId=${folderId}`
  console.log('[typebot-stats] Listing typebots from:', listUrl)

  const listResponse = await fetch(listUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${typebotToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!listResponse.ok) return []

  const listData = await listResponse.json()
  return listData.typebots || listData || []
}

async function getTypebotResultsCount(typebotToken: string, typebotId: string, fromDate: Date, toDate: Date): Promise<number> {
  let count = 0
  let cursor: string | null = null
  let hasMore = true
  
  while (hasMore) {
    const url: string = cursor 
      ? `${TYPEBOT_BASE_URL}/api/v1/typebots/${typebotId}/results?limit=100&cursor=${cursor}`
      : `${TYPEBOT_BASE_URL}/api/v1/typebots/${typebotId}/results?limit=100`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${typebotToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('[typebot-stats] Error fetching results for', typebotId)
      return count
    }

    const data = await response.json()
    const results = data.results || []
    
    // Count results within date range
    for (const result of results) {
      const createdAt = new Date(result.createdAt)
      if (createdAt >= fromDate && createdAt <= toDate) {
        count++
      }
    }
    
    if (data.nextCursor) {
      cursor = data.nextCursor
    } else {
      hasMore = false
    }
    
    // Safety limit
    if (count >= 10000) {
      hasMore = false
    }
  }
  
  return count
}

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

    // Get Fluxos folder ID (used by list and ranking)
    const fluxosFolderId = await getFluxosFolderId(typebotToken)

    // RANKING: Get top 10 typebots by leads in date range
    if (action === 'ranking') {
      const fromDate = body.fromDate ? new Date(body.fromDate) : new Date()
      const toDate = body.toDate ? new Date(body.toDate) : new Date()
      const specificTypebotId = body.typebotId
      
      fromDate.setHours(0, 0, 0, 0)
      toDate.setHours(23, 59, 59, 999)
      
      console.log('[typebot-stats] Ranking for period:', fromDate.toISOString(), '-', toDate.toISOString())
      console.log('[typebot-stats] Specific typebot filter:', specificTypebotId || 'none')

      // If specific typebot is selected, just get its count
      if (specificTypebotId) {
        const count = await getTypebotResultsCount(typebotToken, specificTypebotId, fromDate, toDate)
        
        // Get typebot details
        const typebotUrl = `${TYPEBOT_BASE_URL}/api/v1/typebots/${specificTypebotId}`
        const typebotResponse = await fetch(typebotUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${typebotToken}`,
            'Content-Type': 'application/json',
          },
        })
        
        let typebotName = 'Typebot'
        if (typebotResponse.ok) {
          const typebotData = await typebotResponse.json()
          typebotName = typebotData.typebot?.name || typebotData.name || 'Typebot'
        }

        return new Response(
          JSON.stringify({ ranking: [{ id: specificTypebotId, name: typebotName, count }] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!fluxosFolderId) {
        return new Response(
          JSON.stringify({ ranking: [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const typebots = await getTypebotsInFolder(typebotToken, fluxosFolderId)
      console.log('[typebot-stats] Found', typebots.length, 'typebots in folder')

      // Get results count for each typebot
      const rankingPromises = typebots.map(async (typebot: any) => {
        const count = await getTypebotResultsCount(typebotToken, typebot.id, fromDate, toDate)
        return {
          id: typebot.id,
          name: typebot.name,
          count,
        }
      })

      const ranking = await Promise.all(rankingPromises)
      
      // Sort by count descending and take top 10
      const sortedRanking = ranking
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      console.log('[typebot-stats] Ranking calculated:', JSON.stringify(sortedRanking))

      return new Response(
        JSON.stringify({ ranking: sortedRanking }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // LIST: List all typebots in workspace
    if (action === 'list') {
      const listUrl = `${TYPEBOT_BASE_URL}/api/v1/typebots?workspaceId=${WORKSPACE_ID}`
      console.log('[typebot-stats] Listing all typebots from workspace:', listUrl)

      const listResponse = await fetch(listUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${typebotToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!listResponse.ok) {
        return new Response(
          JSON.stringify({ typebots: [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const listData = await listResponse.json()
      const typebots = listData.typebots || listData || []
      console.log('[typebot-stats] Found', typebots.length, 'typebots in workspace')

      return new Response(
        JSON.stringify({ typebots }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // STATS: Get stats for a specific typebot
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
