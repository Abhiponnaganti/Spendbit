export interface CategoryRule {
  keywords: string[];
  category: string;
  priority: number;
  type?: 'income' | 'expense';
}

export class TransactionCategorizer {
  private static instance: TransactionCategorizer;
  
  private expenseRules: CategoryRule[] = [
    // Food & Dining - High Priority
    {
      keywords: [
        'restaurant', 'cafe', 'coffee', 'pizza', 'burger', 'taco', 'sushi', 'deli',
        'mcdonald', 'burger king', 'kfc', 'subway', 'chipotle', 'panera', 'starbucks',
        'dunkin', 'dominos', 'papa john', 'taco bell', 'wendy', 'chick-fil-a',
        'olive garden', 'applebee', 'chili', 'outback', 'red lobster', 'ihop',
        'denny', 'food truck', 'dining', 'lunch', 'dinner', 'breakfast', 'brunch',
        'takeout', 'delivery', 'uber eats', 'doordash', 'grubhub', 'postmates',
        'bistro', 'grill', 'pub', 'bar', 'tavern', 'bakery', 'ice cream', 'yogurt'
      ],
      category: 'Food & Dining',
      priority: 9,
      type: 'expense'
    },
    
    // Transportation - High Priority
    {
      keywords: [
        'gas', 'fuel', 'gasoline', 'shell', 'exxon', 'bp', 'chevron', 'mobil',
        'uber', 'lyft', 'taxi', 'cab', 'parking', 'park', 'metro', 'bus', 'train',
        'subway', 'transit', 'toll', 'bridge', 'rental car', 'car rental',
        'hertz', 'enterprise', 'avis', 'budget', 'airline', 'flight', 'airport',
        'delta', 'american airlines', 'united', 'southwest', 'jetblue',
        'auto repair', 'mechanic', 'oil change', 'tire', 'car wash', 'inspection'
      ],
      category: 'Transportation',
      priority: 9,
      type: 'expense'
    },
    
    // Shopping - High Priority
    {
      keywords: [
        'amazon', 'walmart', 'target', 'costco', 'sam club', 'bj wholesale',
        'grocery', 'supermarket', 'safeway', 'kroger', 'publix', 'whole foods',
        'trader joe', 'aldi', 'food lion', 'giant', 'stop shop', 'wegmans',
        'shopping', 'store', 'mall', 'outlet', 'department store', 'retail',
        'macy', 'nordstrom', 'sears', 'jcpenney', 'kohl', 'tj maxx', 'marshall',
        'best buy', 'home depot', 'lowe', 'menards', 'ace hardware',
        'pharmacy', 'cvs', 'walgreens', 'rite aid', 'drugstore'
      ],
      category: 'Shopping',
      priority: 8,
      type: 'expense'
    },
    
    // Bills & Utilities - High Priority
    {
      keywords: [
        'electric', 'electricity', 'power', 'utility', 'water', 'sewer',
        'gas bill', 'natural gas', 'internet', 'cable', 'phone', 'cell',
        'mobile', 'verizon', 'att', 't-mobile', 'sprint', 'comcast', 'xfinity',
        'spectrum', 'cox', 'directv', 'dish', 'satellite', 'broadband',
        'insurance', 'auto insurance', 'car insurance', 'home insurance',
        'health insurance', 'life insurance', 'geico', 'state farm',
        'allstate', 'progressive', 'usaa', 'liberty mutual'
      ],
      category: 'Bills & Utilities',
      priority: 9,
      type: 'expense'
    },
    
    // Entertainment - Medium Priority
    {
      keywords: [
        'netflix', 'hulu', 'disney', 'amazon prime', 'spotify', 'apple music',
        'youtube', 'movie', 'theater', 'cinema', 'amc', 'regal', 'concert',
        'ticketmaster', 'stubhub', 'game', 'gaming', 'steam', 'playstation',
        'xbox', 'nintendo', 'entertainment', 'music', 'streaming', 'subscription',
        'gym', 'fitness', 'planet fitness', 'la fitness', '24 hour fitness',
        'ymca', 'crossfit', 'yoga', 'pilates', 'spa', 'massage'
      ],
      category: 'Entertainment',
      priority: 7,
      type: 'expense'
    },
    
    // Healthcare - High Priority
    {
      keywords: [
        'doctor', 'physician', 'hospital', 'clinic', 'medical', 'health',
        'dental', 'dentist', 'orthodontist', 'vision', 'optometrist',
        'prescription', 'pharmacy', 'medicine', 'drug', 'co-pay', 'copay',
        'deductible', 'lab', 'x-ray', 'mri', 'ct scan', 'surgery',
        'emergency room', 'urgent care', 'physical therapy', 'chiropractor',
        'mental health', 'therapy', 'counseling', 'psychiatrist'
      ],
      category: 'Healthcare',
      priority: 8,
      type: 'expense'
    },
    
    // Travel - Medium Priority
    {
      keywords: [
        'hotel', 'motel', 'resort', 'inn', 'lodge', 'airbnb', 'vrbo',
        'marriott', 'hilton', 'hyatt', 'sheraton', 'holiday inn',
        'travel', 'vacation', 'trip', 'booking', 'expedia', 'kayak',
        'priceline', 'orbitz', 'travelocity', 'cruise', 'carnival',
        'royal caribbean', 'norwegian', 'disney cruise'
      ],
      category: 'Travel',
      priority: 7,
      type: 'expense'
    },
    
    // Education - Medium Priority
    {
      keywords: [
        'school', 'university', 'college', 'tuition', 'education',
        'student loan', 'books', 'textbook', 'supplies', 'course',
        'class', 'training', 'certification', 'workshop', 'seminar',
        'online course', 'udemy', 'coursera', 'masterclass'
      ],
      category: 'Education',
      priority: 7,
      type: 'expense'
    },
    
    // Personal Care - Medium Priority
    {
      keywords: [
        'haircut', 'salon', 'barber', 'nail', 'manicure', 'pedicure',
        'beauty', 'cosmetics', 'makeup', 'skincare', 'personal care',
        'dry cleaning', 'laundry', 'tailor', 'alteration'
      ],
      category: 'Personal Care',
      priority: 6,
      type: 'expense'
    },
    
    // Home & Garden - Medium Priority
    {
      keywords: [
        'home improvement', 'furniture', 'appliance', 'garden', 'lawn',
        'landscaping', 'hardware', 'paint', 'tools', 'renovation',
        'repair', 'maintenance', 'cleaning', 'pest control', 'security',
        'rent', 'mortgage', 'property tax', 'hoa', 'homeowners association'
      ],
      category: 'Home & Garden',
      priority: 6,
      type: 'expense'
    },
    
    // Fees & Charges - High Priority
    {
      keywords: [
        'fee', 'charge', 'penalty', 'fine', 'atm', 'overdraft', 'nsf',
        'maintenance', 'service charge', 'late fee', 'interest charge',
        'annual fee', 'monthly fee', 'transaction fee', 'foreign transaction',
        'cash advance', 'balance transfer', 'wire fee', 'stop payment'
      ],
      category: 'Fees & Charges',
      priority: 10,
      type: 'expense'
    },
    
    // Business - Medium Priority
    {
      keywords: [
        'office', 'supplies', 'business', 'conference', 'meeting',
        'software', 'subscription', 'professional', 'consulting',
        'accounting', 'legal', 'marketing', 'advertising', 'printing'
      ],
      category: 'Business',
      priority: 6,
      type: 'expense'
    },
    
    // Gifts & Donations - Low Priority
    {
      keywords: [
        'gift', 'present', 'donation', 'charity', 'nonprofit',
        'church', 'religious', 'contribution', 'fundraiser',
        'wedding', 'birthday', 'anniversary', 'holiday'
      ],
      category: 'Gifts & Donations',
      priority: 5,
      type: 'expense'
    }
  ];
  
  private incomeRules: CategoryRule[] = [
    // Salary - High Priority
    {
      keywords: [
        'salary', 'payroll', 'wage', 'pay', 'direct deposit', 'dd',
        'employer', 'work', 'job', 'income', 'earnings', 'compensation',
        'bonus', 'commission', 'overtime', 'tips', 'gratuity'
      ],
      category: 'Salary',
      priority: 10,
      type: 'income'
    },
    
    // Freelance - High Priority
    {
      keywords: [
        'freelance', 'contract', 'consulting', 'gig', 'project',
        'client', 'invoice', 'payment', 'professional services',
        'independent contractor', '1099', 'self employed'
      ],
      category: 'Freelance',
      priority: 9,
      type: 'income'
    },
    
    // Investment Returns - High Priority
    {
      keywords: [
        'dividend', 'interest', 'investment', 'stock', 'bond',
        'mutual fund', 'etf', 'capital gains', 'portfolio',
        'brokerage', 'trading', 'crypto', 'cryptocurrency',
        'bitcoin', 'ethereum', 'retirement', '401k', 'ira'
      ],
      category: 'Investment Returns',
      priority: 8,
      type: 'income'
    },
    
    // Business Income - Medium Priority
    {
      keywords: [
        'business income', 'sales', 'revenue', 'customer payment',
        'business deposit', 'merchant', 'stripe', 'paypal business',
        'square', 'invoice payment', 'business transfer'
      ],
      category: 'Business Income',
      priority: 7,
      type: 'income'
    },
    
    // Refunds - Medium Priority
    {
      keywords: [
        'refund', 'return', 'credit', 'reimbursement', 'rebate',
        'cashback', 'cash back', 'reward', 'points redemption',
        'adjustment', 'reversal', 'chargeback', 'dispute resolution'
      ],
      category: 'Refunds',
      priority: 6,
      type: 'income'
    },
    
    // Rental Income - Medium Priority
    {
      keywords: [
        'rent', 'rental', 'tenant', 'property income', 'lease',
        'airbnb host', 'vrbo host', 'property management'
      ],
      category: 'Rental Income',
      priority: 6,
      type: 'income'
    }
  ];
  
  static getInstance(): TransactionCategorizer {
    if (!TransactionCategorizer.instance) {
      TransactionCategorizer.instance = new TransactionCategorizer();
    }
    return TransactionCategorizer.instance;
  }
  
  categorizeTransaction(description: string, amount: number, type?: 'income' | 'expense'): string {
    const desc = description.toLowerCase().trim();
    
    // If type is not provided, determine it from amount
    const transactionType = type || (amount > 0 ? 'income' : 'expense');
    
    const rules = transactionType === 'income' ? this.incomeRules : this.expenseRules;
    let bestMatch: { category: string; score: number; priority: number } | null = null;
    
    for (const rule of rules) {
      const matchScore = this.calculateMatchScore(desc, rule.keywords);
      
      if (matchScore > 0) {
        const totalScore = matchScore * rule.priority;
        
        if (!bestMatch || totalScore > (bestMatch.score * bestMatch.priority)) {
          bestMatch = {
            category: rule.category,
            score: matchScore,
            priority: rule.priority
          };
        }
      }
    }
    
    if (bestMatch) {
      return bestMatch.category;
    }
    
    // Default categories
    return transactionType === 'income' ? 'Other Income' : 'Other';
  }
  
  private calculateMatchScore(description: string, keywords: string[]): number {
    let score = 0;
    const words = description.split(/\s+/);
    
    for (const keyword of keywords) {
      if (description.includes(keyword)) {
        // Exact match gets higher score
        if (words.includes(keyword)) {
          score += 3;
        } else {
          // Partial match gets lower score
          score += 1;
        }
      }
    }
    
    return score;
  }
  
  // Get all available categories
  getIncomeCategories(): string[] {
    return [...new Set(this.incomeRules.map(rule => rule.category))];
  }
  
  getExpenseCategories(): string[] {
    return [...new Set(this.expenseRules.map(rule => rule.category))];
  }
  
  getAllCategories(): { income: string[]; expense: string[] } {
    return {
      income: this.getIncomeCategories(),
      expense: this.getExpenseCategories()
    };
  }
  
  // Add custom rule
  addCustomRule(rule: CategoryRule): void {
    if (rule.type === 'income') {
      this.incomeRules.push(rule);
      // Sort by priority descending
      this.incomeRules.sort((a, b) => b.priority - a.priority);
    } else {
      this.expenseRules.push(rule);
      this.expenseRules.sort((a, b) => b.priority - a.priority);
    }
  }
}
