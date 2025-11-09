import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json();
  const { goals = [], charities = [] } = body;

  // in a real build, you'd call the nova-act SDK here to orchestrate tool calls
  // https://nova.amazon.com/act
  const plan = [
    `Analyze user profile + purchases`,
    `Generate 3 eco tasks per day tailored to ${goals.join(', ')}`,
    `Suggest monthly donation to ${charities[0] ?? 'a local env org'} and reward bonus points`,
  ];

  return NextResponse.json({
    engine: 'amazon-nova-act-mock',
    plan,
  });
}