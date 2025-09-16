export const testBasicTranslation = async (apiKey: string, text: string): Promise<{
  success: boolean;
  translation?: string;
  error?: string;
  cost?: string;
}> => {
  try {
    console.log('🧪 Testing basic text translation (free tier friendly)...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo', // Much cheaper than gpt-4o
        messages: [
          {
            role: 'system',
            content: 'You are a translator. Translate the given text between English and Nepali. If the input is in English, translate to Nepali. If the input is in Nepali, translate to English. Only respond with the translation, no explanations.'
          },
          {
            role: 'user',
            content: text
          }
        ],
        max_tokens: 100,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Translation failed:', response.status, errorText);
      
      if (response.status === 429) {
        return {
          success: false,
          error: '💳 Insufficient credits or quota exceeded. Please add credits to your OpenAI account.'
        };
      }
      
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`
      };
    }

    const data = await response.json();
    const translation = data.choices[0]?.message?.content?.trim();
    
    console.log('✅ Basic translation successful');
    console.log('📝 Translation:', translation);
    console.log('💰 Estimated cost: ~$0.001 (much cheaper than Realtime API)');

    return {
      success: true,
      translation,
      cost: '~$0.001'
    };

  } catch (error) {
    console.error('❌ Translation test error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
