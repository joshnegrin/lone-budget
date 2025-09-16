// IIFE to encapsulate the entire application and avoid polluting the global scope
(() => {
  // Pull dependencies from the global scope (loaded via CDN in index.html)
  const { useState, useEffect, useMemo, StrictMode, FC, FormEvent, MouseEvent } = React;
  const { createRoot } = ReactDOM;
  const { v4: uuidv4 } = uuid;
  const { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } = Recharts;

  // --- Inlined from types.ts ---
  const ExpenseCategoryValues = [
    'Household',
    'Groceries',
    'Subscriptions',
    'Dining Out',
    'Travel',
    'Other'
  ];
  const TRANSACTION_TYPE_INCOME = 'Income';
  const TRANSACTION_TYPE_EXPENSE = 'Expense';

  // --- Inlined from services/storageService.ts ---
  const TRANSACTIONS_KEY = 'budget-visualizer-transactions';
  const BUDGETS_KEY = 'budget-visualizer-budgets';
  const storageService = {
    getTransactions: () => {
      try {
        const transactionsJson = localStorage.getItem(TRANSACTIONS_KEY);
        return transactionsJson ? JSON.parse(transactionsJson) : [];
      } catch (error) {
        console.error('Error loading transactions from local storage:', error);
        return [];
      }
    },
    saveTransactions: (transactions) => {
      try {
        localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
      } catch (error) {
        console.error('Error saving transactions to local storage:', error);
      }
    },
    getBudgets: () => {
      try {
        const budgetsJson = localStorage.getItem(BUDGETS_KEY);
        return budgetsJson ? JSON.parse(budgetsJson) : {};
      } catch (error) {
        console.error('Error loading budgets from local storage:', error);
        return {};
      }
    },
    saveBudgets: (budgets) => {
      try {
        localStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets));
      } catch (error) {
        console.error('Error saving budgets to local storage:', error);
      }
    }
  };

  // --- Inlined Components ---

  const Header = ({ currentDate, onMonthChange }) => {
    const monthName = currentDate.toLocaleString('default', { month: 'long' });
    const year = currentDate.getFullYear();
    return React.createElement(
      'header', {
        className: 'mb-8 p-4 bg-gray-800/50 rounded-xl shadow-lg flex flex-col sm:flex-row justify-between items-center'
      },
      React.createElement('h1', {
        className: 'text-2xl sm:text-3xl font-bold text-emerald-400 tracking-wider mb-4 sm:mb-0'
      }, 'Monthly Budget Visualizer'),
      React.createElement('div', {
        className: 'flex items-center space-x-4 bg-gray-700 p-2 rounded-lg'
      }, React.createElement('button', {
        onClick: () => onMonthChange('prev'),
        className: 'p-2 rounded-md hover:bg-emerald-500 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400',
        'aria-label': 'Previous month'
      }, React.createElement('svg', {
        xmlns: 'http://www.w3.org/2000/svg',
        className: 'h-6 w-6',
        fill: 'none',
        viewBox: '0 0 24 24',
        stroke: 'currentColor'
      }, React.createElement('path', {
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeWidth: 2,
        d: 'M15 19l-7-7 7-7'
      }))), React.createElement('span', {
        className: 'text-lg font-semibold w-36 text-center tabular-nums'
      }, `${monthName} ${year}`), React.createElement('button', {
        onClick: () => onMonthChange('next'),
        className: 'p-2 rounded-md hover:bg-emerald-500 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400',
        'aria-label': 'Next month'
      }, React.createElement('svg', {
        xmlns: 'http://www.w3.org/2000/svg',
        className: 'h-6 w-6',
        fill: 'none',
        viewBox: '0 0 24 24',
        stroke: 'currentColor'
      }, React.createElement('path', {
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeWidth: 2,
        d: 'M9 5l7 7-7 7'
      }))))
    );
  };

  const Summary = ({ transactions, budget }) => {
    const totalIncome = transactions.filter(t => t.type === TRANSACTION_TYPE_INCOME).reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === TRANSACTION_TYPE_EXPENSE).reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpenses;
    const formatCurrency = (amount) => amount.toLocaleString('he-IL', {
      style: 'currency',
      currency: 'ILS'
    });
    const totalBudgetedExpenses = Object.values(budget.expenseBudgets).reduce((sum, amount) => sum + amount, 0);
    return React.createElement(
      'div', {
        className: 'grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'
      },
      React.createElement('div', {
        className: 'bg-gray-800 p-6 rounded-xl shadow-lg text-center'
      }, React.createElement('h3', {
        className: 'text-lg font-medium text-gray-400 mb-2'
      }, 'Income'), React.createElement('p', {
        className: 'text-3xl font-bold text-emerald-400'
      }, formatCurrency(totalIncome)), React.createElement('p', {
        className: 'text-sm text-gray-500 mt-1'
      }, `Budgeted: ${formatCurrency(budget.incomeGoal)}`)),
      React.createElement('div', {
        className: 'bg-gray-800 p-6 rounded-xl shadow-lg text-center'
      }, React.createElement('h3', {
        className: 'text-lg font-medium text-gray-400 mb-2'
      }, 'Expenses'), React.createElement('p', {
        className: 'text-3xl font-bold text-rose-400'
      }, formatCurrency(totalExpenses)), React.createElement('p', {
        className: 'text-sm text-gray-500 mt-1'
      }, `Budgeted: ${formatCurrency(totalBudgetedExpenses)}`)),
      React.createElement('div', {
        className: 'bg-gray-800 p-6 rounded-xl shadow-lg text-center'
      }, React.createElement('h3', {
        className: 'text-lg font-medium text-gray-400 mb-2'
      }, 'Actual Balance'), React.createElement('p', {
        className: `text-3xl font-bold ${balance >= 0 ? 'text-gray-100' : 'text-rose-500'}`
      }, formatCurrency(balance)), React.createElement('p', {
        className: 'text-sm text-gray-500 mt-1 invisible'
      }, 'Placeholder'))
    );
  };

  const TransactionForm = ({ onAddTransaction, currentDate }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState(TRANSACTION_TYPE_EXPENSE);
    const [category, setCategory] = useState('Groceries');
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrence, setRecurrence] = useState(1);
    const [error, setError] = useState('');
    const handleSubmit = (e) => {
      e.preventDefault();
      const numericAmount = parseFloat(amount);
      if (!description || !numericAmount || numericAmount <= 0) {
        setError('Please enter a valid description and positive amount.');
        return;
      }
      setError('');
      onAddTransaction({
        description,
        amount: numericAmount,
        type,
        category: type === TRANSACTION_TYPE_EXPENSE ? category : undefined,
        date: currentDate.toISOString(),
      }, isRecurring ? recurrence : 0);
      setDescription('');
      setAmount('');
      setIsRecurring(false);
      setRecurrence(1);
    };
    return React.createElement('div', {
      className: 'bg-gray-800 p-6 rounded-xl shadow-lg h-full'
    }, React.createElement('h2', {
      className: 'text-xl font-semibold mb-4 text-emerald-400'
    }, 'Add New Transaction'), React.createElement('form', {
      onSubmit: handleSubmit,
      className: 'space-y-4'
    }, React.createElement('div', null, React.createElement('label', {
      htmlFor: 'description',
      className: 'block text-sm font-medium text-gray-300 mb-1'
    }, 'Description'), React.createElement('input', {
      id: 'description',
      type: 'text',
      value: description,
      onChange: (e) => setDescription(e.target.value),
      placeholder: 'e.g., Groceries',
      className: 'w-full bg-gray-700 border-gray-600 rounded-md p-2 text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition'
    })), React.createElement('div', null, React.createElement('label', {
      htmlFor: 'amount',
      className: 'block text-sm font-medium text-gray-300 mb-1'
    }, 'Amount (₪)'), React.createElement('input', {
      id: 'amount',
      type: 'number',
      value: amount,
      onChange: (e) => setAmount(e.target.value),
      placeholder: '0.00',
      className: 'w-full bg-gray-700 border-gray-600 rounded-md p-2 text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition'
    })), React.createElement('div', {
      className: 'flex space-x-4'
    }, React.createElement('div', {
      className: 'flex-1'
    }, React.createElement('input', {
      type: 'radio',
      id: 'expense',
      name: 'type',
      value: TRANSACTION_TYPE_EXPENSE,
      checked: type === TRANSACTION_TYPE_EXPENSE,
      onChange: () => setType(TRANSACTION_TYPE_EXPENSE),
      className: 'hidden'
    }), React.createElement('label', {
      htmlFor: 'expense',
      className: `block w-full text-center p-2 rounded-md cursor-pointer transition ${type === TRANSACTION_TYPE_EXPENSE ? 'bg-rose-500 text-white font-bold' : 'bg-gray-700 hover:bg-gray-600'}`
    }, 'Expense')), React.createElement('div', {
      className: 'flex-1'
    }, React.createElement('input', {
      type: 'radio',
      id: 'income',
      name: 'type',
      value: TRANSACTION_TYPE_INCOME,
      checked: type === TRANSACTION_TYPE_INCOME,
      onChange: () => setType(TRANSACTION_TYPE_INCOME),
      className: 'hidden'
    }), React.createElement('label', {
      htmlFor: 'income',
      className: `block w-full text-center p-2 rounded-md cursor-pointer transition ${type === TRANSACTION_TYPE_INCOME ? 'bg-emerald-500 text-white font-bold' : 'bg-gray-700 hover:bg-gray-600'}`
    }, 'Income'))), type === TRANSACTION_TYPE_EXPENSE && React.createElement('div', null, React.createElement('label', {
      htmlFor: 'category',
      className: 'block text-sm font-medium text-gray-300 mb-1'
    }, 'Category'), React.createElement('select', {
      id: 'category',
      value: category,
      onChange: (e) => setCategory(e.target.value),
      className: 'w-full bg-gray-700 border-gray-600 rounded-md p-2 text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition'
    }, ExpenseCategoryValues.map(cat => React.createElement('option', {
      key: cat,
      value: cat
    }, cat)))), React.createElement('div', {
      className: 'pt-2'
    }, React.createElement('div', {
      className: 'flex items-center'
    }, React.createElement('input', {
      type: 'checkbox',
      id: 'recurring',
      checked: isRecurring,
      onChange: (e) => setIsRecurring(e.target.checked),
      className: 'h-4 w-4 rounded bg-gray-700 border-gray-500 text-emerald-500 focus:ring-emerald-500'
    }), React.createElement('label', {
      htmlFor: 'recurring',
      className: 'ml-2 text-sm font-medium text-gray-300'
    }, 'Make this a recurring transaction')), isRecurring && React.createElement('div', {
      className: 'mt-2 flex items-center space-x-2'
    }, React.createElement('label', {
      htmlFor: 'recurrence-months',
      className: 'text-sm'
    }, 'Repeat for the next'), React.createElement('input', {
      type: 'number',
      id: 'recurrence-months',
      min: '1',
      max: '60',
      value: recurrence,
      onChange: (e) => setRecurrence(parseInt(e.target.value, 10) || 1),
      className: 'w-20 bg-gray-700 border-gray-600 rounded-md p-1 text-center text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition'
    }), React.createElement('span', {
      className: 'text-sm'
    }, 'months'))), error && React.createElement('p', {
      className: 'text-sm text-rose-400'
    }, error), React.createElement('button', {
      type: 'submit',
      className: 'w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-emerald-500'
    }, 'Add Transaction')));
  };

  const TransactionList = ({ title, transactions, onDelete, onEdit, type }) => {
    const TransactionItem = ({ transaction, onDelete, onEdit, type }) => React.createElement('li', {
      className: 'flex justify-between items-center p-3 bg-gray-800 rounded-lg group'
    }, React.createElement('div', null, React.createElement('p', {
      className: 'font-medium text-gray-200'
    }, transaction.description), transaction.category && React.createElement('p', {
      className: 'text-xs text-gray-400'
    }, transaction.category)), React.createElement('div', {
      className: 'flex items-center space-x-2'
    }, React.createElement('span', {
      className: `font-semibold ${type === TRANSACTION_TYPE_INCOME ? 'text-emerald-400' : 'text-rose-400'}`
    }, transaction.amount.toLocaleString('he-IL', {
      style: 'currency',
      currency: 'ILS'
    })), React.createElement('div', {
      className: 'flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity'
    }, React.createElement('button', {
      onClick: () => onEdit(transaction),
      className: 'p-1 text-gray-500 hover:text-sky-400 focus:outline-none focus:text-sky-400',
      'aria-label': `Edit ${transaction.description}`
    }, React.createElement('svg', {
      xmlns: 'http://www.w3.org/2000/svg',
      className: 'h-5 w-5',
      fill: 'none',
      viewBox: '0 0 24 24',
      stroke: 'currentColor'
    }, React.createElement('path', {
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      strokeWidth: 2,
      d: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z'
    }))), React.createElement('button', {
      onClick: () => onDelete(transaction.id, transaction.recurringId),
      className: 'p-1 text-gray-500 hover:text-rose-500 focus:outline-none focus:text-rose-500',
      'aria-label': `Delete ${transaction.description}`
    }, React.createElement('svg', {
      xmlns: 'http://www.w3.org/2000/svg',
      className: 'h-5 w-5',
      fill: 'none',
      viewBox: '0 0 24 24',
      stroke: 'currentColor'
    }, React.createElement('path', {
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      strokeWidth: 2,
      d: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
    }))))));
    return React.createElement('div', {
      className: 'bg-gray-800 p-6 rounded-xl shadow-lg'
    }, React.createElement('h2', {
      className: `text-xl font-semibold mb-4 ${type === TRANSACTION_TYPE_INCOME ? 'text-emerald-400' : 'text-rose-400'}`
    }, title), transactions.length > 0 ? React.createElement('ul', {
      className: 'space-y-3 max-h-96 overflow-y-auto pr-2'
    }, transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(transaction => React.createElement(TransactionItem, {
      key: transaction.id,
      transaction: transaction,
      onDelete: onDelete,
      onEdit: onEdit,
      type: type
    }))) : React.createElement('div', {
      className: 'text-center py-10 text-gray-500'
    }, React.createElement('p', null, `No ${title.toLowerCase()} recorded for this month.`)));
  };

  const CategoryChart = ({ expenses }) => {
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF19A3', '#19D4FF', '#FFD419', '#8C19FF', '#FF1919'];
    const chartData = useMemo(() => {
      const categoryTotals = expenses.reduce((acc, expense) => {
        const category = expense.category || 'Other';
        acc[category] = (acc[category] || 0) + expense.amount;
        return acc;
      }, {});
      return Object.entries(categoryTotals).map(([name, value]) => ({
        name,
        value
      })).sort((a, b) => b.value - a.value);
    }, [expenses]);
    if (expenses.length === 0) {
      return React.createElement('div', {
        className: 'bg-gray-800 p-6 rounded-xl shadow-lg h-full flex items-center justify-center'
      }, React.createElement('div', {
        className: 'text-center text-gray-500'
      }, React.createElement('svg', {
        xmlns: 'http://www.w3.org/2000/svg',
        className: 'mx-auto h-12 w-12',
        fill: 'none',
        viewBox: '0 0 24 24',
        stroke: 'currentColor'
      }, React.createElement('path', {
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeWidth: 2,
        d: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
      })), React.createElement('p', {
        className: 'mt-2'
      }, 'No expense data to display chart.')));
    }
    const CustomTooltip = ({ active, payload }) => {
      if (active && payload && payload.length) {
        return React.createElement('div', {
          className: 'bg-gray-700 p-2 border border-gray-600 rounded-md shadow-lg'
        }, React.createElement('p', {
          className: 'label text-gray-200'
        }, `${payload[0].name} : ${payload[0].value.toLocaleString('he-IL', { style: 'currency', currency: 'ILS' })}`));
      }
      return null;
    };
    return React.createElement('div', {
      className: 'bg-gray-800 p-6 rounded-xl shadow-lg h-full'
    }, React.createElement('h2', {
      className: 'text-xl font-semibold mb-4 text-rose-400'
    }, 'Expense Breakdown'), React.createElement('div', {
      style: {
        width: '100%',
        height: 300
      }
    }, React.createElement(ResponsiveContainer, null, React.createElement(PieChart, null, React.createElement(Pie, {
      data: chartData,
      cx: '50%',
      cy: '50%',
      labelLine: false,
      outerRadius: 80,
      fill: '#8884d8',
      dataKey: 'value',
      nameKey: 'name'
    }, chartData.map((entry, index) => React.createElement(Cell, {
      key: `cell-${index}`,
      fill: COLORS[index % COLORS.length]
    }))), React.createElement(Tooltip, {
      content: React.createElement(CustomTooltip, null)
    }), React.createElement(Legend, {
      layout: 'vertical',
      align: 'right',
      verticalAlign: 'middle',
      iconSize: 10,
      wrapperStyle: {
        color: '#E5E7EB',
        fontSize: '14px'
      }
    })))));
  };

  const EditTransactionModal = ({ isOpen, onClose, transaction, onUpdateTransaction }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState(TRANSACTION_TYPE_EXPENSE);
    const [category, setCategory] = useState('Groceries');
    const [date, setDate] = useState('');
    const [error, setError] = useState('');
    useEffect(() => {
      if (transaction) {
        setDescription(transaction.description);
        setAmount(transaction.amount.toString());
        setType(transaction.type);
        setCategory(transaction.category || 'Groceries');
        setDate(transaction.date.split('T')[0]);
      }
    }, [transaction]);
    useEffect(() => {
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      if (isOpen) {
        window.addEventListener('keydown', handleKeyDown);
      }
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }, [isOpen, onClose]);
    if (!isOpen || !transaction) return null;
    const handleUpdate = (scope) => {
      const numericAmount = parseFloat(amount);
      if (!description || !numericAmount || numericAmount <= 0) {
        setError('Please enter a valid description and positive amount.');
        return;
      }
      const originalDate = new Date(transaction.date);
      const [year, month, day] = date.split('-').map(Number);
      const newDate = new Date(originalDate.getTime());
      newDate.setFullYear(year, month - 1, day);
      onUpdateTransaction({ ...transaction,
        description,
        amount: numericAmount,
        type,
        category: type === TRANSACTION_TYPE_EXPENSE ? category : undefined,
        date: newDate.toISOString(),
      }, scope);
      onClose();
    };
    const handleBackdropClick = (e) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    };
    return React.createElement('div', {
      className: 'fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 transition-opacity',
      onClick: handleBackdropClick,
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'edit-transaction-title'
    }, React.createElement('div', {
      className: 'bg-gray-800 p-6 rounded-xl shadow-lg w-full max-w-md m-4'
    }, React.createElement('div', {
      className: 'flex justify-between items-center mb-4'
    }, React.createElement('h2', {
      id: 'edit-transaction-title',
      className: 'text-xl font-semibold text-emerald-400'
    }, 'Edit Transaction'), React.createElement('button', {
      onClick: onClose,
      'aria-label': 'Close edit transaction modal',
      className: 'text-gray-400 hover:text-gray-200'
    }, React.createElement('svg', {
      xmlns: 'http://www.w3.org/2000/svg',
      className: 'h-6 w-6',
      fill: 'none',
      viewBox: '0 0 24 24',
      stroke: 'currentColor'
    }, React.createElement('path', {
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      strokeWidth: 2,
      d: 'M6 18L18 6M6 6l12 12'
    })))), React.createElement('form', {
      onSubmit: (e) => e.preventDefault(),
      className: 'space-y-4'
    }, React.createElement('div', null, React.createElement('label', {
      htmlFor: 'edit-description',
      className: 'block text-sm font-medium text-gray-300 mb-1'
    }, 'Description'), React.createElement('input', {
      id: 'edit-description',
      type: 'text',
      value: description,
      onChange: (e) => setDescription(e.target.value),
      className: 'w-full bg-gray-700 border-gray-600 rounded-md p-2 text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition'
    })), React.createElement('div', null, React.createElement('label', {
      htmlFor: 'edit-amount',
      className: 'block text-sm font-medium text-gray-300 mb-1'
    }, 'Amount'), React.createElement('input', {
      id: 'edit-amount',
      type: 'number',
      value: amount,
      onChange: (e) => setAmount(e.target.value),
      className: 'w-full bg-gray-700 border-gray-600 rounded-md p-2 text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition'
    })), React.createElement('div', null, React.createElement('label', {
      htmlFor: 'edit-date',
      className: 'block text-sm font-medium text-gray-300 mb-1'
    }, 'Date'), React.createElement('input', {
      id: 'edit-date',
      type: 'date',
      value: date,
      onChange: (e) => setDate(e.target.value),
      className: 'w-full bg-gray-700 border-gray-600 rounded-md p-2 text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition'
    })), React.createElement('div', {
      className: 'flex space-x-4'
    }, React.createElement('div', {
      className: 'flex-1'
    }, React.createElement('input', {
      type: 'radio',
      id: 'edit-expense',
      name: 'edit-type',
      value: TRANSACTION_TYPE_EXPENSE,
      checked: type === TRANSACTION_TYPE_EXPENSE,
      onChange: () => setType(TRANSACTION_TYPE_EXPENSE),
      className: 'hidden'
    }), React.createElement('label', {
      htmlFor: 'edit-expense',
      className: `block w-full text-center p-2 rounded-md cursor-pointer transition ${type === TRANSACTION_TYPE_EXPENSE ? 'bg-rose-500 text-white font-bold' : 'bg-gray-700 hover:bg-gray-600'}`
    }, 'Expense')), React.createElement('div', {
      className: 'flex-1'
    }, React.createElement('input', {
      type: 'radio',
      id: 'edit-income',
      name: 'edit-type',
      value: TRANSACTION_TYPE_INCOME,
      checked: type === TRANSACTION_TYPE_INCOME,
      onChange: () => setType(TRANSACTION_TYPE_INCOME),
      className: 'hidden'
    }), React.createElement('label', {
      htmlFor: 'edit-income',
      className: `block w-full text-center p-2 rounded-md cursor-pointer transition ${type === TRANSACTION_TYPE_INCOME ? 'bg-emerald-500 text-white font-bold' : 'bg-gray-700 hover:bg-gray-600'}`
    }, 'Income'))), type === TRANSACTION_TYPE_EXPENSE && React.createElement('div', null, React.createElement('label', {
      htmlFor: 'edit-category',
      className: 'block text-sm font-medium text-gray-300 mb-1'
    }, 'Category'), React.createElement('select', {
      id: 'edit-category',
      value: category,
      onChange: (e) => setCategory(e.target.value),
      className: 'w-full bg-gray-700 border-gray-600 rounded-md p-2 text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition'
    }, ExpenseCategoryValues.map(cat => React.createElement('option', {
      key: cat,
      value: cat
    }, cat)))), error && React.createElement('p', {
      className: 'text-sm text-rose-400'
    }, error), React.createElement('div', {
      className: 'flex flex-col space-y-2 pt-2'
    }, React.createElement('button', {
      type: 'button',
      onClick: () => handleUpdate('this'),
      className: 'w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-md transition duration-300'
    }, 'Save Changes to This Entry'), transaction.recurringId && React.createElement('button', {
      type: 'button',
      onClick: () => handleUpdate('future'),
      className: 'w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-md transition duration-300'
    }, 'Save for This & Future Entries'), React.createElement('button', {
      type: 'button',
      onClick: onClose,
      className: 'w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition duration-300'
    }, 'Cancel')))));
  };

  const BudgetSetup = ({ isOpen, onClose, onSave, initialBudget, previousBudget }) => {
    const [budget, setBudget] = useState(initialBudget);
    const [recurring, setRecurring] = useState({});
    const formatCurrency = (amount) => amount.toLocaleString('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    useEffect(() => {
      if (isOpen) {
        const isInitialDefault = !initialBudget.recurring || Object.keys(initialBudget.recurring).length === 0;
        if (isInitialDefault && previousBudget?.recurring) {
          const newBudget = {
            incomeGoal: previousBudget.recurring.incomeGoal ? previousBudget.incomeGoal : initialBudget.incomeGoal,
            savingsGoal: previousBudget.recurring.savingsGoal ? previousBudget.savingsGoal : initialBudget.savingsGoal,
            expenseBudgets: { ...initialBudget.expenseBudgets
            }
          };
          if (previousBudget.recurring.expenseBudgets) {
            for (const cat of Object.keys(previousBudget.recurring.expenseBudgets)) {
              if (previousBudget.recurring.expenseBudgets[cat]) {
                newBudget.expenseBudgets[cat] = previousBudget.expenseBudgets[cat];
              }
            }
          }
          setBudget(newBudget);
          setRecurring(previousBudget.recurring);
        } else {
          setBudget(initialBudget);
          setRecurring(initialBudget.recurring || {});
        }
      }
    }, [isOpen, initialBudget, previousBudget]);
    const { totalExpenses, expensesPercent, savingsPercent, remainingAmount } = useMemo(() => {
      const totalExpenses = Object.values(budget.expenseBudgets).reduce((sum, amount) => sum + amount, 0);
      if (budget.incomeGoal <= 0) {
        return {
          totalExpenses,
          expensesPercent: 0,
          savingsPercent: 0,
          remainingAmount: 0
        };
      }
      const expensesPercent = totalExpenses / budget.incomeGoal * 100;
      const savingsPercent = budget.savingsGoal / budget.incomeGoal * 100;
      const remainingAmount = budget.incomeGoal - totalExpenses - budget.savingsGoal;
      return {
        totalExpenses,
        expensesPercent,
        savingsPercent,
        remainingAmount
      };
    }, [budget]);
    const totalPercent = expensesPercent + savingsPercent;
    const remainingPercent = Math.max(0, 100 - totalPercent);
    useEffect(() => {
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      if (isOpen) {
        window.addEventListener('keydown', handleKeyDown);
      }
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }, [isOpen, onClose]);
    const handleInputChange = (e) => {
      const { name, value } = e.target;
      const numericValue = parseFloat(value) || 0;
      if (name === 'incomeGoal' || name === 'savingsGoal') {
        setBudget(prev => ({ ...prev,
          [name]: numericValue
        }));
      } else {
        setBudget(prev => ({ ...prev,
          expenseBudgets: { ...prev.expenseBudgets,
            [name]: numericValue
          },
        }));
      }
    };
    const handleRecurringChange = (e, field) => {
      const { checked } = e.target;
      if (field === 'incomeGoal' || field === 'savingsGoal') {
        setRecurring(prev => ({ ...prev,
          [field]: checked
        }));
      } else {
        setRecurring(prev => ({ ...prev,
          expenseBudgets: { ...prev.expenseBudgets,
            [field]: checked
          }
        }));
      }
    };
    const handleSave = () => {
      onSave({ ...budget,
        recurring
      });
      onClose();
    };
    const handleBackdropClick = (e) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    };
    if (!isOpen) return null;
    return React.createElement('div', {
      className: 'fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 transition-opacity',
      onClick: handleBackdropClick,
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'budget-setup-title'
    }, React.createElement('div', {
      className: 'bg-gray-800 p-6 rounded-xl shadow-lg w-full max-w-2xl m-4'
    }, React.createElement('div', {
      className: 'flex justify-between items-center mb-4'
    }, React.createElement('h2', {
      id: 'budget-setup-title',
      className: 'text-2xl font-semibold text-emerald-400'
    }, 'Setup Monthly Budget'), React.createElement('button', {
      onClick: onClose,
      'aria-label': 'Close budget setup modal',
      className: 'text-gray-400 hover:text-gray-200'
    }, React.createElement('svg', {
      xmlns: 'http://www.w3.org/2000/svg',
      className: 'h-6 w-6',
      fill: 'none',
      viewBox: '0 0 24 24',
      stroke: 'currentColor'
    }, React.createElement('path', {
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      strokeWidth: 2,
      d: 'M6 18L18 6M6 6l12 12'
    })))), React.createElement('div', {
      className: 'bg-gray-700/50 p-4 rounded-lg mb-6'
    }, React.createElement('h3', {
      className: 'text-lg font-medium text-gray-300 mb-2'
    }, 'Budget Feasibility'), React.createElement('div', {
      className: 'flex h-4 w-full bg-gray-600 rounded-full overflow-hidden mb-2',
      role: 'meter',
      'aria-valuenow': totalPercent,
      'aria-valuemin': 0,
      'aria-valuemax': 100
    }, React.createElement('div', {
      className: 'bg-rose-500 transition-all duration-300',
      style: {
        width: `${Math.min(expensesPercent, 100)}%`
      },
      title: 'Expenses'
    }), React.createElement('div', {
      className: 'bg-yellow-500 transition-all duration-300',
      style: {
        width: `${Math.min(savingsPercent, 100 - expensesPercent)}%`
      },
      title: 'Savings'
    }), React.createElement('div', {
      className: 'bg-emerald-500 transition-all duration-300',
      style: {
        width: `${remainingPercent}%`
      },
      title: 'Remaining'
    })), React.createElement('div', {
      className: 'flex justify-between text-xs font-medium text-gray-400'
    }, React.createElement('span', {
      className: 'text-rose-400'
    }, `Expenses: ${formatCurrency(totalExpenses)}`), React.createElement('span', {
      className: 'text-yellow-400'
    }, `Savings: ${formatCurrency(budget.savingsGoal)}`), React.createElement('span', {
      className: 'text-emerald-400'
    }, `Remaining: ${formatCurrency(remainingAmount)}`)), remainingAmount < 0 && React.createElement('p', {
      className: 'text-center text-rose-400 text-sm mt-2 font-semibold'
    }, 'Warning: Your expenses and savings goal exceed your income goal.')), React.createElement('div', {
      className: 'space-y-6 max-h-[60vh] overflow-y-auto pr-4'
    }, React.createElement('div', {
      className: 'grid grid-cols-1 md:grid-cols-2 gap-6'
    }, React.createElement('div', {
      className: 'flex items-end space-x-2'
    }, React.createElement('div', {
      className: 'flex-grow'
    }, React.createElement('label', {
      htmlFor: 'incomeGoal',
      className: 'block text-sm font-medium text-gray-300 mb-1'
    }, 'Income Goal (₪)'), React.createElement('input', {
      id: 'incomeGoal',
      name: 'incomeGoal',
      type: 'number',
      value: budget.incomeGoal,
      onChange: handleInputChange,
      className: 'w-full bg-gray-700 rounded-md p-2 text-gray-100 focus:ring-2 focus:ring-emerald-500'
    })), React.createElement('div', {
      className: 'flex items-center pb-2 space-x-1',
      title: 'Set as recurring'
    }, React.createElement('input', {
      id: 'recurring-income',
      type: 'checkbox',
      checked: !!recurring.incomeGoal,
      onChange: e => handleRecurringChange(e, 'incomeGoal'),
      className: 'h-4 w-4 rounded bg-gray-600 border-gray-500 text-emerald-500 focus:ring-emerald-500'
    }), React.createElement('label', {
      htmlFor: 'recurring-income',
      className: 'text-xs text-gray-400 cursor-pointer'
    }, 'Recur'))), React.createElement('div', {
      className: 'flex items-end space-x-2'
    }, React.createElement('div', {
      className: 'flex-grow'
    }, React.createElement('label', {
      htmlFor: 'savingsGoal',
      className: 'block text-sm font-medium text-gray-300 mb-1'
    }, 'Savings Goal (₪)'), React.createElement('input', {
      id: 'savingsGoal',
      name: 'savingsGoal',
      type: 'number',
      value: budget.savingsGoal,
      onChange: handleInputChange,
      className: 'w-full bg-gray-700 rounded-md p-2 text-gray-100 focus:ring-2 focus:ring-emerald-500'
    })), React.createElement('div', {
      className: 'flex items-center pb-2 space-x-1',
      title: 'Set as recurring'
    }, React.createElement('input', {
      id: 'recurring-savings',
      type: 'checkbox',
      checked: !!recurring.savingsGoal,
      onChange: e => handleRecurringChange(e, 'savingsGoal'),
      className: 'h-4 w-4 rounded bg-gray-600 border-gray-500 text-emerald-500 focus:ring-emerald-500'
    }), React.createElement('label', {
      htmlFor: 'recurring-savings',
      className: 'text-xs text-gray-400 cursor-pointer'
    }, 'Recur')))), React.createElement('div', null, React.createElement('h3', {
      className: 'text-xl font-semibold text-yellow-400 mb-4'
    }, 'Expense Budgets'), React.createElement('div', {
      className: 'grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4'
    }, ExpenseCategoryValues.map(category => React.createElement('div', {
      key: category,
      className: 'flex items-end space-x-2'
    }, React.createElement('div', {
      className: 'flex-grow'
    }, React.createElement('label', {
      htmlFor: category,
      className: 'block text-sm font-medium text-gray-300 mb-1'
    }, `${category} (₪)`), React.createElement('input', {
      id: category,
      name: category,
      type: 'number',
      value: budget.expenseBudgets[category] || '',
      onChange: handleInputChange,
      className: 'w-full bg-gray-700 rounded-md p-2 text-gray-100 focus:ring-2 focus:ring-emerald-500'
    })), React.createElement('div', {
      className: 'flex items-center pb-2 space-x-1',
      title: `Set ${category} as recurring`
    }, React.createElement('input', {
      id: `recurring-${category}`,
      type: 'checkbox',
      checked: !!recurring.expenseBudgets?.[category],
      onChange: e => handleRecurringChange(e, category),
      className: 'h-4 w-4 rounded bg-gray-600 border-gray-500 text-emerald-500 focus:ring-emerald-500'
    }), React.createElement('label', {
      htmlFor: `recurring-${category}`,
      className: 'text-xs text-gray-400 cursor-pointer'
    }, 'Recur'))))))), React.createElement('div', {
      className: 'flex justify-end space-x-4 mt-8'
    }, React.createElement('button', {
      type: 'button',
      onClick: onClose,
      className: 'bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-md transition duration-300'
    }, 'Cancel'), React.createElement('button', {
      type: 'button',
      onClick: handleSave,
      className: 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-md transition duration-300'
    }, 'Save Budget'))));
  };

  const SavingsGoal = ({ budget, actualIncome, actualExpenses }) => {
    const currentSavings = actualIncome - actualExpenses;
    const { savingsGoal } = budget;
    const progress = savingsGoal > 0 ? Math.max(0, currentSavings / savingsGoal * 100) : 0;
    const progressClamped = Math.min(progress, 100);
    const formatCurrency = (amount) => amount.toLocaleString('he-IL', {
      style: 'currency',
      currency: 'ILS'
    });
    const getProgressColor = () => {
      if (progress >= 100) return 'bg-emerald-500';
      if (progress > 50) return 'bg-sky-500';
      return 'bg-sky-600';
    };
    return React.createElement('div', {
      className: 'bg-gray-800 p-6 rounded-xl shadow-lg'
    }, React.createElement('h2', {
      className: 'text-xl font-semibold mb-4 text-sky-400'
    }, 'Monthly Savings Goal'), React.createElement('div', {
      className: 'space-y-3'
    }, React.createElement('div', {
      className: 'flex justify-between items-baseline'
    }, React.createElement('span', {
      className: 'font-medium text-gray-200'
    }, 'Current Savings:'), React.createElement('span', {
      className: `text-2xl font-bold ${currentSavings >= 0 ? 'text-white' : 'text-rose-400'}`
    }, formatCurrency(currentSavings))), React.createElement('div', {
      className: 'flex justify-between items-baseline'
    }, React.createElement('span', {
      className: 'font-medium text-gray-400'
    }, 'Goal:'), React.createElement('span', {
      className: 'font-semibold text-gray-400'
    }, formatCurrency(savingsGoal))), React.createElement('div', {
      className: 'w-full bg-gray-700 rounded-full h-4'
    }, React.createElement('div', {
      className: `h-4 rounded-full transition-all duration-500 ${getProgressColor()}`,
      style: {
        width: `${progressClamped}%`
      },
      role: 'progressbar',
      'aria-valuenow': progress,
      'aria-valuemin': 0,
      'aria-valuemax': 100,
      'aria-label': 'Savings goal progress'
    })), React.createElement('div', {
      className: 'text-right text-sm font-semibold text-gray-300'
    }, `${progress.toFixed(0)}% Complete`)));
  };

  const BudgetProgress = ({ expenses, budget, onEditBudget }) => {
    const ProgressBar = ({ value, max }) => {
      const percentage = max > 0 ? value / max * 100 : 0;
      const clampedPercentage = Math.min(percentage, 100);
      const getColor = () => {
        if (percentage >= 90) return 'bg-rose-500';
        if (percentage >= 75) return 'bg-yellow-500';
        return 'bg-emerald-500';
      };
      return React.createElement('div', {
        className: 'w-full bg-gray-700 rounded-full h-2.5'
      }, React.createElement('div', {
        className: `h-2.5 rounded-full transition-all duration-500 ${getColor()}`,
        style: {
          width: `${clampedPercentage}%`
        },
        role: 'progressbar',
        'aria-valuenow': percentage,
        'aria-valuemin': 0,
        'aria-valuemax': 100
      }));
    };
    const actualSpending = useMemo(() => {
      return expenses.reduce((acc, expense) => {
        const category = expense.category || 'Other';
        acc[category] = (acc[category] || 0) + expense.amount;
        return acc;
      }, {});
    }, [expenses]);
    const formatCurrency = (amount) => amount.toLocaleString('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    const budgetedCategories = Object.entries(budget.expenseBudgets).filter(([, budgetedAmount]) => budgetedAmount > 0).sort(([, a], [, b]) => b - a);
    return React.createElement('div', {
      className: 'bg-gray-800 p-6 rounded-xl shadow-lg h-full'
    }, React.createElement('div', {
      className: 'flex justify-between items-center mb-4'
    }, React.createElement('h2', {
      className: 'text-xl font-semibold text-yellow-400'
    }, 'Budget Progress'), React.createElement('button', {
      onClick: onEditBudget,
      className: 'text-sm bg-gray-700 hover:bg-gray-600 text-sky-400 font-semibold py-1 px-3 rounded-md transition duration-300 flex items-center space-x-2',
      'aria-label': 'Edit budget'
    }, React.createElement('svg', {
      xmlns: 'http://www.w3.org/2000/svg',
      className: 'h-4 w-4',
      fill: 'none',
      viewBox: '0 0 24 24',
      stroke: 'currentColor'
    }, React.createElement('path', {
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      strokeWidth: 2,
      d: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z'
    })), React.createElement('span', null, 'Edit'))), React.createElement('div', {
      className: 'space-y-4 max-h-[380px] overflow-y-auto pr-2'
    }, budgetedCategories.length > 0 ? budgetedCategories.map(([category, budgetedAmount]) => {
      const spentAmount = actualSpending[category] || 0;
      return React.createElement('div', {
        key: category
      }, React.createElement('div', {
        className: 'flex justify-between items-center mb-1 text-sm'
      }, React.createElement('span', {
        className: 'font-medium text-gray-300'
      }, category), React.createElement('span', {
        className: 'text-gray-400'
      }, React.createElement('span', {
        className: spentAmount > budgetedAmount ? 'text-rose-400 font-bold' : 'text-gray-300'
      }, formatCurrency(spentAmount)), ` / ${formatCurrency(budgetedAmount)}`)), React.createElement(ProgressBar, {
        value: spentAmount,
        max: budgetedAmount
      }));
    }) : React.createElement('div', {
      className: 'text-center py-10 text-gray-500'
    }, React.createElement('p', null, 'No expense budgets set for this month.'))));
  };

  // --- Main App Component ---
  const App = () => {
    const emptyBudget = {
      incomeGoal: 5000,
      savingsGoal: 500,
      expenseBudgets: {
        'Household': 0,
        'Groceries': 0,
        'Subscriptions': 0,
        'Dining Out': 0,
        'Travel': 0,
        'Other': 0
      },
      recurring: {},
    };
    const [transactions, setTransactions] = useState(() => storageService.getTransactions());
    const [budgets, setBudgets] = useState(() => storageService.getBudgets());
    const [currentDate, setCurrentDate] = useState(new Date());
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [isBudgetSetupOpen, setIsBudgetSetupOpen] = useState(false);
    useEffect(() => {
      storageService.saveTransactions(transactions);
    }, [transactions]);
    useEffect(() => {
      storageService.saveBudgets(budgets);
    }, [budgets]);
    const {
      currentMonthKey,
      previousMonthKey
    } = useMemo(() => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const currentKey = `${year}-${(month + 1).toString().padStart(2, '0')}`;
      const prevDate = new Date(currentDate);
      prevDate.setMonth(prevDate.getMonth() - 1);
      const prevYear = prevDate.getFullYear();
      const prevMonth = prevDate.getMonth();
      const previousKey = `${prevYear}-${(prevMonth + 1).toString().padStart(2, '0')}`;
      return {
        currentMonthKey: currentKey,
        previousMonthKey: previousKey
      };
    }, [currentDate]);
    const currentBudget = useMemo(() => {
      return budgets[currentMonthKey] || emptyBudget;
    }, [budgets, currentMonthKey]);
    const previousBudget = useMemo(() => {
      return budgets[previousMonthKey];
    }, [budgets, previousMonthKey]);
    const filteredTransactions = useMemo(() => {
      return transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate.getFullYear() === currentDate.getFullYear() && transactionDate.getMonth() === currentDate.getMonth();
      });
    }, [transactions, currentDate]);
    const handleMonthChange = (direction) => {
      setCurrentDate(prevDate => {
        const newDate = new Date(prevDate);
        newDate.setDate(1);
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        return newDate;
      });
    };
    const handleAddTransaction = (transaction, recurrence) => {
      if (recurrence > 0) {
        const recurringId = uuidv4();
        const newTransactions = [];
        for (let i = 0; i <= recurrence; i++) {
          const transactionDate = new Date(transaction.date);
          transactionDate.setMonth(transactionDate.getMonth() + i);
          newTransactions.push({ ...transaction,
            id: uuidv4(),
            recurringId: recurringId,
            date: transactionDate.toISOString(),
          });
        }
        setTransactions(prev => [...prev, ...newTransactions]);
      } else {
        const newTransaction = { ...transaction,
          id: uuidv4(),
        };
        setTransactions(prev => [...prev, newTransaction]);
      }
    };
    const handleUpdateTransaction = (updatedTransaction, scope) => {
      if (scope === 'future' && updatedTransaction.recurringId) {
        const originalTransaction = transactions.find(t => t.id === updatedTransaction.id);
        if (!originalTransaction) return;
        const originalTransactionDate = new Date(originalTransaction.date);
        setTransactions(prev => {
          const futureTransactions = prev.filter(t => t.recurringId === updatedTransaction.recurringId && new Date(t.date) >= originalTransactionDate).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          const updatedFutureTransactions = futureTransactions.map((t, index) => {
            const newDate = new Date(updatedTransaction.date);
            newDate.setMonth(newDate.getMonth() + index);
            return { ...t,
              description: updatedTransaction.description,
              amount: updatedTransaction.amount,
              type: updatedTransaction.type,
              category: updatedTransaction.category,
              date: newDate.toISOString(),
            };
          });
          return prev.map(t => {
            const updatedVersion = updatedFutureTransactions.find(uft => uft.id === t.id);
            return updatedVersion || t;
          });
        });
      } else {
        setTransactions(prev => prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t));
      }
      setEditingTransaction(null);
    };
    const handleDeleteTransaction = (id, recurringId) => {
      if (recurringId) {
        if (window.confirm('This is a recurring transaction. Do you want to delete all future occurrences (including this one)? OK for all future, Cancel for only this one.')) {
          const transactionToDelete = transactions.find(t => t.id === id);
          if (!transactionToDelete) return;
          const transactionDate = new Date(transactionToDelete.date);
          setTransactions(prev => prev.filter(t => !(t.recurringId === recurringId && new Date(t.date) >= transactionDate)));
        } else {
          setTransactions(prev => prev.filter(t => t.id !== id));
        }
      } else {
        setTransactions(prev => prev.filter(t => t.id !== id));
      }
    };
    const handleSaveBudget = (newBudget) => {
      setBudgets(prev => ({ ...prev,
        [currentMonthKey]: newBudget
      }));
    };
    const incomeTransactions = filteredTransactions.filter(t => t.type === TRANSACTION_TYPE_INCOME);
    const expenseTransactions = filteredTransactions.filter(t => t.type === TRANSACTION_TYPE_EXPENSE);
    const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
    return React.createElement('div', {
      className: 'bg-gray-900 text-gray-100 min-h-screen font-sans p-4 sm:p-8'
    }, React.createElement('div', {
      className: 'max-w-7xl mx-auto'
    }, React.createElement(Header, {
      currentDate: currentDate,
      onMonthChange: handleMonthChange
    }), React.createElement('main', null, React.createElement(Summary, {
      transactions: filteredTransactions,
      budget: currentBudget
    }), React.createElement('div', {
      className: 'mb-8'
    }, React.createElement('button', {
      onClick: () => setIsBudgetSetupOpen(true),
      className: 'w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-4 rounded-md transition duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-sky-500'
    }, 'Setup Monthly Budget')), React.createElement('div', {
      className: 'grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8'
    }, React.createElement(TransactionForm, {
      onAddTransaction: handleAddTransaction,
      currentDate: currentDate
    }), React.createElement(BudgetProgress, {
      expenses: expenseTransactions,
      budget: currentBudget,
      onEditBudget: () => setIsBudgetSetupOpen(true)
    })), React.createElement('div', {
      className: 'grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8'
    }, React.createElement(CategoryChart, {
      expenses: expenseTransactions
    }), React.createElement(SavingsGoal, {
      budget: currentBudget,
      actualIncome: totalIncome,
      actualExpenses: totalExpenses
    })), React.createElement('div', {
      className: 'grid grid-cols-1 md:grid-cols-2 gap-8'
    }, React.createElement(TransactionList, {
      title: 'Income',
      transactions: incomeTransactions,
      onDelete: handleDeleteTransaction,
      onEdit: setEditingTransaction,
      type: TRANSACTION_TYPE_INCOME
    }), React.createElement(TransactionList, {
      title: 'Expenses',
      transactions: expenseTransactions,
      onDelete: handleDeleteTransaction,
      onEdit: setEditingTransaction,
      type: TRANSACTION_TYPE_EXPENSE
    })))), React.createElement(EditTransactionModal, {
      isOpen: !!editingTransaction,
      onClose: () => setEditingTransaction(null),
      transaction: editingTransaction,
      onUpdateTransaction: handleUpdateTransaction
    }), React.createElement(BudgetSetup, {
      isOpen: isBudgetSetupOpen,
      onClose: () => setIsBudgetSetupOpen(false),
      initialBudget: currentBudget,
      onSave: handleSave,
      previousBudget: previousBudget
    }));
  };

  // --- Final Render Call ---
  const rootElement = document.getElementById('root');
  if (rootElement) {
    const root = createRoot(rootElement);
    root.render(React.createElement(StrictMode, null, React.createElement(App, null)));
  }
})();
