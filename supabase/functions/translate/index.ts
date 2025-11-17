import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface TranslateRequest {
  text: string
  targetLanguage: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text, targetLanguage }: TranslateRequest = await req.json()

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Helper function to detect German words in text
    const hasGermanWords = (text: string): boolean => {
      // Common German words and patterns
      const germanPatterns = [
        /\b(der|die|das|den|dem|des|ein|eine|einer|einem|einen|eines|und|oder|aber|mit|von|zu|auf|in|an|für|ist|sind|haben|werden|können|müssen|sollen|wollen|möchte|mögen|bin|bist|war|waren|wird|werde|wirst|werdet|hast|hat|hatte|hatten|kann|kannst|könnt|konnte|konnten|will|willst|wollt|wollte|wollten|soll|sollst|sollt|sollte|sollten|muss|musst|müsst|musste|mussten|mag|magst|mögt|mochte|mochten|ich|du|er|sie|es|wir|ihr|Sie)\b/i,
        /[äöüßÄÖÜ]/,
        /\b(ja|nein|bitte|danke|gern|gerne|vielleicht|natürlich|wirklich|sehr|viel|mehr|am|zum|zur|im|ins|vom|beim|zum|zur)\b/i
      ]
      return germanPatterns.some(pattern => pattern.test(text))
    }

    // Create translation prompt - ensure we return ONLY a clean translation
    const prompt = `Translate the following German text into natural ${targetLanguage}. 

CRITICAL REQUIREMENTS:
- Translate EVERY single word from German to ${targetLanguage}
- Do NOT leave ANY German words, phrases, or expressions in the output
- The ENTIRE output must be in ${targetLanguage} only
- Exception: Only proper names (like people names or company names) may remain unchanged
- Respond with ONLY the ${targetLanguage} translation, with no explanations, notes, or extra text
- Ensure the translation is complete and natural

German text to translate:
"${text}"`

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Use a modern, high‑quality model for more reliable translations
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a professional translator specializing in German to ${targetLanguage} translation. Your translations must be 100% in ${targetLanguage} with NO German words remaining, except for proper names. Every single German word must be translated.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        // Low temperature for deterministic, literal translations
        temperature: 0.1,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${error}`)
    }

    const data = await response.json()
    let translation = data.choices[0]?.message?.content?.trim()

    if (!translation) {
      throw new Error('No translation received from OpenAI')
    }

    // Validate translation - check if German words remain
    if (hasGermanWords(translation)) {
      console.log('⚠️ German words detected in translation, re-translating with stricter prompt...')
      
      // Re-translate with even stricter prompt
      const strictPrompt = `CRITICAL: The previous translation contained German words. This is NOT acceptable.

You MUST translate the following German text into ${targetLanguage} with ABSOLUTELY NO German words remaining (except proper names).

Every single German word must be translated. Check your output carefully - if you see ANY German words like "der", "die", "das", "und", "ist", "sind", "haben", "können", "müssen", "ich", "du", "er", "sie", "wir", "ihr", "ja", "nein", "bitte", "danke", or any words with ä, ö, ü, or ß, you have FAILED.

Translate this German text completely to ${targetLanguage}:
"${text}"

Output ONLY the ${targetLanguage} translation with NO German words:`

      const retryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are a professional translator. You MUST translate every German word to ${targetLanguage}. NO German words are allowed in your output except proper names.`
            },
            {
              role: 'user',
              content: strictPrompt
            }
          ],
          max_tokens: 500,
          temperature: 0.1,
        }),
      })

      if (retryResponse.ok) {
        const retryData = await retryResponse.json()
        const retryTranslation = retryData.choices[0]?.message?.content?.trim()
        if (retryTranslation && !hasGermanWords(retryTranslation)) {
          translation = retryTranslation
          console.log('✅ Re-translation successful, no German words detected')
        } else if (retryTranslation) {
          console.log('⚠️ Re-translation still contains German words, using it anyway')
          translation = retryTranslation
        }
      }
    }

    return new Response(
      JSON.stringify({
        translation: translation,
        originalText: text,
        targetLanguage: targetLanguage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Translation function error:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Translation failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})