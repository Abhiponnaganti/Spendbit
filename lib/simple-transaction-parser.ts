import { PDFTransactionParser } from './pdf-transaction-parser';
import { TransactionCategorizer } from './transaction-categorizer';

export interface Transaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  source: string;
  originalAmount?: number; // Store original amount with sign
  confidence?: number; // Confidence in categorization
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

class SimpleTransactionParser {
  async parseFile(file: File): Promise<Transaction[]> {
    const fileName = file.name.toLowerCase();
    const fileType = file.type;

    try {
      // Validate file size (already checked in API but double-check here)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size too large. Maximum 10MB allowed.');
      }

      // Validate file is not empty
      if (file.size === 0) {
        throw new Error('File is empty. Please upload a file with transaction data.');
      }

      let transactions: Transaction[] = [];

      if (fileName.endsWith('.csv') || fileType === 'text/csv') {
        transactions = await this.parseCSV(file);
      } else if (fileName.endsWith('.txt') || fileType === 'text/plain') {
        transactions = await this.parseText(file);
      } else if (fileName.endsWith('.pdf') || fileType === 'application/pdf') {
        // For PDF, we'll try to extract as text first
        transactions = await this.parsePDF(file);
      } else {
        throw new Error('Unsupported file type. Please upload CSV, TXT, or PDF files.');
      }

      // Validate that we found some transactions
      if (transactions.length === 0) {
        throw new Error('No valid transactions found in the file. Please check the file format and content.');
      }

      return transactions;
    } catch (error) {
      console.error('Error parsing file:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to parse file');
    }
  }

  private async parseCSV(file: File): Promise<Transaction[]> {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) return [];

    const transactions: Transaction[] = [];
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
    
    // Find column indices
    const dateIndex = this.findColumnIndex(headers, ['date', 'transaction date', 'trans date']);
    const descIndex = this.findColumnIndex(headers, ['description', 'memo', 'details', 'transaction details']);
    const amountIndex = this.findColumnIndex(headers, ['amount', 'debit', 'credit', 'transaction amount']);

    for (let i = 1; i < lines.length; i++) {
      const columns = this.parseCSVLine(lines[i]);
      if (columns.length < 3) continue;

      try {
        const dateStr = columns[dateIndex] || columns[0];
        const description = columns[descIndex] || columns[1];
        const amountStr = columns[amountIndex] || columns[2];

        const transaction = this.createTransaction(dateStr, description, amountStr);
        if (transaction) {
          transactions.push(transaction);
        }
      } catch (error) {
        console.warn('Failed to parse CSV line:', lines[i], error);
        continue;
      }
    }

    return transactions;
  }

  private async parseText(file: File): Promise<Transaction[]> {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    const transactions: Transaction[] = [];

    for (const line of lines) {
      // Skip obvious header lines
      if (this.isHeaderLine(line)) continue;

      const transaction = this.parseTransactionLine(line);
      if (transaction) {
        transactions.push(transaction);
      }
    }

    return transactions;
  }

  private async parsePDF(file: File): Promise<Transaction[]> {
    console.log('Starting PDF parsing for file:', file.name);
    
    try {
      // Convert File to Buffer properly
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      console.log('PDF buffer created, size:', buffer.length);
      
      // Use the new PDF parser
      const pdfParser = new PDFTransactionParser();
      const transactions = await pdfParser.parsePDF(buffer);
      
      console.log('PDF parsing completed. Found', transactions.length, 'transactions');
      
      if (transactions.length === 0) {
        throw new Error('No valid transactions found in the PDF. Please check if this is a bank statement with transaction data.');
      }

      return transactions;
    } catch (error) {
      console.error('PDF parsing failed:', error);
      if (error instanceof Error) {
        throw new Error(`PDF parsing error: ${error.message}`);
      }
      throw new Error('Failed to parse PDF file. Please ensure it contains readable transaction data.');
    }
  }

  private findColumnIndex(headers: string[], possibleNames: string[]): number {
    for (const name of possibleNames) {
      const index = headers.findIndex(header => 
        header.includes(name) || name.includes(header)
      );
      if (index !== -1) return index;
    }
    return 0; // Default to first column
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result.map(cell => cell.replace(/^"|"$/g, ''));
  }

  private isHeaderLine(line: string): boolean {
    const lowerLine = line.toLowerCase();
    return (
      lowerLine.includes('date') && lowerLine.includes('amount') ||
      lowerLine.includes('transaction') && lowerLine.includes('balance') ||
      lowerLine.includes('account') && lowerLine.includes('statement') ||
      lowerLine.includes('beginning balance') ||
      lowerLine.includes('ending balance') ||
      !!lowerLine.match(/^\s*account\s*#/i) ||
      !!lowerLine.match(/^\s*statement\s*period/i)
    );
  }

  private parseTransactionLine(line: string): Transaction | null {
    // Common patterns for transaction lines
    const patterns = [
      // MM/DD/YYYY Description $Amount
      /(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+?)\s+\$?([+-]?\d+\.?\d*)/,
      // YYYY-MM-DD Description Amount
      /(\d{4}-\d{1,2}-\d{1,2})\s+(.+?)\s+([+-]?\d+\.?\d*)/,
      // DD/MM/YYYY Description Amount
      /(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+?)\s+([+-]?\d+\.?\d*)/,
      // Description Amount Date
      /(.+?)\s+([+-]?\d+\.?\d*)\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/,
      // More flexible pattern for various formats
      /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec).+?([+-]?\d+\.?\d{2})/i
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        try {
          let dateStr, description, amountStr;
          
          if (match.length >= 4) {
            [, dateStr, description, amountStr] = match;
          } else if (match.length === 3 && match[2]) {
            // Handle the flexible pattern
            dateStr = match[1];
            amountStr = match[2];
            description = line.replace(match[0], '').trim() || 'Transaction';
          } else {
            continue;
          }

          return this.createTransaction(dateStr, description, amountStr);
        } catch (error) {
          continue;
        }
      }
    }

    return null;
  }

  private createTransaction(dateStr: string, description: string, amountStr: string): Transaction | null {
    try {
      // Clean up the inputs
      dateStr = dateStr.trim();
      description = description.trim();
      amountStr = amountStr.replace(/[$,\s]/g, '').trim();

      // Parse date
      const date = this.parseDate(dateStr);
      if (!date || isNaN(date.getTime())) {
        console.warn('Invalid date:', dateStr);
        return null;
      }

      // Parse amount
      const originalAmount = parseFloat(amountStr);
      if (isNaN(originalAmount) || originalAmount === 0) {
        console.warn('Invalid amount:', amountStr);
        return null;
      }

      // Skip if description is too short or generic
      if (!description || description.length < 3) {
        console.warn('Invalid description:', description);
        return null;
      }

      // Clean description further
      description = this.cleanDescription(description);
      
      // Filter out non-spending transactions
      if (this.isNonSpendingTransaction(description)) {
        console.log('Skipping non-spending transaction:', description);
        return null;
      }

      // Determine transaction type based on amount and description context
      const transactionType = this.determineTransactionType(originalAmount, description);
      
      // Use enhanced categorizer
      const categorizer = TransactionCategorizer.getInstance();
      const category = categorizer.categorizeTransaction(description, Math.abs(originalAmount), transactionType);

      return {
        id: this.generateId(),
        date,
        description,
        amount: Math.abs(originalAmount),
        category,
        type: transactionType,
        source: 'upload',
        originalAmount,
        confidence: this.calculateConfidence(description, category)
      };
    } catch (error) {
      console.warn('Failed to create transaction:', { dateStr, description, amountStr }, error);
      return null;
    }
  }

  private parseDate(dateStr: string): Date | null {
    // Try various date formats
    const formats = [
      // MM/DD/YYYY or MM/DD/YY
      /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/,
      // YYYY-MM-DD
      /(\d{4})-(\d{1,2})-(\d{1,2})/,
      // DD/MM/YYYY
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        let year: number, month: number, day: number;
        
        if (format.source.includes('(\\d{4})')) {
          // YYYY-MM-DD format
          [, year, month, day] = match.map(Number);
        } else {
          // MM/DD/YYYY or DD/MM/YYYY
          const [, monthStr, dayStr, yearStr] = match;
          month = parseInt(monthStr);
          day = parseInt(dayStr);
          year = parseInt(yearStr);
          
          // Handle 2-digit years
          if (year < 100) {
            const currentYear = new Date().getFullYear();
            const century = Math.floor(currentYear / 100) * 100;
            year = (year > 50) ? century - 100 + year : century + year;
          }
        }

        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    // Try parsing as a standard date string
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  }

  private categorizeTransaction(description: string, isIncome: boolean): string {
    const desc = description.toLowerCase();
    
    if (isIncome) {
      if (desc.includes('salary') || desc.includes('payroll') || desc.includes('wage')) return 'Salary';
      if (desc.includes('freelance') || desc.includes('contract')) return 'Freelance';
      if (desc.includes('refund') || desc.includes('return')) return 'Refunds';
      if (desc.includes('dividend') || desc.includes('interest') || desc.includes('investment')) return 'Investment Returns';
      return 'Other Income';
    } else {
      // Expense categorization
      if (desc.includes('restaurant') || desc.includes('food') || desc.includes('cafe') || 
          desc.includes('pizza') || desc.includes('mcdonald') || desc.includes('starbucks') ||
          desc.includes('dining') || desc.includes('lunch') || desc.includes('dinner')) return 'Food & Dining';
      
      if (desc.includes('gas') || desc.includes('fuel') || desc.includes('uber') || 
          desc.includes('lyft') || desc.includes('taxi') || desc.includes('parking') ||
          desc.includes('metro') || desc.includes('bus')) return 'Transportation';
      
      if (desc.includes('grocery') || desc.includes('supermarket') || desc.includes('walmart') || 
          desc.includes('target') || desc.includes('amazon') || desc.includes('shopping') ||
          desc.includes('store')) return 'Shopping';
      
      if (desc.includes('electric') || desc.includes('water') || desc.includes('gas bill') || 
          desc.includes('internet') || desc.includes('phone') || desc.includes('utility') ||
          desc.includes('cable') || desc.includes('cell')) return 'Bills & Utilities';
      
      if (desc.includes('movie') || desc.includes('netflix') || desc.includes('spotify') || 
          desc.includes('entertainment') || desc.includes('game') || desc.includes('music')) return 'Entertainment';
      
      if (desc.includes('doctor') || desc.includes('hospital') || desc.includes('pharmacy') || 
          desc.includes('medical') || desc.includes('health') || desc.includes('dental')) return 'Healthcare';
      
      if (desc.includes('hotel') || desc.includes('flight') || desc.includes('airbnb') || 
          desc.includes('travel') || desc.includes('vacation') || desc.includes('airline')) return 'Travel';
      
      if (desc.includes('school') || desc.includes('university') || desc.includes('education') || 
          desc.includes('tuition') || desc.includes('books')) return 'Education';
      
      if (desc.includes('fee') || desc.includes('charge') || desc.includes('penalty') ||
          desc.includes('atm') || desc.includes('overdraft')) return 'Fees & Charges';
      
      return 'Other';
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private cleanDescription(description: string): string {
    // Remove extra whitespace and normalize
    description = description.replace(/\s+/g, ' ').trim();
    
    // Remove common prefixes that don't add value
    const prefixesToRemove = [
      /^POS\s+/i,
      /^ATM\s+/i,
      /^ACH\s+/i,
      /^CHECK\s+\d+\s+/i,
      /^DEBIT\s+/i,
      /^CREDIT\s+/i,
      /^ONLINE\s+/i,
      /^RECURRING\s+/i,
      /^\d{2}\/\d{2}\s+/,  // Remove date prefixes
      /^\*+\s*/,  // Remove asterisks
      /^-+\s*/   // Remove dashes
    ];
    
    for (const prefix of prefixesToRemove) {
      description = description.replace(prefix, '');
    }
    
    // Capitalize first letter of each word
    description = description.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    
    return description.trim();
  }

  private calculateConfidence(description: string, category: string): number {
    // Simple confidence calculation based on description quality and categorization
    let confidence = 0.5; // Base confidence
    
    // Higher confidence for longer, more descriptive text
    if (description.length > 10) confidence += 0.1;
    if (description.length > 20) confidence += 0.1;
    
    // Higher confidence if not in 'Other' category
    if (category !== 'Other' && category !== 'Other Income') {
      confidence += 0.2;
    }
    
    // Lower confidence for very generic descriptions
    const genericTerms = ['transaction', 'payment', 'purchase', 'debit', 'credit'];
    if (genericTerms.some(term => description.toLowerCase().includes(term))) {
      confidence -= 0.1;
    }
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }
  
  private isNonSpendingTransaction(description: string): boolean {
    const lowerDesc = description.toLowerCase().trim();
    
    // Keywords that indicate non-spending transactions
    const nonSpendingKeywords = [
      // Payment transactions (money coming in, not going out)
      'payment received',
      'payment from',
      'direct deposit',
      'salary',
      'payroll',
      'refund',
      'cashback',
      'reward',
      'credit adjustment',
      'interest earned',
      'dividend',
      
      // Internal transfers
      'transfer from',
      'balance transfer',
      'internal transfer',
      
      // Account management items
      'statement credit',
      'adjustment credit',
      'fee waiver',
      'promotional credit',
      
      // Summary lines and headers
      'total purchases',
      'total payments',
      'previous balance',
      'new balance',
      'minimum payment',
      'account summary'
    ];
    
    return nonSpendingKeywords.some(keyword => lowerDesc.includes(keyword));
  }
  
  private determineTransactionType(originalAmount: number, description: string): 'income' | 'expense' {
    const lowerDesc = description.toLowerCase();
    
    // Strong income indicators - payments TO you
    const strongIncomeKeywords = [
      'payment from', 'deposit from', 'transfer from', 'refund from', 'payment received',
      'direct deposit', 'salary', 'payroll', 'wage', 'bonus', 'commission',
      'dividend', 'interest earned', 'cashback', 'reward', 'freelance payment',
      'contract payment', 'invoice payment', 'reimbursement'
    ];
    
    // Moderate income indicators
    const moderateIncomeKeywords = [
      'refund', 'return', 'credit adjustment', 'promotional credit', 'statement credit',
      'fee waiver', 'adjustment credit', 'deposit', 'credit'
    ];
    
    // Strong expense indicators - payments FROM you
    const strongExpenseKeywords = [
      'payment to', 'transfer to', 'payment for', 'purchase at', 'purchase from',
      'bill payment', 'automatic payment', 'online payment', 'debit purchase',
      'pos purchase', 'atm withdrawal', 'check payment'
    ];
    
    // Check for strong income indicators first
    const hasStrongIncomeKeyword = strongIncomeKeywords.some(keyword => lowerDesc.includes(keyword));
    if (hasStrongIncomeKeyword) {
      return 'income';
    }
    
    // Check for strong expense indicators
    const hasStrongExpenseKeyword = strongExpenseKeywords.some(keyword => lowerDesc.includes(keyword));
    if (hasStrongExpenseKeyword) {
      return 'expense';
    }
    
    // For ambiguous cases, use amount and moderate keywords
    const hasModerateIncomeKeyword = moderateIncomeKeywords.some(keyword => lowerDesc.includes(keyword));
    
    // Positive amounts with income keywords are likely income
    if (originalAmount > 0 && hasModerateIncomeKeyword) {
      return 'income';
    }
    
    // Negative amounts are typically expenses (money going out)
    if (originalAmount < 0) {
      // Exception: negative amounts with strong refund indicators
      if (lowerDesc.includes('refund') || lowerDesc.includes('cashback') || lowerDesc.includes('return')) {
        return 'income';
      }
      return 'expense';
    }
    
    // Positive amounts without clear income indicators are likely expenses
    // (many bank statements show expenses as positive numbers)
    return 'expense';
  }
}

export default SimpleTransactionParser;
