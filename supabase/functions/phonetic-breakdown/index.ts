import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface PhoneticBreakdownRequest {
  text: string;
  language?: 'de' | 'en';
}

interface PhoneticWord {
  original: string;
  phonetic: string; // IPA transcription
  transliteration: string; // English-sounding version
  syllables: string[];
}

interface PhoneticBreakdownResponse {
  words: PhoneticWord[];
  success: boolean;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text, language = 'de' }: PhoneticBreakdownRequest = await req.json()

    if (!text) {
      return new Response(
        JSON.stringify({ success: false, error: 'Text is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Create system prompt for phonetic breakdown
    const systemPrompt = `You are a German pronunciation expert. Break down the following German text into phonetic components.

Text: "${text}"

For each word, provide:
1. Original German word
2. IPA phonetic transcription (using proper IPA symbols)
3. English transliteration (how an English speaker would approximate it)
4. Syllable breakdown (split into natural German syllables)

Return ONLY a JSON object with this structure:
{
  "words": [
    {
      "original": "Straße",
      "phonetic": "ˈʃtʁaːsə",
      "transliteration": "SHTRA-suh",
      "syllables": ["Stra", "ße"]
    }
  ]
}

Guidelines:
- Use proper IPA symbols for German sounds
- Make transliteration helpful for English speakers
- Break syllables naturally (not just by letters)
- Handle umlauts and special characters correctly
- For compound words, break into meaningful parts`

    // Call OpenAI API for phonetic breakdown
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt }
        ],
        max_tokens: 800,
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${error}`)
    }

    const data = await response.json()
    const breakdownText = data.choices[0]?.message?.content

    if (!breakdownText) {
      throw new Error('No phonetic breakdown received from OpenAI')
    }

    // Parse the JSON response
    let breakdown: PhoneticBreakdownResponse
    try {
      const parsedData = JSON.parse(breakdownText)
      breakdown = {
        words: parsedData.words || [],
        success: true
      }
    } catch (parseError) {
      // If JSON parsing fails, create basic breakdown
      const words = text.split(' ').filter(word => word.length > 0)
      breakdown = {
        words: words.map(word => ({
          original: word,
          phonetic: word, // Fallback to original word
          transliteration: word,
          syllables: [word]
        })),
        success: true
      }
    }

    return new Response(
      JSON.stringify(breakdown),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Phonetic breakdown function error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Phonetic breakdown failed'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
