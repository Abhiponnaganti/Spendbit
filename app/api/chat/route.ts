import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, financialData } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!process.env.GOOGLE_AI_API_KEY) {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Create context from financial data
    const contextPrompt = createFinancialContext(financialData);

    const fullPrompt = `
${contextPrompt}

User Question: ${message}

Please provide helpful, accurate financial advice based on the user's actual transaction data shown above. Be specific and reference their actual spending patterns, categories, and amounts when relevant. Keep your response conversational and practical.

If the user asks about specific transactions, categories, or amounts, use the exact data provided. If you need to make calculations, show your work.
`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({
      success: true,
      response: text,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process your message',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function createFinancialContext(financialData: any): string {
  if (!financialData) {
    return "The user hasn't uploaded any financial data yet. Provide general financial advice and suggest they upload their bank statements to get personalized insights.";
  }

  const {
    totalIncome,
    totalExpenses,
    netIncome,
    monthlyIncome,
    monthlyExpenses,
    topCategories,
    recentTransactions,
    monthlyTrends
  } = financialData;

  let context = `
FINANCIAL CONTEXT FOR USER:

OVERALL FINANCIAL SUMMARY:
- Total Income: $${totalIncome?.toFixed(2) || '0.00'}
- Total Expenses: $${totalExpenses?.toFixed(2) || '0.00'}
- Net Income: $${netIncome?.toFixed(2) || '0.00'}
- Current Month Income: $${monthlyIncome?.toFixed(2) || '0.00'}
- Current Month Expenses: $${monthlyExpenses?.toFixed(2) || '0.00'}

TOP SPENDING CATEGORIES:`;

  if (topCategories && topCategories.length > 0) {
    topCategories.forEach((cat: any, i: number) => {
      context += `\n${i + 1}. ${cat.category}: $${cat.amount.toFixed(2)} (${cat.percentage.toFixed(1)}% of total expenses, ${cat.count} transactions)`;
    });
  } else {
    context += '\nNo spending categories available yet.';
  }

  context += '\n\nRECENT TRANSACTIONS:';
  if (recentTransactions && recentTransactions.length > 0) {
    recentTransactions.slice(0, 10).forEach((txn: any, i: number) => {
      const date = new Date(txn.date).toLocaleDateString();
      context += `\n${i + 1}. ${date}: ${txn.description} - $${txn.amount.toFixed(2)} (${txn.category})`;
    });
  } else {
    context += '\nNo recent transactions available.';
  }

  context += '\n\nMONTHLY TRENDS (Last 6 months):';
  if (monthlyTrends && monthlyTrends.length > 0) {
    monthlyTrends.forEach((trend: any) => {
      context += `\n${trend.month}: Income $${trend.income.toFixed(2)}, Expenses $${trend.expenses.toFixed(2)}, Net $${trend.net.toFixed(2)}`;
    });
  } else {
    context += '\nNo monthly trend data available.';
  }

  return context;
}

export async function GET() {
  return NextResponse.json({
    message: 'Gemini AI Chat endpoint ready',
    capabilities: [
      'Financial advice based on your transaction data',
      'Spending pattern analysis',
      'Budget recommendations',
      'Category-specific insights',
      'Monthly trend analysis'
    ]
  });
}
