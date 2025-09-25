import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface SuggestRequest {
  germanText: string
  conversationContext: Array<{role: string, content: string}>
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { germanText, conversationContext }: SuggestRequest = await req.json()

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Create context from conversation history
    const contextString = conversationContext
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n')

    // Create suggestion prompt
    const prompt = `You are helping a German language learner practice conversation. Based on this German message: "${germanText}"

Conversation context:
${contextString}

Generate exactly 3 appropriate German responses that a learner could use to continue this conversation naturally. Each response should be at an intermediate level and contextually appropriate.

Format your response as JSON with this exact structure:
{
  "suggestions": [
    {"german": "German response 1", "english": "English translation 1"},
    {"german": "German response 2", "english": "English translation 2"},
    {"german": "German response 3", "english": "English translation 3"}
  ]
}

Make sure the responses are:
1. Contextually appropriate for the conversation
2. At an intermediate German level
3. Natural and commonly used phrases
4. Varied in tone (agreeing, questioning, elaborating)`

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
            content: 'You are a German language learning assistant. Always respond with valid JSON in the exact format requested.'
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
      throw new Error(`OpenAI API error: ${error}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content?.trim()

    if (!content) {
      throw new Error('No suggestions received from OpenAI')
    }

    // Parse the JSON response
    let suggestions
    try {
      const parsed = JSON.parse(content)
      suggestions = parsed.suggestions
    } catch (parseError) {
      // Fallback if JSON parsing fails
      suggestions = [
        { german: "Das ist interessant.", english: "That's interesting." },
        { german: "Können Sie das erklären?", english: "Can you explain that?" },
        { german: "Ich verstehe.", english: "I understand." }
      ]
    }

    return new Response(
      JSON.stringify({
        suggestions: suggestions,
        originalText: germanText
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