import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface SuggestRequest {
  germanText: string
  context?: Array<{ role: string; content: string }>
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Suggest function called');
    
    const { germanText, context }: SuggestRequest = await req.json()
    console.log('Request data:', { germanText, context });

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.error('OpenAI API key not found');
      throw new Error('OpenAI API key not configured')
    }

    // Create context string
    const contextStr = context 
      ? context.map(msg => `${msg.role}: ${msg.content}`).join('\n')
      : '';

    // Create suggestion prompt
    const prompt = `Based on this German conversation context:
${contextStr}

The AI just said: "${germanText}"

Generate exactly 3 appropriate German responses that a language learner might give, along with their English translations. 

Format your response as a JSON array like this:
[
  {"german": "German response 1", "english": "English translation 1"},
  {"german": "German response 2", "english": "English translation 2"},
  {"german": "German response 3", "english": "English translation 3"}
]

Make the responses varied - one agreeing/positive, one questioning/curious, and one that continues the conversation naturally.`

    console.log('Calling OpenAI API');
    
    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that generates German language learning responses. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${error}`)
    }

    const data = await response.json()
    console.log('OpenAI response:', data);
    
    const content = data.choices[0]?.message?.content?.trim()

    if (!content) {
      console.error('No content from OpenAI');
      throw new Error('No suggestions received from OpenAI')
    }

    // Parse the JSON response
    let suggestions
    try {
      suggestions = JSON.parse(content)
      console.log('Parsed suggestions:', suggestions);
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Content:', content);
      throw new Error('Invalid JSON response from OpenAI')
    }

    if (!Array.isArray(suggestions) || suggestions.length !== 3) {
      console.error('Invalid suggestions format:', suggestions);
      throw new Error('Invalid suggestions format')
    }

    return new Response(
      JSON.stringify({
        suggestions: suggestions
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Suggestion function error:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Suggestion generation failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})