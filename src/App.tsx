import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdminHomeHub from './components/AdminHomeHub';
import FormBuilder from './components/FormBuilder';
import PublicFormView from './components/PublicFormView';
import DashboardAnalytics from './components/DashboardAnalytics';
import QuestionnaireDetail from './components/QuestionnaireDetail';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AdminHomeHub />} />
        <Route path="/builder" element={<FormBuilder />} />
        <Route path="/builder/:id" element={<FormBuilder />} />
        <Route path="/q/:id" element={<QuestionnaireDetail />} />
        <Route path="/f/:id" element={<PublicFormView />} />
        <Route path="/analytics/:id" element={<DashboardAnalytics />} />
        <Route path="/shared-dashboard/:token" element={<DashboardAnalytics />} />
      </Routes>
    </BrowserRouter>
  );
}
