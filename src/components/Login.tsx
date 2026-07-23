import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Mail, Eye, EyeOff, Loader2, AlertCircle, CheckCircle, ShieldCheck } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      let isAuthorized = false;

      // 1. Try checking against the custom admins table in Supabase if configured
      if (isSupabaseConfigured()) {
        try {
          const { data: adminRecord, error: adminError } = await supabase
            .from('admins')
            .select('*')
            .eq('email', cleanEmail)
            .eq('password', cleanPassword)
            .maybeSingle();

          if (!adminError && adminRecord) {
            isAuthorized = true;
          }
        } catch (dbErr) {
          console.warn('Database admins table check failed or table not found yet:', dbErr);
        }
      }

      // 2. Fallback to hardcoded local credentials if not verified in database yet
      if (!isAuthorized) {
        if (cleanEmail === 'pmbom@ecp.com' && cleanPassword === '4857') {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        setError('Identifiants incorrects. Seul l\'administrateur principal peut se connecter.');
        setIsLoading(false);
        return;
      }

      // 3. Optional: Sync user in Supabase Auth if needed
      if (isSupabaseConfigured()) {
        try {
          const { data, error: signInError } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: cleanPassword
          });

          if (signInError) {
            if (
              signInError.message.includes('Invalid login credentials') ||
              signInError.message.includes('Email not confirmed') ||
              signInError.message.includes('not found')
            ) {
              await supabase.auth.signUp({
                email: cleanEmail,
                password: cleanPassword
              });
            }
          }
        } catch (authErr) {
          console.warn('Supabase Auth sync skipped/unconfigured:', authErr);
        }
      }

      // Success flow
      setSuccess(true);
      localStorage.setItem('admin_logged_in', 'true');
      localStorage.setItem('admin_email', cleanEmail);

      setTimeout(() => {
        navigate('/');
      }, 1000);

    } catch (err: any) {
      setError(err.message || 'Une erreur inattendue est survenue.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Dynamic atmospheric ambient blurs */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        className="w-full max-w-md bg-white/70 backdrop-blur-2xl border border-white/60 shadow-2xl rounded-3xl p-8 sm:p-10 relative z-10 space-y-8"
      >
        {/* Header Block */}
        <div className="text-center space-y-3">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/20"
          >
            <ShieldCheck className="w-8 h-8" />
          </motion.div>
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
              Espace Administrateur
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Connectez-vous pour créer et gérer vos formulaires
            </p>
          </div>
        </div>

        {/* Form Block */}
        <form onSubmit={handleLogin} className="space-y-5">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl text-xs sm:text-sm font-semibold"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl text-xs sm:text-sm font-semibold"
              >
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 animate-bounce" />
                <span>Connexion réussie ! Redirection...</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 tracking-wide uppercase">
                Adresse Email
              </label>
              <div className="relative flex items-center rounded-2xl bg-white border border-slate-200 overflow-hidden focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all shadow-sm">
                <span className="pl-4 pr-2 text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-2 pr-4 py-3.5 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none font-medium"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 tracking-wide uppercase">
                Mot de passe
              </label>
              <div className="relative flex items-center rounded-2xl bg-white border border-slate-200 overflow-hidden focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all shadow-sm">
                <span className="pl-4 pr-2 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-2 pr-12 py-3.5 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={isLoading || success}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full flex items-center justify-center py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all text-sm disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <span>Se connecter</span>
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
