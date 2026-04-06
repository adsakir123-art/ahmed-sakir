export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
}

export interface AdminStats {
  totalUsers: number;
  totalTransactions: number;
  totalVolume: number;
  incomeVolume: number;
  expenseVolume: number;
}

export interface Transaction {
  _id?: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
}

export type TransactionType = 'income' | 'expense';

export const CATEGORIES = {
  income: ['Salary', 'Freelance', 'Investment', 'Gift', 'Other'],
  expense: ['Food', 'Rent', 'Transport', 'Entertainment', 'Shopping', 'Health', 'Other']
};
