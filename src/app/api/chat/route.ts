import { NextRequest, NextResponse } from 'next/server';

// Store the API key server-side where it won't be exposed to frontend
// Note: You should replace this with a valid API key or use environment variables
const DEFAULT_API_KEY = process.env.OPENROUTER_API_KEY || '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';

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();
    const { model, messages, customApiKey } = requestData;
    
    // Determine which API key to use (custom or default)
    const apiKey = customApiKey || DEFAULT_API_KEY;
    
    if (!apiKey) {
      console.error('No API key provided');
      return NextResponse.json(
        { error: 'No API key provided' },
        { status: 401 }
      );
    }
    
    console.log(`Using model: ${model}`);
    
    // Create a simplified request to the OpenRouter API
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
        max_tokens: 200, // Limit the response length
        temperature: 0.7 // Add some randomness but not too much
      }),
    });

    // Handle response
    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text();
      console.error(`API request failed with status ${openRouterResponse.status}: ${errorText}`);
      
      // Create a more helpful error message
      let errorMessage = `API request failed with status ${openRouterResponse.status}`;
      
      if (openRouterResponse.status === 401) {
        errorMessage = 'Authentication failed: Invalid API key. Please check your API key or use a different one.';
      } else if (openRouterResponse.status === 429) {
        errorMessage = 'Rate limit exceeded: Too many requests. Please try again later.';
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: openRouterResponse.status }
      );
    }

    const data = await openRouterResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in chat API route:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
} 