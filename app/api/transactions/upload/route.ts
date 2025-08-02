import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Import parser dynamically to avoid SSR issues
let SimpleTransactionParser: any = null;

export async function POST(request: NextRequest) {
  console.log('=== Upload API Called ===');
  
  try {
    // Check session first
    const session = await getServerSession(authOptions);
    console.log('Session check:', session ? 'Authenticated' : 'Not authenticated');
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    console.log('File received:', file ? file.name : 'No file');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size too large. Maximum 10MB allowed.' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'text/csv',
      'application/pdf',
      'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    const allowedExtensions = ['.csv', '.pdf', '.txt', '.xls', '.xlsx'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    console.log('File type:', file.type, 'Extension:', fileExtension);

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload CSV, PDF, or TXT files.' },
        { status: 400 }
      );
    }

    // Import parser dynamically
    if (!SimpleTransactionParser) {
      const { default: Parser } = await import('@/lib/simple-transaction-parser');
      SimpleTransactionParser = Parser;
    }

    console.log('Starting file parsing...');
    const parser = new SimpleTransactionParser();
    const transactions = await parser.parseFile(file);
    console.log('Parsing completed. Transactions found:', transactions.length);

    return NextResponse.json({
      success: true,
      transactions,
      count: transactions.length,
      message: `Successfully parsed ${transactions.length} transactions from ${file.name}`
    });

  } catch (error) {
    console.error('=== Upload API Error ===');
    console.error('Error details:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to process file';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: 'Please check your file format and content, then try again.',
        debug: process.env.NODE_ENV === 'development' ? {
          message: errorMessage,
          stack: error instanceof Error ? error.stack : undefined
        } : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { 
      message: 'Upload endpoint ready',
      supportedFormats: ['CSV', 'PDF', 'TXT'],
      maxFileSize: '10MB'
    }
  );
}
