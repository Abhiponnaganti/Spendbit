import { Transaction } from './simple-transaction-parser';
import { TransactionCategorizer } from './transaction-categorizer';

export interface CategorySummary {
  category: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface MonthlyTrend {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  totalSpending: number; // All expense transactions including returns
  netIncome: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  lastMonthExpenses: number;
  debitCardBalance: number; // Manual balance - not affected by transactions
  thisMonthSpending: number; // Current month 1st to now (current date)
  lastMonthSpending: number; // Previous month 1st to last day
  creditCardBalance: number; // Total between 19th of one month to 19th of next month
  topCategories: CategorySummary[];
  monthlyTrends: MonthlyTrend[];
}

class TransactionStore {
  private static instance: TransactionStore;
  private transactions: Transaction[] = [];
  private debitCardBalance: number = 0;
  private listeners: Array<() => void> = [];

  static getInstance(): TransactionStore {
    if (!TransactionStore.instance) {
      TransactionStore.instance = new TransactionStore();
    }
    return TransactionStore.instance;
  }

  addTransactions(newTransactions: Transaction[]): void {
    const categorizer = TransactionCategorizer.getInstance();
    const validTransactions: Transaction[] = [];
    
    for (const transaction of newTransactions) {
      // Re-categorize with the enhanced categorizer
      const category = categorizer.categorizeTransaction(transaction.description, transaction.amount, transaction.type);
      transaction.category = category;
      
      // Check for duplicates before adding
      if (!this.isDuplicateTransaction(transaction)) {
        validTransactions.push(transaction);
      } else {
        console.log('Skipping duplicate transaction:', transaction.description, transaction.amount);
      }
    }

    if (validTransactions.length > 0) {
      this.transactions.push(...validTransactions);
      console.log(`Added ${validTransactions.length} new transactions (${newTransactions.length - validTransactions.length} duplicates skipped)`);
      this.saveToLocalStorage();
      this.notifyListeners();
    } else {
      console.log('No new transactions to add - all were duplicates');
    }
  }

  getAllTransactions(): Transaction[] {
    return [...this.transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  getTransactionsByDateRange(startDate: Date, endDate: Date): Transaction[] {
    return this.transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate >= startDate && transactionDate <= endDate;
    });
  }

  getTransactionsByCategory(category: string): Transaction[] {
    return this.transactions.filter(t => t.category === category);
  }

  getTransactionsByType(type: 'income' | 'expense'): Transaction[] {
    return this.transactions.filter(t => t.type === type);
  }

  deleteTransaction(id: string): void {
    this.transactions = this.transactions.filter(t => t.id !== id);
    this.saveToLocalStorage();
    this.notifyListeners();
  }

  updateTransaction(id: string, updates: Partial<Transaction>): void {
    const index = this.transactions.findIndex(t => t.id === id);
    if (index !== -1) {
      this.transactions[index] = { ...this.transactions[index], ...updates };
      this.saveToLocalStorage();
      this.notifyListeners();
    }
  }

  getFinancialSummary(): FinancialSummary {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    // Get last month's transactions for "Last Month Spending"
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const currentMonthTransactions = this.getTransactionsByDateRange(currentMonthStart, currentMonthEnd);
    const lastMonthTransactions = this.getTransactionsByDateRange(lastMonthStart, lastMonthEnd);

    // Calculate this month's spending
    const thisMonthSpending = currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate last month's spending
    const lastMonthSpending = lastMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate credit card balance for the cycle between the 19th of one month to the 19th of the next
    const cycleStart = new Date(now.getFullYear(), now.getMonth() - 1, 19);
    const cycleEnd = new Date(now.getFullYear(), now.getMonth(), 19);
    const cycleTransactions = this.getTransactionsByDateRange(cycleStart, cycleEnd);
    const creditCardBalance = cycleTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const actualExpenses = this.transactions.filter(t => 
      t.type === 'expense' && !this.isCreditCardPayment(t.description)
    );
    const returns = this.transactions.filter(t => 
      t.type === 'income' && this.isReturnOrRefund(t.description)
    );
    const otherIncome = this.transactions.filter(t => 
      t.type === 'income' && !this.isReturnOrRefund(t.description)
    );

    const totalExpenses = actualExpenses.reduce((sum, t) => sum + t.amount, 0);
    const totalReturns = returns.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = otherIncome.reduce((sum, t) => sum + t.amount, 0);
    
    // Total spending includes both expenses and returns (the absolute amounts)
    const totalSpending = totalExpenses + totalReturns;

    // Current month income/expenses for trending
    const monthlyIncome = currentMonthTransactions
      .filter(t => t.type === 'income' && !this.isReturnOrRefund(t.description))
      .reduce((sum, t) => sum + t.amount, 0);

    // Last month ACTUAL spending (excluding credit card payments, including returns as negative)
    const lastMonthActualExpenses = lastMonthTransactions
      .filter(t => t.type === 'expense' && !this.isCreditCardPayment(t.description))
      .reduce((sum, t) => sum + t.amount, 0);
    
    const lastMonthReturns = lastMonthTransactions
      .filter(t => t.type === 'income' && this.isReturnOrRefund(t.description))
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Net spending = expenses - returns (this should be 375.20 based on your example)
    const lastMonthExpenses = lastMonthActualExpenses - lastMonthReturns;
      
    const monthlyExpenses = currentMonthTransactions
      .filter(t => t.type === 'expense' && !this.isCreditCardPayment(t.description))
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate top categories (using actual expenses, not including credit card payments)
    const categoryTotals = new Map<string, { amount: number; count: number }>();
    
    actualExpenses.forEach(transaction => {
      const existing = categoryTotals.get(transaction.category) || { amount: 0, count: 0 };
      categoryTotals.set(transaction.category, {
        amount: existing.amount + transaction.amount,
        count: existing.count + 1
      });
    });

    const topCategories = Array.from(categoryTotals.entries())
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Calculate monthly trends (last 6 months)
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthTransactions = this.getTransactionsByDateRange(monthStart, monthEnd);

      const monthIncome = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const monthExpenses = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      monthlyTrends.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        income: monthIncome,
        expenses: monthExpenses,
        net: monthIncome - monthExpenses
      });
    }

    return {
      totalIncome,
      totalExpenses: totalExpenses - totalReturns, // Net expenses after returns
      totalSpending, // All expense and return transactions
      netIncome: totalIncome - (totalExpenses - totalReturns),
      monthlyIncome,
      monthlyExpenses,
      lastMonthExpenses, // This is the corrected net spending amount
      debitCardBalance: this.debitCardBalance,
      topCategories,
      monthlyTrends,
      thisMonthSpending,
      lastMonthSpending,
      creditCardBalance
    };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  private saveToLocalStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const data = {
          transactions: this.transactions.map(t => ({
            ...t,
            date: typeof t.date === 'string' ? t.date : new Date(t.date).toISOString()
          })),
          debitCardBalance: this.debitCardBalance
        };
        localStorage.setItem('financeTracker_transactions', JSON.stringify(data));
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
    }
  }

  loadFromLocalStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('financeTracker_transactions');
        if (stored) {
          const data = JSON.parse(stored);
          this.transactions = data.transactions ? data.transactions.map((t: any) => ({
            ...t,
            date: new Date(t.date)
          })) : [];
          this.debitCardBalance = data.debitCardBalance || 0;
          this.notifyListeners();
        }
      } catch (error) {
        console.error('Error loading from localStorage:', error);
      }
    }
  }

  // Debit card balance methods
  setDebitCardBalance(balance: number): void {
    this.debitCardBalance = balance;
    this.saveToLocalStorage();
    this.notifyListeners();
  }

  getDebitCardBalance(): number {
    return this.debitCardBalance;
  }

  // Manual transaction creation
  addManualTransaction(transaction: Omit<Transaction, 'id' | 'source'>): void {
    const newTransaction: Transaction = {
      ...transaction,
      id: this.generateId(),
      source: 'manual'
    };

    const categorizer = TransactionCategorizer.getInstance();
    const category = categorizer.categorizeTransaction(newTransaction.description, newTransaction.amount, newTransaction.type);
    newTransaction.category = category;
    
    this.transactions.push(newTransaction);
    this.saveToLocalStorage();
    this.notifyListeners();
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
  
  private isDuplicateTransaction(newTransaction: Transaction): boolean {
    const dateThreshold = 24 * 60 * 60 * 1000; // 1 day in milliseconds
    const amountThreshold = 0.01; // $0.01 difference allowed
    
    return this.transactions.some(existing => {
      // Check if dates are within 1 day of each other
      const dateDiff = Math.abs(new Date(existing.date).getTime() - new Date(newTransaction.date).getTime());
      if (dateDiff > dateThreshold) return false;
      
      // Check if amounts are very close (within $0.01)
      const amountDiff = Math.abs(existing.amount - newTransaction.amount);
      if (amountDiff > amountThreshold) return false;
      
      // Check if descriptions are similar (fuzzy matching)
      const similarity = this.calculateDescriptionSimilarity(existing.description, newTransaction.description);
      if (similarity < 0.8) return false; // 80% similarity threshold
      
      // Check if transaction types match
      if (existing.type !== newTransaction.type) return false;
      
      return true; // This is likely a duplicate
    });
  }
  
  // Get actual spending (excluding payments received and internal transfers)
  getActualSpending(startDate?: Date, endDate?: Date): number {
    let filteredTransactions = this.transactions.filter(t => t.type === 'expense');
    
    if (startDate && endDate) {
      filteredTransactions = filteredTransactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= startDate && transactionDate <= endDate;
      });
    }
    
    // Filter out payments received (which might be incorrectly categorized as expenses)
    const actualExpenses = filteredTransactions.filter(t => {
      const desc = t.description.toLowerCase();
      
      // Skip transactions that are actually payments TO you
      const isPaymentToYou = desc.includes('payment from') || 
                             desc.includes('chk 9192') ||
                             desc.includes('conf#9lucgw20z') ||
                             desc.includes('direct deposit') ||
                             desc.includes('salary') ||
                             desc.includes('payroll') ||
                             desc.includes('refund received') ||
                             desc.includes('cashback') ||
                             desc.includes('transfer from');
      
      return !isPaymentToYou;
    });
    
    return actualExpenses.reduce((sum, t) => sum + t.amount, 0);
  }
  
  private calculateDescriptionSimilarity(desc1: string, desc2: string): number {
    // Normalize descriptions for comparison
    const normalize = (str: string) => {
      return str.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // Remove special characters
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    };
    
    const normalized1 = normalize(desc1);
    const normalized2 = normalize(desc2);
    
    // Exact match
    if (normalized1 === normalized2) return 1.0;
    
    // Calculate word overlap similarity
    const words1 = normalized1.split(' ').filter(w => w.length > 2);
    const words2 = normalized2.split(' ').filter(w => w.length > 2);
    
    if (words1.length === 0 && words2.length === 0) return 1.0;
    if (words1.length === 0 || words2.length === 0) return 0.0;
    
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]).size;
    
    return commonWords.length / totalWords;
  }

  // Helper method to identify credit card payments (money going TO credit card company)
  private isCreditCardPayment(description: string): boolean {
    const lowerDesc = description.toLowerCase();
    return lowerDesc.includes('payment from chk') ||
           lowerDesc.includes('conf#') ||
           lowerDesc.includes('chk 9192') ||
           lowerDesc.includes('online payment') ||
           lowerDesc.includes('autopay') ||
           lowerDesc.includes('payment - thank you') ||
           lowerDesc.includes('payment thank you') ||
           lowerDesc.includes('electronic payment') ||
           lowerDesc.includes('bill payment');
  }

  // Helper method to identify returns/refunds (money coming back from merchants)
  private isReturnOrRefund(description: string): boolean {
    const lowerDesc = description.toLowerCase();
    return lowerDesc.includes('refund') ||
           lowerDesc.includes('return') ||
           lowerDesc.includes('credit memo') ||
           lowerDesc.includes('credit adjustment') ||
           lowerDesc.includes('cashback') ||
           lowerDesc.includes('cash back') ||
           lowerDesc.includes('reward') ||
           lowerDesc.includes('rebate') ||
           lowerDesc.includes('reversal') ||
           lowerDesc.includes('void') ||
           lowerDesc.includes('chargeback') ||
           lowerDesc.includes('dispute credit') ||
           lowerDesc.includes('promotional credit') ||
           lowerDesc.includes('statement credit') ||
           lowerDesc.includes('merchant credit') ||
           lowerDesc.includes('store credit') ||
           lowerDesc.includes('purchase return');
  }

  clearAll(): void {
    this.transactions = [];
    this.debitCardBalance = 0;
    this.saveToLocalStorage();
    this.notifyListeners();
  }
}

export default TransactionStore;
