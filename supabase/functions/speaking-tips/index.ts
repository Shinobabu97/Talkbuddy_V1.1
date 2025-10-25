import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { SPEAKING_TIPS_SYSTEM_PROMPT } from "../prompts/speaking-tips.ts"
import { corsHeaders } from "../_shared/cors.ts"

interface SpeakingTipsRequest {
  message: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message }: SpeakingTipsRequest = await req.json()

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Prepare messages for OpenAI
    const openaiMessages = [
      { role: 'system', content: SPEAKING_TIPS_SYSTEM_PROMPT },
      { role: 'user', content: `Provide speaking tips for this German sentence: "${message}"` }
    ]

    console.log('Speaking tips system prompt:', SPEAKING_TIPS_SYSTEM_PROMPT)
    console.log('Messages being sent:', openaiMessages)

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: openaiMessages,
        max_tokens: 300,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${error}`)
    }

    const data = await response.json()
    const tips = data.choices[0]?.message?.content

    if (!tips) {
      throw new Error('No response from OpenAI')
    }

    return new Response(
      JSON.stringify({
        tips,
        usage: data.usage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Speaking tips function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
