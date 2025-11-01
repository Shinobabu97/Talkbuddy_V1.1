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
        
        // Extract grammar topic from the analysis
        let grammarTopic = 'General Grammar';
        if (comprehensiveData.suggestions?.grammar) {
          // Extract topic from grammar suggestions
          const grammarText = comprehensiveData.suggestions.grammar.toLowerCase();
          if (grammarText.includes('perfect tense') || grammarText.includes('perfekt')) {
            grammarTopic = 'Perfect Tense';
          } else if (grammarText.includes('word order') || grammarText.includes('word order')) {
            grammarTopic = 'Word Order';
          } else if (grammarText.includes('articles') || grammarText.includes('der/die/das')) {
            grammarTopic = 'Articles';
          } else if (grammarText.includes('conjugation') || grammarText.includes('verb')) {
            grammarTopic = 'Verb Conjugation';
          } else if (grammarText.includes('case') || grammarText.includes('akkusativ') || grammarText.includes('dativ') || grammarText.includes('genitiv')) {
            grammarTopic = 'Cases';
          } else if (grammarText.includes('adjective') || grammarText.includes('adjektiv')) {
            grammarTopic = 'Adjectives';
          } else if (grammarText.includes('preposition') || grammarText.includes('präposition')) {
            grammarTopic = 'Prepositions';
          } else if (grammarText.includes('subjunctive') || grammarText.includes('konjunktiv')) {
            grammarTopic = 'Subjunctive';
          } else if (grammarText.includes('passive') || grammarText.includes('passiv')) {
            grammarTopic = 'Passive Voice';
          } else if (grammarText.includes('modal') || grammarText.includes('modal verb')) {
            grammarTopic = 'Modal Verbs';
          } else if (grammarText.includes('relative') || grammarText.includes('relativ')) {
            grammarTopic = 'Relative Clauses';
          } else if (grammarText.includes('compound') || grammarText.includes('zusammengesetzt')) {
            grammarTopic = 'Compound Words';
          } else if (grammarText.includes('separable') || grammarText.includes('trennbar')) {
            grammarTopic = 'Separable Verbs';
          }
        }
        
        // Extract grammar-specific information
        const grammarAnalysis = {
          analysis: comprehensiveData.suggestions?.grammar || 'No grammar issues found',
          corrections: comprehensiveData.corrections?.grammar,
          hasErrors: comprehensiveData.errorTypes?.grammar || false,
          grammarTopic: grammarTopic,
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

    // Extract grammar topic from the analysis text
    let grammarTopic = 'General Grammar';
    const analysisText = analysis.toLowerCase();
    if (analysisText.includes('perfect tense') || analysisText.includes('perfekt')) {
      grammarTopic = 'Perfect Tense';
    } else if (analysisText.includes('word order') || analysisText.includes('word order')) {
      grammarTopic = 'Word Order';
    } else if (analysisText.includes('articles') || analysisText.includes('der/die/das')) {
      grammarTopic = 'Articles';
    } else if (analysisText.includes('conjugation') || analysisText.includes('verb')) {
      grammarTopic = 'Verb Conjugation';
    } else if (analysisText.includes('case') || analysisText.includes('akkusativ') || analysisText.includes('dativ') || analysisText.includes('genitiv')) {
      grammarTopic = 'Cases';
    } else if (analysisText.includes('adjective') || analysisText.includes('adjektiv')) {
      grammarTopic = 'Adjectives';
    } else if (analysisText.includes('preposition') || analysisText.includes('präposition')) {
      grammarTopic = 'Prepositions';
    } else if (analysisText.includes('subjunctive') || analysisText.includes('konjunktiv')) {
      grammarTopic = 'Subjunctive';
    } else if (analysisText.includes('passive') || analysisText.includes('passiv')) {
      grammarTopic = 'Passive Voice';
    } else if (analysisText.includes('modal') || analysisText.includes('modal verb')) {
      grammarTopic = 'Modal Verbs';
    } else if (analysisText.includes('relative') || analysisText.includes('relativ')) {
      grammarTopic = 'Relative Clauses';
    } else if (analysisText.includes('compound') || analysisText.includes('zusammengesetzt')) {
      grammarTopic = 'Compound Words';
    } else if (analysisText.includes('separable') || analysisText.includes('trennbar')) {
      grammarTopic = 'Separable Verbs';
    }

    return new Response(
      JSON.stringify({
        analysis,
        grammarTopic,
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
