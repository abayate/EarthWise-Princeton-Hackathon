import { NextResponse } from "next/server";

const KNOT_BASE = process.env.KNOT_BASE_URL ?? "https://development.knotapi.com";
const CLIENT_ID = process.env.KNOT_CLIENT_ID;
const SECRET = process.env.KNOT_SECRET;

export async function POST(req: Request) {
  const fallback = [
    {
      title: "You often buy from eco-friendly merchants",
      detail: "We'll prioritize low-waste + plant-forward tasks.",
      score: 10,
    },
    {
      title: "You shop at big-box stores",
      detail: "We'll suggest bulk-buy + reusable-bag tasks.",
      score: 7,
    },
  ];

  if (!CLIENT_ID || !SECRET) {
    return NextResponse.json(
      { source: "fallback", insights: fallback },
      { status: 200 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const { external_user_id = "demo-user", limit = 5 } = body;

  try {
    const res = await fetch(`${KNOT_BASE}/transactions/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Basic " + Buffer.from(`${CLIENT_ID}:${SECRET}`).toString("base64"),
      },
      body: JSON.stringify({ external_user_id, limit }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { source: "knot-error", insights: fallback },
        { status: 200 },
      );
    }

    const data = await res.json();

    const items = data.items ?? data.transactions ?? [];
    const insights =
      items.length > 0
        ? items.map((tx: any) => ({
            title: `You shop at ${tx.merchant ?? tx.merchant_name ?? "this store"}`,
            detail: `We saw ${tx.sku ?? tx.product ?? "a SKU"}  adding sustainability tasks around that.`,
            score: 10,
          }))
        : fallback;

    return NextResponse.json({ source: "knot-dev", insights }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { source: "exception", insights: fallback },
      { status: 200 },
    );
  }
}
