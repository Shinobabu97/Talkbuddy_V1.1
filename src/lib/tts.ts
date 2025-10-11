// Centralized German TTS Service
// This ensures consistent German voice usage across the entire application

interface TTSOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
}

class GermanTTSService {
  private audioCache = new Map<string, string>();
  private isInitialized = false;

  constructor() {
    this.initializeVoices();
  }

  private initializeVoices() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      // Load voices when they become available
      const loadVoices = () => {
        this.isInitialized = true;
      };

      if (window.speechSynthesis.getVoices().length > 0) {
        loadVoices();
      } else {
        window.speechSynthesis.addEventListener('voiceschanged', loadVoices, { once: true });
      }
    }
  }

  private getGermanVoice(): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return null;
    }

    const voices = window.speechSynthesis.getVoices();
    console.log('Available voices:', voices.map(v => ({ name: v.name, lang: v.lang })));

    // Filter for German voices
    const germanVoices = voices.filter(voice => 
      voice.lang.startsWith('de') || 
      voice.lang.includes('German') ||
      voice.name.includes('German') || 
      voice.name.includes('Deutsch') || 
      voice.name.includes('Anna') || 
      voice.name.includes('Stefan') ||
      voice.name.includes('Katja') ||
      voice.name.includes('Thomas') ||
      voice.name.includes('Hedda') ||
      voice.name.includes('Markus')
    );

    console.log('German voices found:', germanVoices.map(v => ({ name: v.name, lang: v.lang })));

    if (germanVoices.length === 0) {
      console.warn('No German voices found');
      return null;
    }

    // Prefer female German voices
    const preferredVoice = germanVoices.find(voice => 
      voice.name.includes('Anna') || 
      voice.name.includes('Katja') ||
      voice.name.includes('Hedda') ||
      voice.name.includes('German Female')
    ) || germanVoices[0];

    return preferredVoice;
  }

  async speakWithSupabase(text: string): Promise<boolean> {
    try {
      // Check cache first
      const cachedAudioUrl = this.audioCache.get(text);
      if (cachedAudioUrl) {
        console.log('Playing cached German TTS for:', text);
        const audio = new Audio(cachedAudioUrl);
        audio.play();
        return true;
      }

      console.log('Generating new German TTS for:', text);
      console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
      console.log('Supabase Key available:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
      
      // Use Supabase edge function for high-quality German TTS
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/german-tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ text })
      });

      console.log('TTS API Response Status:', response.status);
      console.log('TTS API Response OK:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('TTS API Error Response:', errorText);
        throw new Error(`TTS API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('TTS API Response Data:', data);
      
      if (data.success && data.audioUrl) {
        // Cache the audio URL for future use
        this.audioCache.set(text, data.audioUrl);
        
        // Play the generated German audio
        const audio = new Audio(data.audioUrl);
        audio.play();
        console.log('Playing and caching German TTS audio');
        return true;
      } else {
        console.error('TTS API returned unsuccessful response:', data);
        throw new Error(data.error || 'Failed to generate German speech');
      }
    } catch (error) {
      console.error('Supabase German TTS failed:', error);
      return false;
    }
  }

  speakWithBrowser(text: string, options: TTSOptions = {}): boolean {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.error('Speech synthesis not supported');
      return false;
    }

    try {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'de-DE';
      
      // Get German voice
      const germanVoice = this.getGermanVoice();
      if (germanVoice) {
        utterance.voice = germanVoice;
        console.log('Using German voice:', germanVoice.name, germanVoice.lang);
      } else {
        console.warn('No German voice found, using default voice with German language setting');
      }
      
      // Apply options
      utterance.rate = options.rate ?? 0.85;
      utterance.pitch = options.pitch ?? 1.0;
      utterance.volume = options.volume ?? 0.9;
      
      console.log('Speaking with settings:', {
        text: text,
        lang: utterance.lang,
        voice: utterance.voice?.name || 'default',
        rate: utterance.rate,
        pitch: utterance.pitch,
        volume: utterance.volume
      });
      
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (error) {
      console.error('Browser speech synthesis failed:', error);
      return false;
    }
  }

  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    // Try Supabase TTS first
    const supabaseSuccess = await this.speakWithSupabase(text);
    
    if (!supabaseSuccess) {
      console.log('Falling back to browser speech synthesis');
      // Fallback to browser TTS with German voice
      setTimeout(() => {
        this.speakWithBrowser(text, options);
      }, 200);
    }
  }

  // Clear cache if needed
  clearCache(): void {
    this.audioCache.clear();
  }

  // Get cache size for debugging
  getCacheSize(): number {
    return this.audioCache.size;
  }
}

// Export singleton instance
export const germanTTS = new GermanTTSService();

// Export the class for testing
export { GermanTTSService };
