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
  conversationContext?: string
}

// Formality detection function
function detectFormalityMismatch(userMessage: string, contextLevel: string): string | null {
  console.log('🔍 DEBUG: detectFormalityMismatch called');
  console.log('Input message:', userMessage);
  console.log('Context level:', contextLevel);
  
  const hasDu = /\b(du|dich|dir|dein|deine|deinen|deinem|deiner)\b/i.test(userMessage);
  const hasSie = /\b(sie|ihnen|ihr|ihre|ihren|ihrem|ihrer)\b/i.test(userMessage);
  
  console.log('Has "du" forms:', hasDu);
  console.log('Has "Sie" forms:', hasSie);
  
  if (contextLevel === 'Professional' && hasDu) {
    console.log('✅ Professional context + du detected - returning correction');
    return "Nur eine kleine Erinnerung - da dies ein professionelles Gespräch ist, versuchen Sie bitte 'Sie' statt 'Du' zu verwenden und formellere Ausdrücke zu benutzen.";
  }
  
  if (contextLevel === 'Casual' && hasSie) {
    console.log('✅ Casual context + Sie detected - returning correction');
    return "Hey, entspann dich! Das ist ein lockeres Gespräch, also fühl dich frei 'Du' zu verwenden und umgangssprachlich zu sprechen - wir sind hier nur Freunde!";
  }
  
  console.log('❌ No mismatch detected');
  return null;
}

// Difficulty level instructions function
function getDifficultyInstructions(difficultyLevel: string): string {
  switch (difficultyLevel.toLowerCase()) {
    case 'beginner':
      return `ANFÄNGER-NIVEAU (A1-A2):
- Verwende einfaches, alltägliches Vokabular
- Halte Sätze kurz und einfach (5-10 Wörter)
- Verwende nur grundlegende Grammatikstrukturen (Präsens, einfaches Perfekt)
- Vermeide komplexe Nebensätze und Konjunktiv
- Sprich über vertraute Alltagsthemen (Essen, Familie, Hobbies, Wetter)
- Wiederhole wichtige Wörter zur Verstärkung
- Verwende langsames, klares Sprechtempo
- Beispiel-Antworten: "Ja, das ist gut.", "Was magst du gern?", "Ich verstehe."`;
    
    case 'intermediate':
      return `MITTELSTUFE (B1-B2):
- Verwende erweitertes Alltagsvokabular und etwas Fachsprache
- Verwende mittellange Sätze (10-15 Wörter)
- Nutze verschiedene Zeitformen (Präsens, Perfekt, Präteritum, Futur)
- Verwende Nebensätze mit weil, dass, wenn, obwohl
- Sprich über breitere Themen (Arbeit, Reisen, Kultur, aktuelle Ereignisse)
- Nutze einfache idiomatische Ausdrücke
- Verwende moderates Sprechtempo
- Beispiel-Antworten: "Das finde ich interessant, weil...", "Wenn ich darüber nachdenke...", "Meiner Meinung nach..."`;
    
    case 'advanced':
      return `FORTGESCHRITTEN (C1-C2):
- Verwende anspruchsvolles Vokabular, Fachterminologie und abstrakte Begriffe
- Verwende komplexe, längere Sätze (15-25 Wörter)
- Nutze alle Zeitformen und Modi (Konjunktiv I und II, Passiv)
- Verwende komplexe Satzstrukturen mit mehreren Nebensätzen
- Sprich über komplexe Themen (Politik, Philosophie, Wissenschaft, Wirtschaft)
- Nutze idiomatische Wendungen und Redewendungen
- Verwende natürliches, fließendes Sprechtempo
- Beispiel-Antworten: "Unter Berücksichtigung dessen...", "Es lässt sich argumentieren, dass...", "Im Hinblick auf..."`;
    
    default:
      return '';
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messages, conversationId, contextLevel, difficultyLevel, systemInstruction, userProfile, conversationContext }: ChatRequest = await req.json()

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Create system prompt based on user profile and settings
    let systemPrompt = createSystemPrompt(contextLevel, difficultyLevel, userProfile, conversationContext)
    
    // Override system prompt with system instruction if provided
    if (systemInstruction) {
      // Use the systemInstruction as is for all cases (translation or suggestions)
      systemPrompt = systemInstruction;
    } else {
      systemPrompt = `${contextLevel === 'Professional' ? 'Sie sind' : 'Du bist'} ein freundlicher, geduldiger deutscher Gesprächspartner. Ihre Aufgabe ist es, Nutzern beim Üben deutscher Gespräche in einer unterstützenden, ermutigenden Umgebung zu helfen.

WICHTIGE REGELN:
- Antworte NUR auf Deutsch
- KEINE englischen Übersetzungen in Klammern
- KEINE englischen Erklärungen
- PRIORITÄT: Gib IMMER explizite Korrekturen bei Formellitätsfehlern - das ist wichtiger als das Gespräch am Laufen zu halten

${contextLevel === 'Professional' ? `
PROFESSIONELLER KONTEXT:
- Verwende "Sie" statt "Du" (formale Anrede)
- Verwende höfliche, geschäftliche Ausdrücke
- Sei respektvoll und professionell
- WICHTIG: Wenn der Nutzer "du" verwendet, MUSS du eine explizite Erinnerung geben: "Nur eine kleine Erinnerung - da dies ein professionelles Gespräch ist, versuchen Sie bitte 'Sie' statt 'Du' zu verwenden und formellere Ausdrücke zu benutzen."
` : `
CASUAL KONTEXT:
- Verwende "Du" statt "Sie" (informelle Anrede)
- Verwende umgangssprachliche Ausdrücke
- Sei locker und freundlich
- WICHTIG: Wenn der Nutzer "Sie" verwendet, MUSS du eine explizite Erinnerung geben: "Hey, entspann dich! Das ist ein lockeres Gespräch, also fühl dich frei 'Du' zu verwenden und umgangssprachlich zu sprechen - wir sind hier nur Freunde!"
`}`
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

    // Check for formality mismatch in the last user message
    const lastUserMessage = messages[messages.length - 1];
    let finalMessage = assistantMessage;

    if (lastUserMessage && lastUserMessage.role === 'user') {
      console.log('🔍 DEBUG: Checking formality mismatch');
      console.log('User message:', lastUserMessage.content);
      console.log('Context level:', contextLevel);
      
      const correction = detectFormalityMismatch(lastUserMessage.content, contextLevel);
      console.log('Correction result:', correction);
      
      if (correction) {
        finalMessage = `${correction}\n\n${assistantMessage}`;
        console.log('✅ Applied correction');
      } else {
        console.log('❌ No correction needed');
      }
    }

    return new Response(
      JSON.stringify({
        message: finalMessage,
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

function createSystemPrompt(contextLevel: string, difficultyLevel: string, userProfile?: any, conversationContext?: string): string {
  const contextSection = conversationContext 
    ? `\n\nKONVERSATIONS-KONTEXT: "${conversationContext}"
WICHTIG: 
- Dies ist das Hauptthema dieser Unterhaltung
- Alle Ihre Antworten müssen in diesem Kontext bleiben
- Reagieren Sie DIREKT auf die vorherige Nachricht des Benutzers
- Entwickeln Sie das Gespräch natürlich in Bezug auf diesen Kontext weiter`
    : '';
  
  const basePrompt = `${contextLevel === 'Professional' ? 'Sie sind' : 'Du bist'} ein freundlicher, natürlicher Gesprächspartner auf Deutsch. Sprich wie ein echter Mensch, nicht wie ein Lehrer oder Lehrbuch.

Kontext: ${contextLevel}
Schwierigkeit: ${difficultyLevel}${contextSection}

WICHTIGE REGELN:
- Antworte NUR auf Deutsch
- KEINE englischen Übersetzungen in Klammern
- KEINE englischen Erklärungen
- Sprich natürlich und locker
- Sei wie ein echter Freund

KRITISCH FÜR 2.+ NACHRICHTEN:
- Reagiere DIREKT und SPEZIFISCH auf die SOFORTIGE VORHERIGE Nachricht des Benutzers
- Entwickle das Gespräch basierend auf dem, was der Benutzer gerade gesagt hat, weiter
- Stelle relevante Fragen oder mache Kommentare, die direkt mit der letzten Benutzernachricht zusammenhängen
- Vermeide generische Antworten - sei spezifisch und kontextuell

SCHWIERIGKEITSGRAD-ANPASSUNG:
${getDifficultyInstructions(difficultyLevel)}

KONTEXT-ÜBERWACHUNG:
Du musst den Gesprächsstil des Nutzers überwachen und EXPLIZITE Erinnerungen geben, wenn der Stil nicht zum gewählten Kontext passt:

${contextLevel === 'Professional' ? `
PROFESSIONELLER KONTEXT:
- Erwarte formale Sprache mit "Sie" statt "Du"
- Erwarte höfliche, geschäftliche Ausdrücke
- Erwarte professionelle Begrüßungen und Verabschiedungen
- WICHTIG: Wenn der Nutzer "du" verwendet, MUSS du eine explizite Erinnerung geben: "Nur eine kleine Erinnerung - da dies ein professionelles Gespräch ist, versuchen Sie bitte 'Sie' statt 'Du' zu verwenden und formellere Ausdrücke zu benutzen."
` : `
CASUAL KONTEXT:
- Erwarte lockere Sprache mit "Du" statt "Sie"
- Erwarte umgangssprachliche Ausdrücke und Kontraktionen
- Erwarte freundliche, entspannte Begrüßungen
- WICHTIG: Wenn der Nutzer "Sie" verwendet, MUSS du eine explizite Erinnerung geben: "Hey, entspann dich! Das ist ein lockeres Gespräch, also fühl dich frei 'Du' zu verwenden und umgangssprachlich zu sprechen - wir sind hier nur Freunde!"
`}

Gesprächsstil:
- Kurze, natürliche Antworten (1-2 Sätze)
- Sei neugierig und interessiert
- Sei humorvoll und sympathisch
- Stelle viele Fragen, um das Gespräch am Laufen zu halten
- Lass den Nutzer viel sprechen
- PRIORITÄT: Gib IMMER explizite Korrekturen bei Formellitätsfehlern - das ist wichtiger als das Gespräch am Laufen zu halten
- FÜR 2.+ NACHRICHTEN: Reagiere IMMER direkt auf die letzte Benutzernachricht - entwickle das Gespräch basierend auf dem, was der Benutzer gerade gesagt hat

${contextLevel === 'Professional' ? `
PROFESSIONELLER GESPRÄCHSSTIL:
- Verwende "Sie" statt "Du" (formale Anrede)
- Verwende höfliche, geschäftliche Ausdrücke
- Sei respektvoll und professionell
- Beispiele für gute Antworten:
  - "Das klingt interessant! Was interessiert Sie besonders daran?"
  - "Verstehe! Können Sie mir mehr darüber erzählen?"
  - "Interessant! Wie sehen Sie das denn?"
  - "Aha, verstehe! Und wie geht es dann weiter?"
` : `
CASUAL GESPRÄCHSSTIL:
- Verwende "Du" statt "Sie" (informelle Anrede)
- Verwende umgangssprachliche Ausdrücke
- Sei locker und freundlich
- Beispiele für gute Antworten:
  - "Ach, das klingt spannend! Erzähl mir mehr darüber."
  - "Wirklich? Das hätte ich nicht gedacht. Wie war das denn?"
  - "Interessant! Und was denkst du darüber?"
  - "Aha, verstehe! Und dann?"
`}

Vermeide:
- Lange Listen oder Aufzählungen
- Formelle Erklärungen
- Lehrbuch-Sprache
- Zu lange Antworten`

  if (userProfile) {
    const profileInfo = `
 
User Profile:
- German Level: ${userProfile.germanLevel || 'Not specified'}
- Goals: ${Array.isArray(userProfile.goals) && userProfile.goals.length > 0 ? userProfile.goals.join(', ') : 'General conversation practice'}
- Personality: ${Array.isArray(userProfile.personalityTraits) && userProfile.personalityTraits.length > 0 ? userProfile.personalityTraits.join(', ') : 'Not specified'}
- Preferred Topics: ${Array.isArray(userProfile.conversationTopics) && userProfile.conversationTopics.length > 0 ? userProfile.conversationTopics.join(', ') : 'General topics'}
 
Tailor your responses to match the user's goals and interests while maintaining the specified context and difficulty level.`
    
    return basePrompt + profileInfo
  }

  return basePrompt
}