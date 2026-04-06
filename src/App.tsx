import React, { useState, useEffect } from 'react';
import { 
  Check,
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Calendar, 
  Tag, 
  FileText, 
  Trash2,
  X,
  PieChart as PieChartIcon,
  LayoutDashboard,
  History,
  LogOut,
  User as UserIcon,
  Mail,
  Lock,
  ArrowRight,
  Facebook,
  Instagram,
  MessageCircle,
  Search,
  Shield,
  Users,
  BarChart3
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip
} from 'recharts';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Transaction, CATEGORIES, User } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; mode: string }>({ connected: false, mode: 'loading' });
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'admin'>('dashboard');
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminTransactions, setAdminTransactions] = useState<any[]>([]);

  // Form state
  const [formData, setFormData] = useState<Omit<Transaction, '_id'>>({
    description: '',
    amount: 0,
    type: 'expense',
    category: 'Food',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (token) {
      fetchUser();
      fetchTransactions();
      if (user?.role === 'admin') {
        fetchAdminData();
      }
    } else {
      setLoading(false);
    }
    checkDbStatus();
  }, [token, user?.role]);

  const fetchAdminData = async () => {
    try {
      const [statsRes, usersRes, transRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/transactions', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (statsRes.ok) setAdminStats(await statsRes.json());
      if (usersRes.ok) setAdminUsers(await usersRes.json());
      if (transRes.ok) setAdminTransactions(await transRes.json());
    } catch (err) {
      console.error('Failed to fetch admin data');
    }
  };

  const checkDbStatus = async () => {
    try {
      const res = await fetch('/api/db-status');
      if (res.ok) {
        const status = await res.json();
        setDbStatus(status);
      }
    } catch (err) {
      console.error('Failed to check DB status');
    }
  };

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      } else {
        handleLogout();
      }
    } catch (err) {
      console.error('Failed to fetch user');
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/transactions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setTransactions(data);
      setError(null);
    } catch (err) {
      setError('Failed to connect to the server. Please check your connection.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setTransactions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Failed to save');
      await fetchTransactions();
      setIsModalOpen(false);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
      setFormData({
        description: '',
        amount: 0,
        type: 'expense',
        category: 'Food',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (err) {
      alert('Error saving transaction');
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await fetch( `/api/transactions/${id}`, { 
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchTransactions();
    } catch (err) {
      alert('Error deleting transaction');
    }
  };

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/signup';
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const result = await res.json();
      if (res.ok) {
        localStorage.setItem('token', result.token);
        setToken(result.token);
        setUser(result.user);
      } else {
        alert(result.error || 'Authentication failed');
      }
    } catch (err) {
      alert('Authentication failed');
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-zinc-200 overflow-hidden">
          <div className="p-8 pb-0">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                <Wallet size={24} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">WealthWise</h1>
            </div>
            <h2 className="text-3xl font-bold text-zinc-900 mb-2">
              {authMode === 'login' ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="text-zinc-500 mb-8">
              {authMode === 'login' ? 'Enter your credentials to access your dashboard' : 'Start tracking your finances today'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="p-8 pt-0 space-y-4">
            {authMode === 'signup' && (
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input
                    required
                    name="name"
                    type="text"
                    placeholder="John Doe"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                  required
                  name="email"
                  type="email"
                  placeholder="john@example.com"
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                  required
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center gap-2 group"
            >
              {authMode === 'login' ? 'Log In' : 'Sign Up'}
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="p-8 pt-0 text-center">
            <p className="text-zinc-500 text-sm">
              {authMode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
              <button
                onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                className="text-emerald-600 font-bold hover:underline"
              >
                {authMode === 'login' ? 'Sign up' : 'Log in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const balance = totalIncome - totalExpenses;

  const filteredTransactions = transactions.filter(t => 
    t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categoryData = Object.entries(
    transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col lg:flex-row">
      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500/20 backdrop-blur-md">
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
              <Check size={14} className="text-white" />
            </div>
            <p className="font-bold text-sm">Transaction added successfully!</p>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-full lg:w-64 bg-white border-b lg:border-r border-zinc-200 p-6 flex flex-col gap-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <Wallet size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">WealthWise</h1>
        </div>

        <nav className="flex flex-col gap-2">
          <button 
            onClick={() => setActiveView('dashboard')}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all",
              activeView === 'dashboard' ? "bg-emerald-50 text-emerald-700" : "text-zinc-500 hover:bg-zinc-50"
            )}
          >
            <LayoutDashboard size={20} />
            Dashboard
          </button>
          {user?.role === 'admin' && (
            <button 
              onClick={() => setActiveView('admin')}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all",
                activeView === 'admin' ? "bg-emerald-50 text-emerald-700" : "text-zinc-500 hover:bg-zinc-50"
              )}
            >
              <Shield size={20} />
              Admin Panel
            </button>
          )}
          <button className="flex items-center gap-3 px-4 py-3 text-zinc-500 hover:bg-zinc-50 rounded-xl font-medium transition-all">
            <History size={20} />
            History
          </button>
          <button className="flex items-center gap-3 px-4 py-3 text-zinc-500 hover:bg-zinc-50 rounded-xl font-medium transition-all">
            <PieChartIcon size={20} />
            Analytics
          </button>
        </nav>

        <div className="mt-auto space-y-4">
          <div className="pt-6 border-t border-zinc-100">
            <div className="p-4 bg-zinc-900 rounded-2xl text-white">
              <p className="text-xs text-zinc-400 mb-1">Current Balance</p>
              <p className="text-2xl font-bold">${balance.toLocaleString()}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-2xl">
            <div className="w-10 h-10 bg-zinc-200 rounded-full flex items-center justify-center text-zinc-500">
              <UserIcon size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-zinc-900 truncate">{user?.name}</p>
              <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-zinc-400 hover:text-rose-500 transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>

          <div className="flex items-center justify-center gap-4 py-2 border-t border-zinc-100">
            <a 
              href="https://facebook.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
              title="Facebook"
            >
              <Facebook size={18} />
            </a>
            <a 
              href="https://instagram.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 text-zinc-400 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-all"
              title="Instagram"
            >
              <Instagram size={18} />
            </a>
            <a 
              href="https://wa.me/1234567890" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
              title="WhatsApp"
            >
              <MessageCircle size={18} />
            </a>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full overflow-y-auto">
        {activeView === 'dashboard' ? (
          <>
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
              <div>
                <h2 className="text-3xl font-bold text-zinc-900">Financial Overview</h2>
                <p className="text-zinc-500">Track your income and expenses with precision.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-emerald-200 transition-all active:scale-95"
              >
                <Plus size={20} />
                Add Transaction
              </button>
            </header>

            {/* Database Status Banner */}
            {!dbStatus.connected && dbStatus.mode !== 'loading' && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-amber-800">
                  <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                    <History size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Running in Demo Mode</p>
                    <p className="text-xs opacity-80">Data will be lost on server restart. Connect MongoDB for permanent storage.</p>
                  </div>
                </div>
                <a 
                  href="https://ai.google.dev/gemini-api/docs/billing" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs font-bold bg-amber-200 hover:bg-amber-300 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Setup MongoDB
                </a>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                    <TrendingUp size={24} />
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">+12.5%</span>
                </div>
                <p className="text-zinc-500 text-sm font-medium">Total Income</p>
                <p className="text-3xl font-bold text-zinc-900">${totalIncome.toLocaleString()}</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center">
                    <TrendingDown size={24} />
                  </div>
                  <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-full">-4.2%</span>
                </div>
                <p className="text-zinc-500 text-sm font-medium">Total Expenses</p>
                <p className="text-3xl font-bold text-zinc-900">${totalExpenses.toLocaleString()}</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                    <Wallet size={24} />
                  </div>
                </div>
                <p className="text-zinc-500 text-sm font-medium">Net Savings</p>
                <p className="text-3xl font-bold text-zinc-900">${balance.toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
              {/* Recent Transactions */}
              <div className="xl:col-span-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <h3 className="text-xl font-bold text-zinc-900">Recent Transactions</h3>
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input
                      type="text"
                      placeholder="Search transactions..."
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                
                {loading ? (
                  <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                  </div>
                ) : error ? (
                  <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl text-rose-700">
                    <p className="font-semibold mb-2">Database Error</p>
                    <p className="text-sm">{error}</p>
                    <p className="text-xs mt-4 opacity-70">Please configure MONGODB_URI in your environment variables.</p>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="bg-white border border-zinc-200 border-dashed p-20 rounded-3xl flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-300 mb-4">
                      <FileText size={32} />
                    </div>
                    <p className="text-zinc-500 font-medium">No transactions found</p>
                    <p className="text-zinc-400 text-sm">Start by adding your first income or expense.</p>
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="bg-white border border-zinc-200 border-dashed p-10 rounded-3xl flex flex-col items-center justify-center text-center">
                    <p className="text-zinc-500 font-medium">No results for "{searchQuery}"</p>
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="text-emerald-600 text-sm font-bold mt-2 hover:underline"
                    >
                      Clear search
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredTransactions.map((t) => (
                      <div key={t._id} className="group bg-white p-4 rounded-2xl border border-zinc-200 flex items-center gap-4 hover:shadow-md transition-all">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center",
                          t.type === 'income' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                        )}>
                          {t.type === 'income' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-zinc-900">{t.description}</p>
                          <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                            <span className="flex items-center gap-1"><Tag size={12} /> {t.category}</span>
                            <span className="flex items-center gap-1"><Calendar size={12} /> {format(new Date(t.date), 'MMM dd, yyyy')}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={cn(
                            "font-bold text-lg",
                            t.type === 'income' ? "text-emerald-600" : "text-rose-600"
                          )}>
                            {t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString()}
                          </p>
                          <button 
                            onClick={() => deleteTransaction(t._id!)}
                            className="text-zinc-300 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Charts & Insights */}
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
                  <h3 className="text-lg font-bold text-zinc-900 mb-6">Spending by Category</h3>
                  <div className="h-64">
                    {categoryData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-zinc-400 text-sm">
                        No data to display
                      </div>
                    )}
                  </div>
                  <div className="mt-4 space-y-2">
                    {categoryData.slice(0, 4).map((item, idx) => (
                      <div key={item.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                          <span className="text-zinc-600">{item.name}</span>
                        </div>
                        <span className="font-bold text-zinc-900">${item.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-emerald-600 p-6 rounded-3xl text-white shadow-xl shadow-emerald-200 relative overflow-hidden">
                  <div className="relative z-10">
                    <h3 className="font-bold text-lg mb-2">Smart Budgeting</h3>
                    <p className="text-emerald-100 text-sm mb-4">You've saved 15% more this month compared to your average.</p>
                    <button className="bg-white text-emerald-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-colors">
                      Set New Goal
                    </button>
                  </div>
                  <div className="absolute -right-4 -bottom-4 opacity-20 transform rotate-12">
                    <TrendingUp size={120} />
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-10">
            <header>
              <h2 className="text-3xl font-bold text-zinc-900">Admin Dashboard</h2>
              <p className="text-zinc-500">Global overview of system performance and user activity.</p>
            </header>

            {/* Admin Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                    <Users size={20} />
                  </div>
                  <p className="text-zinc-500 text-sm font-medium">Total Users</p>
                </div>
                <p className="text-3xl font-bold text-zinc-900">{adminStats?.totalUsers || 0}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                    <BarChart3 size={20} />
                  </div>
                  <p className="text-zinc-500 text-sm font-medium">Total Transactions</p>
                </div>
                <p className="text-3xl font-bold text-zinc-900">{adminStats?.totalTransactions || 0}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
                    <TrendingUp size={20} />
                  </div>
                  <p className="text-zinc-500 text-sm font-medium">Income Volume</p>
                </div>
                <p className="text-3xl font-bold text-zinc-900">${adminStats?.incomeVolume?.toLocaleString() || 0}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center">
                    <TrendingDown size={20} />
                  </div>
                  <p className="text-zinc-500 text-sm font-medium">Expense Volume</p>
                </div>
                <p className="text-3xl font-bold text-zinc-900">${adminStats?.expenseVolume?.toLocaleString() || 0}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Users List */}
              <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
                <h3 className="text-xl font-bold text-zinc-900 mb-6">System Users</h3>
                <div className="space-y-4">
                  {adminUsers.map(u => (
                    <div key={u.id || u._id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-zinc-200 rounded-full flex items-center justify-center text-zinc-500">
                          <UserIcon size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-zinc-900">{u.name}</p>
                          <p className="text-xs text-zinc-500">{u.email}</p>
                        </div>
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full",
                        u.role === 'admin' ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"
                      )}>
                        {u.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Global Activity */}
              <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
                <h3 className="text-xl font-bold text-zinc-900 mb-6">Global Activity</h3>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {adminTransactions.map(t => (
                    <div key={t._id} className="flex items-center justify-between p-4 border-b border-zinc-100 last:border-0">
                      <div>
                        <p className="font-bold text-zinc-900">{t.description}</p>
                        <p className="text-xs text-zinc-500">by {t.userId?.name || 'Unknown'}</p>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "font-bold",
                          t.type === 'income' ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-zinc-400">{format(new Date(t.date), 'MMM dd')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-zinc-900">New Transaction</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="flex p-1 bg-zinc-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setFormData({...formData, type: 'expense', category: CATEGORIES.expense[0]});
                  }}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-sm font-bold transition-all",
                    formData.type === 'expense' ? "bg-white text-rose-600 shadow-sm" : "text-zinc-500"
                  )}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({...formData, type: 'income', category: CATEGORIES.income[0]});
                  }}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-sm font-bold transition-all",
                    formData.type === 'income' ? "bg-white text-emerald-600 shadow-sm" : "text-zinc-500"
                  )}
                >
                  Income
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Description</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Grocery shopping"
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Amount ($)</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    value={formData.amount}
                    onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Date</label>
                  <input
                    required
                    type="date"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Category</label>
                <select
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all appearance-none bg-white"
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                >
                  {CATEGORIES[formData.type].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all active:scale-95 mt-4"
              >
                Save Transaction
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
