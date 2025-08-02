'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button, Card, CardBody, Progress } from '@nextui-org/react';
import { motion } from 'framer-motion';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  PieChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import Link from 'next/link';
import TransactionStore, { FinancialSummary } from '@/lib/transaction-store';
import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  Area,
  AreaChart,
  Brush,
} from 'recharts';

const StatCard = ({ title, value, change, icon: Icon, trend, delay = 0 }: any) => {
  const isPositive = trend === 'up';
  const isNeutral = trend === 'neutral';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
    >
      <Card className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300">
        <CardBody className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">{title}</p>
              <p className="text-2xl font-bold text-white mt-2">{value}</p>
              <div
                className={`flex items-center mt-2 text-sm ${
                  isNeutral ? 'text-blue-400' : isPositive ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {!isNeutral && (isPositive ? (
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 mr-1" />
                ))}
                {change}
              </div>
            </div>
            <div
              className={`p-3 rounded-full ${
                isNeutral ? 'bg-blue-500/20' : isPositive ? 'bg-green-500/20' : 'bg-red-500/20'
              }`}
            >
              <Icon
                className={`h-6 w-6 ${
                  isNeutral ? 'text-blue-400' : isPositive ? 'text-green-400' : 'text-red-400'
                }`}
              />
            </div>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
};

const CategoryCard = ({ category, amount, percentage, color, delay = 0 }: any) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="flex items-center justify-between p-4 rounded-lg bg-slate-800/30 border border-slate-700/30"
    >
      <div className="flex items-center space-x-3">
        <div className={`w-3 h-3 rounded-full ${color}`}></div>
        <span className="text-white font-medium">{category}</span>
      </div>
      <div className="text-right">
        <p className="text-white font-semibold">${amount}</p>
        <p className="text-slate-400 text-sm">{percentage}%</p>
      </div>
    </motion.div>
  );
};

// Chart colors
const COLORS = [
  '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444',
  '#8B5A2B', '#6366F1', '#EC4899', '#84CC16', '#F97316'
];

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 p-3 rounded-lg border border-slate-600 shadow-lg">
        <p className="text-white font-medium">{`${label}`}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-slate-300">
            {`${entry.name}: $${entry.value.toFixed(2)}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [newBalance, setNewBalance] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth');
      return;
    }

    const store = TransactionStore.getInstance();
    store.subscribe(() => {
      setSummary(store.getFinancialSummary());
    });
    store.loadFromLocalStorage();
    setSummary(store.getFinancialSummary());
  }, [session, status, router]);

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
      <nav className="backdrop-blur-xl bg-slate-900/80 border-b border-slate-700/50 px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <Wallet className="h-8 w-8 text-purple-400" />
            <span className="text-2xl font-bold text-white">Spendbit</span>
          </Link>
          <div className="flex items-center space-x-6">
            <Link
              href="/dashboard"
              className="text-purple-400 hover:text-purple-300 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/transactions"
              className="text-slate-400 hover:text-white transition-colors"
            >
              Transactions
            </Link>
            <Link
              href="/budget"
              className="text-slate-400 hover:text-white transition-colors"
            >
              Budget
            </Link>
            <div className="flex items-center space-x-4 ml-6 pl-6 border-l border-slate-700">
              <span className="text-slate-300">Welcome, {session.user?.name}</span>
              <Button
                size="sm"
                variant="ghost"
                className="text-slate-400 hover:text-white"
                onPress={() => signOut()}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">Financial Dashboard</h1>
          <p className="text-slate-400">
            Track your spending, savings, and financial goals
          </p>
        </motion.div>

        {summary ? (
          <div className="mt-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="relative">
                <StatCard
                  title="Debit Balance"
                  value={`$${summary.debitCardBalance.toFixed(2)}`}
                  change={isEditingBalance ? 'Click to save' : 'Click to edit'}
                  icon={CreditCard}
                  trend="neutral"
                  delay={0.1}
                />
                {isEditingBalance && (
                  <div className="absolute inset-0 bg-slate-800/95 rounded-lg flex items-center justify-center p-4">
                    <div className="w-full max-w-xs">
                      <input
                        type="number"
                        step="0.01"
                        value={newBalance}
                        onChange={(e) => setNewBalance(e.target.value)}
                        placeholder="Enter new balance"
                        className="w-full p-2 bg-slate-700 text-white rounded-md mb-3 focus:outline-none focus:ring-2 focus:ring-purple-400"
                        autoFocus
                      />
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          color="primary"
                          onPress={() => {
                            const store = TransactionStore.getInstance();
                            store.setDebitCardBalance(parseFloat(newBalance) || 0);
                            setSummary(store.getFinancialSummary());
                            setIsEditingBalance(false);
                            setNewBalance('');
                          }}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onPress={() => {
                            setIsEditingBalance(false);
                            setNewBalance('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                <div 
                  className="absolute inset-0 cursor-pointer"
                  onClick={() => {
                    if (!isEditingBalance) {
                      setNewBalance(summary.debitCardBalance.toString());
                      setIsEditingBalance(true);
                    }
                  }}
                />
              </div>
              <StatCard
                title="This Month Spending"
                value={`$${summary.thisMonthSpending.toFixed(2)}`}
                change={`${new Date().toLocaleDateString('en-US', { month: 'long' })} month-to-date`}
                icon={TrendingDown}
                trend="down"
                delay={0.15}
              />
              <StatCard
                title="Last Month Spending"
                value={`$${summary.lastMonthSpending.toFixed(2)}`}
                change='Previous month total'
                icon={TrendingDown}
                trend="down"
                delay={0.20}
              />
              <StatCard
                title="Balance"
                value={`$${summary.creditCardBalance.toFixed(2)}`}
                change='Credit card balance to pay'
                icon={Wallet}
                trend="down"
                delay={0.25}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="lg:col-span-2"
              >
                <Card className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50">
                  <CardBody className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-semibold text-white">
                        Spending Overview
                      </h3>
                      <div className="flex items-center space-x-2">
                        <BarChart3 className="h-5 w-5 text-purple-400" />
                        <span className="text-slate-400 text-sm">Last 6 months</span>
                      </div>
                    </div>

                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={summary.monthlyTrends}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis 
                            dataKey="month" 
                            stroke="#94A3B8" 
                            fontSize={12}
                          />
                          <YAxis 
                            stroke="#94A3B8" 
                            fontSize={12}
                            tickFormatter={(value) => `$${value}`}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Area 
                            type="monotone" 
                            dataKey="expenses" 
                            stackId="1"
                            stroke="#ef4444" 
                            fill="#fef2f2" 
                            fillOpacity={0.5}
                            name="Expenses"
                          />
                          <Area 
                            type="monotone" 
                            dataKey="income" 
                            stackId="2"
                            stroke="#10b981" 
                            fill="#d1fae5" 
                            fillOpacity={0.5}
                            name="Income"
                          />
                          <Legend
                            wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }}
                          />
                          <Brush
                            dataKey="month"
                            height={30}
                            stroke="#8884d8"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardBody>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                <Card className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50">
                  <CardBody className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-semibold text-white">Categories</h3>
                      <PieChart className="h-5 w-5 text-purple-400" />
                    </div>

                    <div className="h-48 mb-6">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={summary.topCategories.map((cat, index) => ({
                              name: cat.category,
                              value: cat.amount,
                              color: COLORS[index % COLORS.length]
                            }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {summary.topCategories.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-slate-800 p-3 rounded-lg border border-slate-600 shadow-lg">
                                    <p className="text-white font-medium">{payload[0]?.name}</p>
                                    <p className="text-slate-300">
                                      ${typeof payload[0]?.value === 'number' ? payload[0].value.toFixed(2) : payload[0]?.value}
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-4">
                      {summary.topCategories.map((category, index) => (
                        <CategoryCard
                          key={category.category}
                          category={category.category}
                          amount={category.amount.toFixed(2)}
                          percentage={category.percentage.toFixed(1)}
                          color={`bg-blue-500`}
                          delay={0.7}
                        />
                      ))}
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.5 }}
              className="mt-8"
            >
              <Card className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50">
                <CardBody className="p-6">
                  <h3 className="text-xl font-semibold text-white mb-6">
                    Financial Summary
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {summary.monthlyTrends.map((trend, i) => (
                      <div key={i} className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-white font-medium">{trend.month}</span>
                          <span className="text-slate-400">
                            Income: ${trend.income.toFixed(2)}, Expenses: ${
                              trend.expenses.toFixed(2)
                            }
                          </span>
                        </div>
                        <Progress
                          value={Math.max(
                            0,
                            Math.min(
                              100,
                              (trend.net /
                                (Math.abs(trend.income) +
                                  Math.abs(trend.expenses))) *
                                100
                            )
                          )}
                          className="max-w-md"
                          color={trend.net >= 0 ? 'success' : 'danger'}
                        />
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            </motion.div>
          </div>
        ) : (
          <div className="text-center text-slate-400 mt-12">
            <p>
              No financial data available. Upload your bank statements to begin
              analysis.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
