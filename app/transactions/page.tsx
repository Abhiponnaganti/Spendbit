'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardBody, Button, Input, Select, SelectItem, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Chip } from '@nextui-org/react';
import { motion } from 'framer-motion';
import { Wallet, Plus, DollarSign, Calendar, Tag, Trash2, TrendingUp, TrendingDown, Edit3, X, Upload } from 'lucide-react';
import Link from 'next/link';
import TransactionStore from '@/lib/transaction-store';
import { Transaction } from '@/lib/simple-transaction-parser';
import { TransactionCategorizer } from '@/lib/transaction-categorizer';
import FileUpload from '@/components/FileUpload';
import toast from 'react-hot-toast';

export default function TransactionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const { isOpen: isDeleteModalOpen, onOpen: onDeleteModalOpen, onClose: onDeleteModalClose } = useDisclosure();
  const { isOpen: isEditModalOpen, onOpen: onEditModalOpen, onClose: onEditModalClose } = useDisclosure();
  
  // Form states
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('');
  
  // Edit/Delete states
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editType, setEditType] = useState<'income' | 'expense'>('expense');
  const [editCategory, setEditCategory] = useState('');
  
  // Get categories from categorizer
  const categorizer = TransactionCategorizer.getInstance();
  const allCategories = categorizer.getAllCategories();
  const categories = type === 'income' ? allCategories.income : allCategories.expense;

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth');
      return;
    }

    const store = TransactionStore.getInstance();
    store.loadFromLocalStorage();
    setTransactions(store.getAllTransactions());

    const unsubscribe = store.subscribe(() => {
      setTransactions(store.getAllTransactions());
    });

    return unsubscribe;
  }, [session, status, router]);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description || !amount || !date || !category) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const store = TransactionStore.getInstance();
      const newTransaction = {
        description,
        amount: parseFloat(amount),
        date: new Date(date),
        type,
        category
      };

      store.addManualTransaction(newTransaction);
      
      // Reset form
      setDescription('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setType('expense');
      setCategory('');
      setIsAddingTransaction(false);
      
      toast.success('Transaction added successfully!');
    } catch (error) {
      toast.error('Failed to add transaction');
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setEditDescription(transaction.description);
    setEditAmount(transaction.amount.toString());
    setEditDate(new Date(transaction.date).toISOString().split('T')[0]);
    setEditType(transaction.type);
    setEditCategory(transaction.category);
    onEditModalOpen();
  };

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTransaction || !editDescription || !editAmount || !editDate || !editCategory) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const store = TransactionStore.getInstance();
      store.updateTransaction(selectedTransaction.id, {
        description: editDescription,
        amount: parseFloat(editAmount),
        date: new Date(editDate),
        type: editType,
        category: editCategory
      });
      
      onEditModalClose();
      toast.success('Transaction updated successfully!');
    } catch (error) {
      toast.error('Failed to update transaction');
    }
  };

  const handleDeleteTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    onDeleteModalOpen();
  };

  const confirmDeleteTransaction = () => {
    if (selectedTransaction) {
      const store = TransactionStore.getInstance();
      store.deleteTransaction(selectedTransaction.id);
      onDeleteModalClose();
      toast.success('Transaction deleted successfully!');
    }
  };

  // Callback to handle parsed transactions from file upload
  const handleParsedTransactions = (parsedTransactions: Transaction[]) => {
    if (parsedTransactions.length > 0) {
      toast.success(`Successfully parsed ${parsedTransactions.length} transactions!`);
      setShowUpload(false);
    }
  };

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
            <Link href="/transactions" className="text-purple-400 hover:text-purple-300 transition-colors">
              Transactions
            </Link>
            <Link href="/budget" className="text-slate-400 hover:text-white transition-colors">
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
              <h1 className="text-3xl font-bold text-white mb-2">Transactions</h1>
              <p className="text-slate-400">Manage and track your financial transactions</p>
            </div>
            <div className="flex space-x-3">
              <Button
                color="secondary"
                size="lg"
                startContent={<Upload className="h-5 w-5" />}
                onPress={() => setShowUpload(!showUpload)}
              >
                Upload File
              </Button>
              <Button
                color="primary"
                size="lg"
                startContent={<Plus className="h-5 w-5" />}
                onPress={() => setIsAddingTransaction(!isAddingTransaction)}
              >
                Add Transaction
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Add Transaction Form */}
        {isAddingTransaction && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50">
              <CardBody className="p-6">
                <h3 className="text-xl font-semibold text-white mb-6">Add New Transaction</h3>
                
                <form onSubmit={handleAddTransaction} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="Description"
                      placeholder="Enter transaction description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      startContent={<Tag className="h-4 w-4 text-slate-400" />}
                      className="text-white"
                      required
                    />
                    
                    <Input
                      label="Amount"
                      placeholder="0.00"
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      startContent={<DollarSign className="h-4 w-4 text-slate-400" />}
                      className="text-white"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Input
                      label="Date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      startContent={<Calendar className="h-4 w-4 text-slate-400" />}
                      className="text-white"
                      required
                    />
                    
                    <Select
                      label="Type"
                      placeholder="Select transaction type"
                      selectedKeys={[type]}
                      onSelectionChange={(keys) => {
                        const newType = Array.from(keys)[0] as 'income' | 'expense';
                        setType(newType);
                        setCategory(''); // Reset category when type changes
                      }}
                      className="text-white"
                    >
                      <SelectItem key="expense" value="expense">Expense</SelectItem>
                      <SelectItem key="income" value="income">Income</SelectItem>
                    </Select>
                    
                    <Select
                      label="Category"
                      placeholder="Select category"
                      selectedKeys={category ? [category] : []}
                      onSelectionChange={(keys) => setCategory(Array.from(keys)[0] as string)}
                      className="text-white"
                      required
                    >
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </Select>
                  </div>

                  <div className="flex justify-end space-x-4">
                    <Button
                      variant="ghost"
                      onPress={() => setIsAddingTransaction(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      color="primary"
                    >
                      Add Transaction
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          </motion.div>
        )}

        {/* File Upload */}
        {showUpload && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50">
              <CardBody className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-white">Upload Transaction File</h3>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    className="text-slate-400 hover:text-white"
                    onPress={() => setShowUpload(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <FileUpload onParsedTransactions={handleParsedTransactions} />
              </CardBody>
            </Card>
          </motion.div>
        )}

        {/* Transactions List */}
        <Card className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50">
          <CardBody className="p-6">
            <h3 className="text-xl font-semibold text-white mb-6">Recent Transactions</h3>
            
            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 text-lg">No transactions yet</p>
                <p className="text-slate-500">Add your first transaction to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((transaction, index) => (
                  <motion.div
                    key={transaction.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-700/30 hover:border-slate-600/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          transaction.type === 'income' ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-white font-medium">{transaction.description}</p>
                            <Chip 
                              size="sm" 
                              color={transaction.type === 'income' ? 'success' : 'danger'}
                              variant="flat"
                              className="ml-2"
                            >
                              {transaction.category}
                            </Chip>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-slate-400 mt-1">
                            <span>{new Date(transaction.date).toLocaleDateString()}</span>
                            <span className="capitalize">{transaction.source}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className={`text-lg font-semibold ${
                          transaction.type === 'income' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                        </p>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="ghost"
                          className="text-slate-400 hover:text-blue-400"
                          onPress={() => handleEditTransaction(transaction)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="ghost"
                          className="text-slate-400 hover:text-red-400"
                          onPress={() => handleDeleteTransaction(transaction)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Edit Modal */}
        <Modal isOpen={isEditModalOpen} onClose={onEditModalClose} size="2xl">
          <ModalContent>
            <form onSubmit={handleUpdateTransaction}>
              <ModalHeader className="text-white">Edit Transaction</ModalHeader>
              <ModalBody className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Description"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="text-white"
                    required
                  />
                  <Input
                    label="Amount"
                    type="number"
                    step="0.01"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="text-white"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Date"
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="text-white"
                    required
                  />
                  <Select
                    label="Type"
                    selectedKeys={[editType]}
                    onSelectionChange={(keys) => {
                      const newType = Array.from(keys)[0] as 'income' | 'expense';
                      setEditType(newType);
                    }}
                    className="text-white"
                  >
                    <SelectItem key="expense" value="expense">Expense</SelectItem>
                    <SelectItem key="income" value="income">Income</SelectItem>
                  </Select>
                  <Select
                    label="Category"
                    selectedKeys={editCategory ? [editCategory] : []}
                    onSelectionChange={(keys) => setEditCategory(Array.from(keys)[0] as string)}
                    className="text-white"
                    required
                  >
                    {(editType === 'income' ? allCategories.income : allCategories.expense).map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </Select>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="ghost" onPress={onEditModalClose}>
                  Cancel
                </Button>
                <Button type="submit" color="primary">
                  Update Transaction
                </Button>
              </ModalFooter>
            </form>
          </ModalContent>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal isOpen={isDeleteModalOpen} onClose={onDeleteModalClose}>
          <ModalContent>
            <ModalHeader className="text-white">Delete Transaction</ModalHeader>
            <ModalBody>
              <p className="text-slate-300">
                Are you sure you want to delete this transaction?
              </p>
              {selectedTransaction && (
                <div className="mt-4 p-4 bg-slate-800 rounded-lg">
                  <p className="text-white font-medium">{selectedTransaction.description}</p>
                  <p className="text-slate-400">
                    ${selectedTransaction.amount.toFixed(2)} • {new Date(selectedTransaction.date).toLocaleDateString()}
                  </p>
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" onPress={onDeleteModalClose}>
                Cancel
              </Button>
              <Button color="danger" onPress={confirmDeleteTransaction}>
                Delete
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>
    </div>
  );
}
