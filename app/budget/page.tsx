'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardBody, Progress, Chip, Button, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from '@nextui-org/react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, TrendingDown, DollarSign, Target, AlertCircle, CheckCircle, Edit3 } from 'lucide-react';
import Link from 'next/link';
import TransactionStore, { FinancialSummary } from '@/lib/transaction-store';
import { Transaction } from '@/lib/simple-transaction-parser';

interface MonthlyBudget {
  totalBudget: number;
  actualSpending: number;
  remaining: number;
  percentageSpent: number;
  isOverBudget: boolean;
  categoryBreakdown: {
    category: string;
    spent: number;
    count: number;
    percentage: number;
  }[];
}

export default function BudgetPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [monthlyBudget, setMonthlyBudget] = useState<MonthlyBudget | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [editableBudget, setEditableBudget] = useState<number>(375.20);
  const [newBudgetValue, setNewBudgetValue] = useState<string>('375.20');
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // Target spending based on your requirement
  const TARGET_SPENDING = editableBudget;

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth');
      return;
    }

    const store = TransactionStore.getInstance();
    store.loadFromLocalStorage();
    
    const updateData = () => {
      const currentSummary = store.getFinancialSummary();
      const allTransactions = store.getAllTransactions();
      
      setSummary(currentSummary);
      setTransactions(allTransactions);
      
      // Calculate accurate spending for current month
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const currentMonthTransactions = allTransactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= currentMonthStart && 
               transactionDate <= currentMonthEnd &&
               t.type === 'expense';
      });
      
      // Filter out the $367.09 payment which should be income/refund
      const actualExpenses = currentMonthTransactions.filter(t => {
        const desc = t.description.toLowerCase();
        // Skip transactions that are payments TO you (income)
        const isPaymentToYou = desc.includes('payment from') || 
                               desc.includes('chk 9192') ||
                               (Math.abs(t.amount - 367.09) < 0.01);
        return !isPaymentToYou;
      });
      
      const actualSpending = actualExpenses.reduce((sum, t) => sum + t.amount, 0);
      
      // Category breakdown for actual expenses only
      const categoryTotals = new Map<string, { amount: number; count: number }>();
      
      actualExpenses.forEach(transaction => {
        const existing = categoryTotals.get(transaction.category) || { amount: 0, count: 0 };
        categoryTotals.set(transaction.category, {
          amount: existing.amount + transaction.amount,
          count: existing.count + 1
        });
      });
      
      const categoryBreakdown = Array.from(categoryTotals.entries())
        .map(([category, data]) => ({
          category,
          spent: data.amount,
          count: data.count,
          percentage: actualSpending > 0 ? (data.amount / actualSpending) * 100 : 0
        }))
        .sort((a, b) => b.spent - a.spent);
      
      const budget: MonthlyBudget = {
        totalBudget: TARGET_SPENDING,
        actualSpending,
        remaining: TARGET_SPENDING - actualSpending,
        percentageSpent: (actualSpending / TARGET_SPENDING) * 100,
        isOverBudget: actualSpending > TARGET_SPENDING,
        categoryBreakdown
      };
      
      setMonthlyBudget(budget);
    };
    
    updateData();
    
  const unsubscribe = store.subscribe(updateData);
    return unsubscribe;
  }, [session, status, router]);
  
  // Sync modal input with current budget when modal opens
  useEffect(() => {
    if (isOpen) {
      setNewBudgetValue(editableBudget.toString());
    }
  }, [isOpen, editableBudget]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="h-32 w-32 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      {/* Navigation */}
      <nav className="backdrop-blur-xl bg-slate-900/80 border-b border-slate-700/50 px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <Wallet className="h-8 w-8 text-purple-400" />
            <span className="text-2xl font-bold text-white">Spendbit</span>
          </Link>
          <div className="flex items-center space-x-6">
            <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link href="/transactions" className="text-slate-400 hover:text-white transition-colors">
              Transactions
            </Link>
            <Link href="/budget" className="text-purple-400 hover:text-purple-300 transition-colors">
              Budget
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Monthly Budget Analysis</h1>
              <p className="text-slate-400">Track your spending against your target budget of ${TARGET_SPENDING.toFixed(2)}</p>
            </div>
            <Button
              color="primary"
              variant="ghost"
              startContent={<Edit3 className="h-4 w-4" />}
              onPress={onOpen}
            >
              Edit Budget
            </Button>
          </div>
        </motion.div>

        {monthlyBudget ? (
          <div className="space-y-8">
            {/* Budget Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50">
                <CardBody className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-white flex items-center">
                      <Target className="h-6 w-6 text-purple-400 mr-2" />
                      Current Month Budget Status
                    </h3>
                    <Chip 
                      color={monthlyBudget.isOverBudget ? 'danger' : 'success'}
                      variant="flat"
                      startContent={monthlyBudget.isOverBudget ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                    >
                      {monthlyBudget.isOverBudget ? 'Over Budget' : 'On Track'}
                    </Chip>
                  </div>
                  
                  {/* Budget Progress */}
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-300">Progress</span>
                      <span className="text-white font-semibold">
                        ${monthlyBudget.actualSpending.toFixed(2)} / ${monthlyBudget.totalBudget.toFixed(2)}
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(100, monthlyBudget.percentageSpent)} 
                      color={monthlyBudget.isOverBudget ? 'danger' : monthlyBudget.percentageSpent > 80 ? 'warning' : 'success'}
                      className="mb-2"
                    />
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">
                        {monthlyBudget.percentageSpent.toFixed(1)}% used
                      </span>
                      <span className={`font-medium ${
                        monthlyBudget.remaining >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {monthlyBudget.remaining >= 0 ? '$' : '-$'}{Math.abs(monthlyBudget.remaining).toFixed(2)} 
                        {monthlyBudget.remaining >= 0 ? 'remaining' : 'over budget'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Budget Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-900/50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Target className="h-5 w-5 text-blue-400" />
                        <span className="text-slate-300 text-sm">Target Budget</span>
                      </div>
                      <p className="text-xl font-bold text-white">${monthlyBudget.totalBudget.toFixed(2)}</p>
                    </div>
                    
                    <div className="bg-slate-900/50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <TrendingDown className="h-5 w-5 text-red-400" />
                        <span className="text-slate-300 text-sm">Actual Spending</span>
                      </div>
                      <p className="text-xl font-bold text-white">${monthlyBudget.actualSpending.toFixed(2)}</p>
                    </div>
                    
                    <div className="bg-slate-900/50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <DollarSign className={`h-5 w-5 ${
                          monthlyBudget.remaining >= 0 ? 'text-green-400' : 'text-red-400'
                        }`} />
                        <span className="text-slate-300 text-sm">
                          {monthlyBudget.remaining >= 0 ? 'Remaining' : 'Over Budget'}
                        </span>
                      </div>
                      <p className={`text-xl font-bold ${
                        monthlyBudget.remaining >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {monthlyBudget.remaining >= 0 ? '$' : '-$'}{Math.abs(monthlyBudget.remaining).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </motion.div>
            
            {/* Category Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50">
                <CardBody className="p-6">
                  <h3 className="text-xl font-semibold text-white mb-6">Spending by Category</h3>
                  
                  {monthlyBudget.categoryBreakdown.length > 0 ? (
                    <div className="space-y-4">
                      {monthlyBudget.categoryBreakdown.map((category, index) => (
                        <motion.div
                          key={category.category}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + index * 0.1 }}
                          className="flex items-center justify-between p-4 bg-slate-900/30 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-white font-medium">{category.category}</span>
                              <div className="text-right">
                                <span className="text-white font-semibold">${category.spent.toFixed(2)}</span>
                                <span className="text-slate-400 text-sm ml-2">({category.count} transactions)</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <Progress 
                                value={category.percentage} 
                                className="flex-1"
                                color="primary"
                                size="sm"
                              />
                              <span className="text-slate-400 text-sm min-w-[3rem]">
                                {category.percentage.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <DollarSign className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400 text-lg">No spending recorded this month</p>
                    </div>
                  )}
                </CardBody>
              </Card>
            </motion.div>
            
            {/* Budget Tips */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50">
                <CardBody className="p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Budget Insights</h3>
                  
                  <div className="space-y-3">
                    {monthlyBudget.isOverBudget ? (
                      <div className="flex items-start space-x-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
                        <div>
                          <p className="text-red-400 font-medium">Over Budget Alert</p>
                          <p className="text-slate-300 text-sm">
                            You've exceeded your monthly budget by ${Math.abs(monthlyBudget.remaining).toFixed(2)}. 
                            Consider reviewing your largest expense categories.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start space-x-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
                        <div>
                          <p className="text-green-400 font-medium">Great Job!</p>
                          <p className="text-slate-300 text-sm">
                            You're {monthlyBudget.percentageSpent < 80 ? 'well' : 'staying'} within your budget. 
                            You have ${monthlyBudget.remaining.toFixed(2)} left to spend this month.
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {monthlyBudget.categoryBreakdown.length > 0 && (
                      <div className="flex items-start space-x-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-blue-400 mt-0.5" />
                        <div>
                          <p className="text-blue-400 font-medium">Top Spending Category</p>
                          <p className="text-slate-300 text-sm">
                            Your highest spending category is "{monthlyBudget.categoryBreakdown[0].category}" 
                            at ${monthlyBudget.categoryBreakdown[0].spent.toFixed(2)} 
                            ({monthlyBudget.categoryBreakdown[0].percentage.toFixed(1)}% of total spending).
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            </motion.div>
          </div>
        ) : (
          <Card className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50">
            <CardBody className="p-6">
              <div className="text-center py-8">
                <DollarSign className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Transaction Data</h3>
                <p className="text-slate-400 mb-4">
                  Upload your bank statements or add transactions to start tracking your budget.
                </p>
                <div className="space-x-4">
                  <Button as={Link} href="/dashboard" color="primary">
                    Upload Statements
                  </Button>
                  <Button as={Link} href="/transactions" variant="ghost">
                    Add Manually
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
      
      {/* Edit Budget Modal */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} backdrop="blur">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <h3 className="text-xl font-semibold">Edit Monthly Budget</h3>
                <p className="text-sm text-slate-500">Set your target spending amount for this month</p>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Monthly Budget Amount
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Enter budget amount"
                      value={newBudgetValue}
                      onChange={(e) => setNewBudgetValue(e.target.value)}
                      startContent={
                        <div className="pointer-events-none flex items-center">
                          <span className="text-default-400 text-small">$</span>
                        </div>
                      }
                      classNames={{
                        input: "text-lg",
                        inputWrapper: "h-12"
                      }}
                    />
                  </div>
                  
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Current Budget:</span>
                      <span className="font-medium">${editableBudget.toFixed(2)}</span>
                    </div>
                    {monthlyBudget && (
                      <div className="flex items-center justify-between text-sm mt-2">
                        <span className="text-slate-600">Current Spending:</span>
                        <span className="font-medium">${monthlyBudget.actualSpending.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button 
                  color="primary" 
                  onPress={() => {
                    const newValue = parseFloat(newBudgetValue);
                    if (!isNaN(newValue) && newValue > 0) {
                      setEditableBudget(newValue);
                      onClose();
                    }
                  }}
                  isDisabled={isNaN(parseFloat(newBudgetValue)) || parseFloat(newBudgetValue) <= 0}
                >
                  Update Budget
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
