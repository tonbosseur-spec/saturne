import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Question } from '../types';
import { Download, FileSpreadsheet, FileText, Loader2, BarChart3 } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Link } from 'react-router-dom';

interface DataExportProps {
  questionnaireId?: string;
  questions: Question[];
  dashboardToken?: string;
}

export default function DataExport({ questionnaireId, questions, dashboardToken }: DataExportProps) {
  const [isExporting, setIsExporting] = useState<'csv' | 'xlsx' | null>(null);
  const [message, setMessage] = useState('');

  const fetchAndFormatDataCSV = async () => {
    if (!questionnaireId) {
      throw new Error("Veuillez sauvegarder le questionnaire avant d'exporter.");
    }

    // Fallback pour la démo sans vraie base de données
    if (questionnaireId === 'demo-id' && !isSupabaseConfigured()) {
      await new Promise(resolve => setTimeout(resolve, 1200));
      return [
        { 
          "Date de soumission": new Date().toLocaleString(), 
          [questions[0]?.label || 'Q1']: 'John Doe', 
          [questions[1]?.label || 'Q2']: 'Option 2',
          [questions[2]?.label || 'Q3']: 'Choix A, Choix B'
        },
        { 
          "Date de soumission": new Date(Date.now() - 86400000).toLocaleString(), 
          [questions[0]?.label || 'Q1']: 'Alice Smith', 
          [questions[1]?.label || 'Q2']: 'Option 1',
          [questions[2]?.label || 'Q3']: 'Choix C'
        }
      ];
    }

    const { data, error } = await supabase
      .from('responses')
      .select('created_at, payload')
      .eq('questionnaire_id', questionnaireId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      throw new Error('Aucune réponse à exporter pour le moment.');
    }

    // Aplatissement des données (Flattening)
    return data.map(row => {
      const formattedRow: Record<string, any> = {
        'Date de soumission': new Date(row.created_at).toLocaleString()
      };

      questions.forEach(q => {
        let answer = row.payload[q.id];
        // Transformation des tableaux (ex: cases à cocher) en chaîne de caractères
        if (Array.isArray(answer)) {
          answer = answer.join(', ');
        }
        formattedRow[q.label] = answer || '';
      });

      return formattedRow;
    });
  };

  const handleExportCSV = async () => {
    try {
      setIsExporting('csv');
      setMessage('');
      const data = await fetchAndFormatDataCSV();
      
      const csv = Papa.unparse(data);
      // Ajout du BOM pour forcer Excel à lire le CSV en UTF-8
      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' }); 
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `export_reponses_${new Date().getTime()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting('xlsx');
      setMessage('');
      
      if (!questionnaireId) {
        throw new Error("Veuillez sauvegarder le questionnaire avant d'exporter.");
      }

      let rawData: any[] = [];
      // Fallback pour la démo sans vraie base de données
      if (questionnaireId === 'demo-id' && !isSupabaseConfigured()) {
        await new Promise(resolve => setTimeout(resolve, 1200));
        rawData = [
          {
            respondent_id: 'R-Demo1',
            created_at: new Date().toISOString(),
            payload: {
              [questions[0]?.id || 'q1']: 'John Doe',
              [questions[1]?.id || 'q2']: 'Option 2',
              [questions[2]?.id || 'q3']: ['Choix A', 'Choix B']
            }
          },
          {
            respondent_id: 'R-Demo2',
            created_at: new Date(Date.now() - 86400000).toISOString(),
            payload: {
              [questions[0]?.id || 'q1']: 'Alice Smith',
              [questions[1]?.id || 'q2']: 'Option 1',
              [questions[2]?.id || 'q3']: ['Choix C']
            }
          }
        ];
      } else {
        const { data, error } = await supabase
          .from('responses')
          .select('respondent_id, created_at, payload')
          .eq('questionnaire_id', questionnaireId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error('Aucune réponse à exporter pour le moment.');
        }
        rawData = data;
      }

      // Feuille 1: Données
      const dataSheetData = rawData.map(row => {
        const formattedRow: Record<string, any> = {
          'respondent_id': row.respondent_id || 'N/A',
          'Date de soumission': new Date(row.created_at).toLocaleString()
        };

        questions.forEach(q => {
          let answer = row.payload[q.id];
          if (Array.isArray(answer)) {
            answer = answer.join(', ');
          }
          const colKey = q.question_code || q.id;
          formattedRow[colKey] = answer !== undefined && answer !== null ? answer : '';
        });

        return formattedRow;
      });

      // Feuille 2: Description (Dictionnaire de données)
      const descriptionSheetData = questions.map(q => {
        let typeDesc = q.type === 'text' ? 'Texte libre' 
                     : q.type === 'number' ? 'Nombre'
                     : q.type === 'multiple_choice' ? 'Choix unique' 
                     : 'Choix multiple';
        if (q.is_required) typeDesc += ' (Obligatoire)';

        return {
          'Code Variable': q.question_code || q.id,
          'Question Posée': q.label || 'Sans titre',
          'Description': q.description_text || typeDesc
        };
      });

      // Génération du classeur
      const workbook = XLSX.utils.book_new();
      
      const dataWorksheet = XLSX.utils.json_to_sheet(dataSheetData);
      XLSX.utils.book_append_sheet(workbook, dataWorksheet, 'Données');
      
      const descWorksheet = XLSX.utils.json_to_sheet(descriptionSheetData);
      XLSX.utils.book_append_sheet(workbook, descWorksheet, 'Description');
      
      XLSX.writeFile(workbook, `export_reponses_${new Date().getTime()}.xlsx`);
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="p-6 bg-white border border-neutral-200 rounded-xl shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
          <Download className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-semibold text-neutral-900">Export des données</h3>
      </div>
      
      <p className="text-sm text-neutral-500 mb-6">
        Téléchargez les réponses collectées sous forme de tableau. Les en-têtes de colonnes correspondent aux questions définies dans votre formulaire.
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={handleExportCSV}
          disabled={!!isExporting || !questionnaireId}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-white border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-all font-medium text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {isExporting === 'csv' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-neutral-400" />}
          Exporter en CSV
        </button>

        <button
          onClick={handleExportExcel}
          disabled={!!isExporting || !questionnaireId}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-all font-medium text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {isExporting === 'xlsx' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 text-emerald-500" />}
          Exporter en Excel (.xlsx)
        </button>
      </div>

      {message && (
        <div className="mt-4 p-4 bg-neutral-50 text-neutral-700 text-sm rounded-lg border border-neutral-100 flex items-start gap-3">
          <div className="mt-0.5">ℹ️</div>
          <p>{message}</p>
        </div>
      )}
      
      {!questionnaireId && !message && (
        <div className="mt-4 text-xs font-medium text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-100">
          Vous devez sauvegarder ce questionnaire au moins une fois pour activer l'export.
        </div>
      )}

      {questionnaireId && (
        <div className="mt-8 pt-6 border-t border-neutral-100 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-neutral-900 mb-1">Visualiser les résultats</h4>
              <p className="text-xs text-neutral-500">Accédez au tableau de bord pour une analyse graphique des réponses.</p>
            </div>
            <Link
              to={`/analytics/${questionnaireId}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 shadow-sm"
            >
              <BarChart3 className="w-4 h-4" />
              Tableau de bord privé
            </Link>
          </div>

          {dashboardToken && (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <h4 className="text-sm font-medium text-blue-900 mb-1">Partage du tableau de bord</h4>
              <p className="text-xs text-blue-700 mb-3">
                Lien public en lecture seule pour partager les résultats en temps réel.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/shared-dashboard/${dashboardToken}`}
                  className="flex-1 px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm text-blue-800 outline-none"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}/shared-dashboard/${dashboardToken}`)}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Copier
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
