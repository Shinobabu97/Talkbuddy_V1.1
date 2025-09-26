import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ChatRequest {
  messages: ChatMessage[]
  conversationId: string
  contextLevel: string
  difficultyLevel: string
  systemInstruction?: string
  userProfile?: {
    germanLevel: string
    goals: string[]
    personalityTraits: string[]
    conversationTopics: string[]
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messages, conversationId, contextLevel, difficultyLevel, systemInstruction, userProfile }: ChatRequest = await req.json()

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Create system prompt based on user profile and settings
    let systemPrompt = createSystemPrompt(contextLevel, difficultyLevel, userProfile)
    
    // Override system prompt with system instruction if provided (for stricter German-only responses)
    if (systemInstruction) {
      systemPrompt = `${systemInstruction}\n\nContext Level: ${contextLevel}\nDifficulty Level: ${difficultyLevel}\n\nYou are a friendly and patient German language learning assistant. Your role is to help users practice German conversation in a supportive, encouraging environment.`
    }

    // Prepare messages for OpenAI
    const openaiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ]
    

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
        max_tokens: 500,
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
    const assistantMessage = data.choices[0]?.message?.content

    if (!assistantMessage) {
      throw new Error('No response from OpenAI')
    }

    return new Response(
      JSON.stringify({
        message: assistantMessage,
        conversationId,
        usage: data.usage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Chat function error:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

function createSystemPrompt(contextLevel: string, difficultyLevel: string, userProfile?: any): string {
  const basePrompt = `You are a friendly and patient German language learning assistant. Your role is to help users practice German conversation in a supportive, encouraging environment.

Context Level: ${contextLevel}
Difficulty Level: ${difficultyLevel}

CRITICAL RULES:
- Respond ONLY in German
- NEVER include English translations in parentheses like (English translation)
- NEVER add English text in brackets like [English text]
- NEVER provide English explanations
- NEVER mix German and English in the same response
- Keep responses purely in German

Guidelines:
- Adapt your language complexity to the difficulty level
- Be encouraging and patient with mistakes
- Gently correct errors by naturally using the correct form in your response
- Ask follow-up questions to keep the conversation flowing
- Use vocabulary and topics appropriate for the context level
- If the user makes a mistake, don't explicitly point it out - just model the correct usage naturally`

  if (userProfile) {
    const profileInfo = `

User Profile:
- German Level: ${userProfile.germanLevel || 'Not specified'}
- Goals: ${userProfile.goals?.join(', ') || 'General conversation practice'}
- Personality: ${userProfile.personalityTraits?.join(', ') || 'Not specified'}
- Preferred Topics: ${userProfile.conversationTopics?.join(', ') || 'General topics'}

Tailor your responses to match the user's goals and interests while maintaining the specified context and difficulty level.`
    
    return basePrompt + profileInfo
  }

  return basePrompt
}