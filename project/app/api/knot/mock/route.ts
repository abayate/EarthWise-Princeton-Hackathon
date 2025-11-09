import { NextResponse } from 'next/server';

// this simulates calling the TransactionLink sync like in Knot docs
// https://docs.knotapi.com/transaction-link/quickstart
export async function GET() {
  const fakeTransactions = [
    {
      merchant: 'Costco',
      sku: 'REUSABLE_BAG',
      amount: 12.99,
      category: 'sustainable_goods',
    },
    {
      merchant: 'Target',
      sku: 'BAMBOO_TOOTHBRUSH',
      amount: 5.25,
      category: 'personal_care',
    },
  ];

  return NextResponse.json({
    source: 'knot-mock',
    transactions: fakeTransactions,
  });
}