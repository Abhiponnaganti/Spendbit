import { GoogleGenerativeAI } from '@google/generative-ai';
import { parse } from 'csv-parse/sync';
import { PDFTransactionParser } from './pdf-transaction-parser';

export interface Transaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  source: string;
}

export interface CategorySuggestion {
  category: string;
  confidence: number;
  subcategory?: string;
}

const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Shopping',
  'Transportation',
  'Bills & Utilities',
  'Entertainment',
  'Healthcare',
  'Travel',
  'Education',
  'Business',
  'Personal Care',
  'Home & Garden',
  'Gifts & Donations',
  'Fees & Charges',
  'Other'
];

const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Business Income',
  'Investment Returns',
  'Rental Income',
  'Refunds',
  'Other Income'
];

class TransactionParser {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    if (process.env.GOOGLE_AI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    }
  }

  async parseFile(file: File): Promise<Transaction[]> {
    const fileType = file.type;
    const fileName = file.name;

    try {
      if (fileType === 'text/csv' || fileName.endsWith('.csv')) {
        return await this.parseCSV(file);
      } else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
        return await this.parsePDF(file);
      } else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
        return await this.parseText(file);
      } else {
        throw new Error('Unsupported file type. Please upload CSV, PDF, or TXT files.');
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      throw new Error('Failed to parse the uploaded file. Please check the format and try again.');
    }
  }

  private async parseCSV(file: File): Promise<Transaction[]> {
    const text = await file.text();
    const records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    const transactions: Transaction[] = [];

    for (const record of records) {
      const transaction = await this.extractTransactionFromRecord(record);
      if (transaction) {
        transactions.push(transaction);
      }
    }

    return transactions;
  }

  private async parsePDF(file: File): Promise<Transaction[]> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      const pdfParser = new PDFTransactionParser();
      const transactions = await pdfParser.parsePDF(buffer);
      
      if (transactions.length === 0) {
        console.warn('No transactions found in the parsed PDF content. Check the PDF format.');
      }

      return transactions;
    } catch (error) {
      console.error('Error parsing PDF:', error);
      throw new Error('Error parsing PDF file');
    }
  }

  private async parseText(file: File): Promise<Transaction[]> {
    const text = await file.text();
    return await this.parseTextContent(text);
  }

  private async parseTextContent(text: string): Promise<Transaction[]> {
    // Try AI parsing if available, otherwise use fallback
    if (this.genAI) {
      try {
        return await this.parseTextWithAI(text);
      } catch (error) {
        console.warn('AI parsing failed, using fallback:', error);
        return this.parseTextWithFallback(text);
      }
    } else {
      return this.parseTextWithFallback(text);
    }
  }

  private async parseTextWithAI(text: string): Promise<Transaction[]> {
    if (!this.genAI) throw new Error('AI not available');
    
    const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `
    Analyze this bank statement text and extract all transactions. Return a JSON array of transactions with the following structure:
    [
      {
        "date": "YYYY-MM-DD",
        "description": "transaction description",
        "amount": number (positive for income, negative for expenses),
        "rawText": "original line from statement"
      }
    ]

    Bank statement text:
    ${text}

    Extract only actual transactions, ignore headers, footers, and account summaries. Return valid JSON only.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonText = response.text().replace(/```json\n?/, '').replace(/```\n?$/, '');
    const parsedTransactions = JSON.parse(jsonText);

    const transactions: Transaction[] = [];
    for (const txn of parsedTransactions) {
      const categorized = await this.categorizeTransaction(txn.description, txn.amount);
      transactions.push({
        id: this.generateId(),
        date: new Date(txn.date),
        description: txn.description,
        amount: Math.abs(txn.amount),
        category: categorized.category,
        type: txn.amount >= 0 ? 'income' : 'expense',
        source: 'upload'
      });
    }

    return transactions;
  }

  private parseTextWithFallback(text: string): Transaction[] {
    // Simple fallback parser for basic text formats
    const lines = text.split('\n').filter(line => line.trim());
    const transactions: Transaction[] = [];
    
    for (const line of lines) {
      // Skip headers and common non-transaction lines
      if (line.toLowerCase().includes('date') && line.toLowerCase().includes('amount')) continue;
      if (line.toLowerCase().includes('balance') && !line.match(/\d+\.\d{2}/)) continue;
      if (line.toLowerCase().includes('statement') || line.toLowerCase().includes('account')) continue;
      
      // Try to extract transaction data using regex patterns
      const transaction = this.extractTransactionFromLine(line);
      if (transaction) {
        transactions.push(transaction);
      }
    }
    
    return transactions;
  }

  private extractTransactionFromLine(line: string): Transaction | null {
    // Common patterns for transaction lines
    const patterns = [
      // Date, Description, Amount (MM/DD/YYYY Description $Amount)
      /([0-1]?\d\/[0-3]?\d\/\d{2,4})\s+(.+?)\s+\$?([+-]?\d+\.\d{2})/,
      // Date, Description, Amount (YYYY-MM-DD Description Amount)
      /(\d{4}-[0-1]?\d-[0-3]?\d)\s+(.+?)\s+([+-]?\d+\.\d{2})/,
      // Description Amount Date
      /(.+?)\s+\$?([+-]?\d+\.\d{2})\s+([0-1]?\d\/[0-3]?\d\/\d{2,4})/
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        try {
          const [, dateStr, description, amountStr] = match;
          const amount = parseFloat(amountStr);
          const date = new Date(dateStr);
          
          if (isNaN(amount) || isNaN(date.getTime())) continue;
          
          const category = this.basicCategorization(description);
          
          return {
            id: this.generateId(),
            date,
            description: description.trim(),
            amount: Math.abs(amount),
            category,
            type: amount >= 0 ? 'income' : 'expense',
            source: 'upload'
          };
        } catch (error) {
          continue;
        }
      }
    }
    
    return null;
  }

  private async extractTransactionFromRecord(record: any): Promise<Transaction | null> {
    // Try to identify date, description, and amount columns
    const dateKeys = ['date', 'Date', 'DATE', 'transaction_date', 'Transaction Date'];
    const descKeys = ['description', 'Description', 'DESCRIPTION', 'memo', 'Memo', 'details', 'Details'];
    const amountKeys = ['amount', 'Amount', 'AMOUNT', 'debit', 'credit', 'Debit', 'Credit'];

    let date: string = '';
    let description: string = '';
    let amount: number = 0;

    // Find date
    for (const key of dateKeys) {
      if (record[key]) {
        date = record[key];
        break;
      }
    }

    // Find description
    for (const key of descKeys) {
      if (record[key]) {
        description = record[key];
        break;
      }
    }

    // Find amount
    for (const key of amountKeys) {
      if (record[key]) {
        const amountStr = record[key].toString().replace(/[$,]/g, '');
        amount = parseFloat(amountStr);
        break;
      }
    }

    if (!date || !description || isNaN(amount)) {
      return null;
    }

    const categorized = await this.categorizeTransaction(description, amount);

    return {
      id: this.generateId(),
      date: new Date(date),
      description,
      amount: Math.abs(amount),
      category: categorized.category,
      type: amount >= 0 ? 'income' : 'expense',
      source: 'upload'
    };
  }

  async categorizeTransaction(description: string, amount: number): Promise<CategorySuggestion> {
    // Try AI categorization if available, otherwise use basic categorization
    if (this.genAI) {
      try {
        return await this.categorizeWithAI(description, amount);
      } catch (error) {
        console.warn('AI categorization failed, using basic categorization:', error);
        return {
          category: this.basicCategorization(description, amount >= 0),
          confidence: 0.6
        };
      }
    } else {
      return {
        category: this.basicCategorization(description, amount >= 0),
        confidence: 0.6
      };
    }
  }

  private async categorizeWithAI(description: string, amount: number): Promise<CategorySuggestion> {
    if (!this.genAI) throw new Error('AI not available');
    
    const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    const categories = amount >= 0 ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const type = amount >= 0 ? 'income' : 'expense';

    const prompt = `
    Categorize this ${type} transaction: "${description}"
    
    Available categories: ${categories.join(', ')}
    
    Return only the most appropriate category name from the list above. Be specific and accurate.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const category = response.text().trim();

    // Validate the category is in our list
    const validCategory = categories.find(cat => 
      cat.toLowerCase() === category.toLowerCase()
    ) || (amount >= 0 ? 'Other Income' : 'Other');

    return {
      category: validCategory,
      confidence: 0.8
    };
  }

  private basicCategorization(description: string, isIncome: boolean = false): string {
    const desc = description.toLowerCase();
    
    if (isIncome) {
      if (desc.includes('salary') || desc.includes('payroll') || desc.includes('wage')) return 'Salary';
      if (desc.includes('freelance') || desc.includes('contract')) return 'Freelance';
      if (desc.includes('refund') || desc.includes('return')) return 'Refunds';
      if (desc.includes('dividend') || desc.includes('interest') || desc.includes('investment')) return 'Investment Returns';
      return 'Other Income';
    } else {
      // Expense categorization
      if (desc.includes('restaurant') || desc.includes('food') || desc.includes('cafe') || desc.includes('pizza') || desc.includes('mcdonald') || desc.includes('starbucks')) return 'Food & Dining';
      if (desc.includes('gas') || desc.includes('fuel') || desc.includes('uber') || desc.includes('lyft') || desc.includes('taxi') || desc.includes('parking')) return 'Transportation';
      if (desc.includes('grocery') || desc.includes('supermarket') || desc.includes('walmart') || desc.includes('target') || desc.includes('amazon')) return 'Shopping';
      if (desc.includes('electric') || desc.includes('water') || desc.includes('gas bill') || desc.includes('internet') || desc.includes('phone') || desc.includes('utility')) return 'Bills & Utilities';
      if (desc.includes('movie') || desc.includes('netflix') || desc.includes('spotify') || desc.includes('entertainment') || desc.includes('game')) return 'Entertainment';
      if (desc.includes('doctor') || desc.includes('hospital') || desc.includes('pharmacy') || desc.includes('medical') || desc.includes('health')) return 'Healthcare';
      if (desc.includes('hotel') || desc.includes('flight') || desc.includes('airbnb') || desc.includes('travel') || desc.includes('vacation')) return 'Travel';
      if (desc.includes('school') || desc.includes('university') || desc.includes('education') || desc.includes('tuition')) return 'Education';
      if (desc.includes('fee') || desc.includes('charge') || desc.includes('penalty')) return 'Fees & Charges';
      return 'Other';
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

export default TransactionParser;
