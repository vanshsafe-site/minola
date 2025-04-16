import { NextRequest, NextResponse } from 'next/server';

// Store multiple API keys server-side as fallbacks
const API_KEYS = [
  process.env.OPENROUTER_API_KEY || '',
  process.env.OPENROUTER_API_KEY_BACKUP_1 || '',
  process.env.OPENROUTER_API_KEY_BACKUP_2 || ''
].filter(key => key); // Filter out empty keys

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();
    const { model, messages, customApiKey, backupApiKey1, backupApiKey2 } = requestData;
    
    // Build a list of keys to try, starting with custom keys
    const userProvidedKeys = [customApiKey, backupApiKey1, backupApiKey2].filter(key => key);
    
    // If user provided custom API keys, try those first
    const keysToTry = userProvidedKeys.length > 0 ? 
      [...userProvidedKeys, ...API_KEYS] : // Try custom keys first, then fallbacks
      API_KEYS; // Otherwise just use our fallbacks
    
    if (keysToTry.length === 0) {
      console.error('No API keys available');
      return NextResponse.json(
        { error: 'No API keys configured. Please add an API key in settings or configure server environment variables.' },
        { status: 401 }
      );
    }
    
    console.log(`Using model: ${model}`);
    console.log(`Number of API keys available: ${keysToTry.length}`);
    
    // Try each API key until one works
    let lastError = null;
    let lastStatus = 500;
    
    for (let i = 0; i < keysToTry.length; i++) {
      const apiKey = keysToTry[i];
      try {
        console.log(`Trying API key ${i + 1}...`);
        
        // Call OpenRouter API
        const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'X-Title': 'P.O.O.J.A Mental Health Assistant'
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.7 // Add some randomness but not too much
          }),
        });

        // If successful, return the data
        if (openRouterResponse.ok) {
          const data = await openRouterResponse.json();
          console.log(`Success with API key ${i + 1}`);
          return NextResponse.json(data);
        }
        
        // If not successful, record the error and continue to the next key
        const errorText = await openRouterResponse.text();
        console.error(`API key ${i + 1} failed with status ${openRouterResponse.status}: ${errorText}`);
        lastError = errorText;
        lastStatus = openRouterResponse.status;
        
      } catch (error) {
        console.error(`API key ${i + 1} threw an exception:`, error);
        lastError = error instanceof Error ? error.message : String(error);
      }
    }
    
    // If we get here, all keys failed
    let errorMessage = `API request failed with status ${lastStatus}`;
    
    if (lastStatus === 401) {
      errorMessage = 'Authentication failed: All API keys are invalid. Please provide a valid API key.';
    } else if (lastStatus === 429) {
      errorMessage = 'Rate limit exceeded: All available API keys are rate limited. Please try again later.';
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: lastStatus }
    );
    
  } catch (error) {
    console.error('Error in chat API route:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
} 