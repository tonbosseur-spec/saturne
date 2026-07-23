import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminHomeHub from './components/AdminHomeHub';
import FormBuilder from './components/FormBuilder';
import PublicFormView from './components/PublicFormView';
import DashboardAnalytics from './components/DashboardAnalytics';
import QuestionnaireDetail from './components/QuestionnaireDetail';
import Login from './components/Login';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = localStorage.getItem('admin_logged_in') === 'true';
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><AdminHomeHub /></PrivateRoute>} />
        <Route path="/builder" element={<PrivateRoute><FormBuilder /></PrivateRoute>} />
        <Route path="/builder/:id" element={<PrivateRoute><FormBuilder /></PrivateRoute>} />
        <Route path="/q/:id" element={<PrivateRoute><QuestionnaireDetail /></PrivateRoute>} />
        <Route path="/f/:id" element={<PublicFormView />} />
        <Route path="/analytics/:id" element={<PrivateRoute><DashboardAnalytics /></PrivateRoute>} />
        <Route path="/shared-dashboard/:token" element={<DashboardAnalytics />} />
      </Routes>
    </BrowserRouter>
  );
}
