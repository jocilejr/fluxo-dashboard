import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const payload = await req.json()
    console.log('Group webhook received:', JSON.stringify(payload))

    const { group_name, event_type, current_members, entries, exits } = payload

    if (!group_name) {
      return new Response(
        JSON.stringify({ error: 'group_name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if group exists
    const { data: existingGroup } = await supabase
      .from('groups')
      .select('*')
      .eq('name', group_name)
      .single()

    if (existingGroup) {
      // Update existing group
      const updateData: Record<string, any> = {}

      if (current_members !== undefined) {
        updateData.current_members = current_members
      }

      if (event_type === 'entry' || entries !== undefined) {
        updateData.total_entries = (existingGroup.total_entries || 0) + (entries || 1)
        if (current_members === undefined) {
          updateData.current_members = (existingGroup.current_members || 0) + (entries || 1)
        }
      }

      if (event_type === 'exit' || exits !== undefined) {
        updateData.total_exits = (existingGroup.total_exits || 0) + (exits || 1)
        if (current_members === undefined) {
          updateData.current_members = Math.max(0, (existingGroup.current_members || 0) - (exits || 1))
        }
      }

      const { error: updateError } = await supabase
        .from('groups')
        .update(updateData)
        .eq('id', existingGroup.id)

      if (updateError) {
        console.error('Error updating group:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to update group', details: updateError }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('Group updated successfully:', group_name)
    } else {
      // Create new group
      const { error: insertError } = await supabase
        .from('groups')
        .insert({
          name: group_name,
          current_members: current_members || 0,
          total_entries: entries || 0,
          total_exits: exits || 0,
        })

      if (insertError) {
        console.error('Error creating group:', insertError)
        return new Response(
          JSON.stringify({ error: 'Failed to create group', details: insertError }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('Group created successfully:', group_name)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Group data processed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})