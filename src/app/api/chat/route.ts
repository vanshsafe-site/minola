import { NextRequest, NextResponse } from 'next/server';

// Store the API key server-side where it won't be exposed to frontend
const DEFAULT_API_KEY = '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';

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();
    const { model, messages, customApiKey } = requestData;
    
    // Determine which API key to use (custom or default)
    const apiKey = customApiKey || DEFAULT_API_KEY;
    
    // Call OpenRouter API
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': request.headers.get('origin') || 'http://localhost:3000',
        'X-Title': 'P.O.O.J.A Mental Health Assistant',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
      }),
    });

    // Handle response
    if (!openRouterResponse.ok) {
      const error = await openRouterResponse.text();
      return NextResponse.json(
        { error: `API request failed: ${error}` },
        { status: openRouterResponse.status }
      );
    }

    const data = await openRouterResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in chat API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 