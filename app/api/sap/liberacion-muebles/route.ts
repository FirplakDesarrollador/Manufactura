import { NextResponse } from 'next/server';

export async function GET() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const apiKey = (process.env.NEXT_PUBLIC_API_KEY || '').replace(/"/g, '');

  if (!apiUrl) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_API_URL is missing in .env' },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(apiUrl, {
      headers: {
        'api-key': apiKey,
        'ngrok-skip-browser-warning': 'true'
      },
      cache: 'no-store'
    });

    const text = await res.text();

    if (!res.ok) {
      return NextResponse.json(
        { error: `API Error: ${res.status} ${res.statusText}`, details: text },
        { status: res.status }
      );
    }

    try {
      const data = JSON.parse(text);
      return NextResponse.json(data);
    } catch (e) {
      return NextResponse.json(
        { error: 'Failed to parse API response as JSON', details: text },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Fetch error', details: error.message },
      { status: 500 }
    );
  }
}
