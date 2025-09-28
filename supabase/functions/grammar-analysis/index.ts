import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GRAMMAR_ANALYSIS_SYSTEM_PROMPT } from "../prompts/grammar-analysis.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface GrammarAnalysisRequest {
  message: string;
  useComprehensive?: boolean; // Flag to use comprehensive analysis
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, useComprehensive = false }: GrammarAnalysisRequest = await req.json()

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    if (useComprehensive) {
      // Use comprehensive analysis for better integration
      const comprehensiveResponse = await fetch(`${req.url.replace('/grammar-analysis', '/comprehensive-analysis')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          userLevel: 'Intermediate',
          source: 'text'
        })
      });

      if (comprehensiveResponse.ok) {
        const comprehensiveData = await comprehensiveResponse.json();
        
        // Extract grammar-specific information
        const grammarAnalysis = {
          analysis: comprehensiveData.suggestions?.grammar || 'No grammar issues found',
          corrections: comprehensiveData.corrections?.grammar,
          hasErrors: comprehensiveData.errorTypes?.grammar || false,
          comprehensive: comprehensiveData
        };

        return new Response(
          JSON.stringify(grammarAnalysis),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        )
      }
    }

    // Fallback to original grammar analysis
    const openaiMessages = [
      { role: 'system', content: GRAMMAR_ANALYSIS_SYSTEM_PROMPT },
      { role: 'user', content: `Analyze the grammar of this German sentence: "${message}"` }
    ]

    console.log('Grammar analysis system prompt:', GRAMMAR_ANALYSIS_SYSTEM_PROMPT)
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
    const analysis = data.choices[0]?.message?.content

    if (!analysis) {
      throw new Error('No response from OpenAI')
    }

    return new Response(
      JSON.stringify({
        analysis,
        usage: data.usage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Grammar analysis function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
