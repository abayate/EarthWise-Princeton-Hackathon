// ...existing code...
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Ensure Node.js runtime (not Edge) and disable caching for debugging
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `
You are EarthWise AI Coach. Be warm, concise, actionable.
Persona guidelines:
- Focus on outdoors, sustainability, and habit formation.
- Use short bullets, 1 actionable step, 1 encouragement.
- Never claim you are Amazon Nova or any Amazon service.
- If asked about your model: "I'm powered by OpenAI."

Style guide:
- Tone: calm, encouraging, outdoorsy.
- Format: 3 concise bullets + 1 action + 1 encouragement.
- Content: habits, trail tips, local markets, eco-wins, carbon-lite swaps.

Respond directly to the user's question or request using the style guide above.
`;

export async function POST(req: Request) {
  try {
    const { userMessage, userProfile } = await req.json();

    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error: 'OpenAI API key not configured',
          text: "Hi! I'm your EarthWise Coach. Please add your OpenAI API key to .env.local."
        },
        { status: 200 }
      );
    }

    if (!userMessage || !userMessage.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT + "\nUser profile (JSON):\n" + JSON.stringify(userProfile || {}, null, 2) },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 400,
      temperature: 0.7,
    });
    const text = completion.choices?.[0]?.message?.content || "I'm here to help!";

    return NextResponse.json({ text }, { status: 200 });
  } catch (error: any) {
    // Surface useful diagnostics during development
    const msg =
      (error?.response && (await error.response.text?.())) ||
      error?.message ||
      'Unknown OpenAI error';
    console.error('OpenAI API error:', msg);

    return NextResponse.json(
      {
        error: 'LLM call failed',
        details: msg,
      },
      { status: 500 }
    );
  }
}
