import React, { useRef, useEffect, useState } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  Heading1, 
  Heading2, 
  Heading3, 
  List, 
  ListOrdered, 
  Palette, 
  Eraser, 
  Type 
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
}

const COLOR_OPTIONS = [
  { name: 'Sombre', hex: '#1e293b' },
  { name: 'Bleu', hex: '#2563eb' },
  { name: 'Vert', hex: '#059669' },
  { name: 'Ambre', hex: '#d97706' },
  { name: 'Rouge', hex: '#dc2626' },
  { name: 'Violet', hex: '#7c3aed' },
  { name: 'Rose', hex: '#db2777' },
];

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Saisissez votre texte ici...',
  minHeight = '100px',
  className = '',
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Initialize and sync content when value changes externally
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      // Avoid overwriting if user is typing and content matches structurally
      const currentHtml = editorRef.current.innerHTML;
      if (value !== currentHtml && (value === '' || value !== undefined)) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      // If empty or only contains <br>, pass empty string
      if (html === '<br>' || html.trim() === '') {
        onChange('');
      } else {
        onChange(html);
      }
    }
  };

  const execCommand = (command: string, arg: string | undefined = undefined) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command, false, arg);
      handleInput();
    }
  };

  const applyColor = (colorHex: string) => {
    execCommand('foreColor', colorHex);
    setShowColorPicker(false);
  };

  const isEditorEmpty = !value || value.trim() === '' || value === '<br>';

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white/90 shadow-sm transition-all ${isFocused ? 'ring-2 ring-blue-500/30 border-blue-500' : 'hover:border-slate-300'} ${className}`}>
      {/* TOOLBAR */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50/80 border-b border-slate-200/80 rounded-t-2xl select-none">
        {/* Formatting Buttons */}
        <button
          type="button"
          onClick={() => execCommand('bold')}
          className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-200/80 transition-colors"
          title="Gras (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => execCommand('italic')}
          className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-200/80 transition-colors"
          title="Italique (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => execCommand('underline')}
          className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-200/80 transition-colors"
          title="Souligné (Ctrl+U)"
        >
          <Underline className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-300 my-auto mx-1 shrink-0" />

        {/* Headings */}
        <button
          type="button"
          onClick={() => execCommand('formatBlock', '<h1>')}
          className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-200/80 font-bold text-xs transition-colors flex items-center gap-0.5"
          title="Titre de niveau 1"
        >
          <Heading1 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => execCommand('formatBlock', '<h2>')}
          className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-200/80 font-bold text-xs transition-colors flex items-center gap-0.5"
          title="Titre de niveau 2"
        >
          <Heading2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => execCommand('formatBlock', '<h3>')}
          className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-200/80 font-bold text-xs transition-colors flex items-center gap-0.5"
          title="Titre de niveau 3"
        >
          <Heading3 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => execCommand('formatBlock', '<p>')}
          className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-200/80 text-xs font-semibold transition-colors"
          title="Texte normal"
        >
          <Type className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-300 my-auto mx-1 shrink-0" />

        {/* Lists */}
        <button
          type="button"
          onClick={() => execCommand('insertUnorderedList')}
          className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-200/80 transition-colors"
          title="Liste à puces"
        >
          <List className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => execCommand('insertOrderedList')}
          className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-200/80 transition-colors"
          title="Liste numérotée"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-300 my-auto mx-1 shrink-0" />

        {/* Color Palette Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-200/80 transition-colors flex items-center gap-1"
            title="Couleur du texte"
          >
            <Palette className="w-4 h-4" />
          </button>

          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-white rounded-xl shadow-xl border border-slate-200 z-30 flex items-center gap-1.5">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => applyColor(c.hex)}
                  className="w-5 h-5 rounded-full border border-slate-300 hover:scale-110 transition-transform shadow-2xs"
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          )}
        </div>

        {/* Eraser */}
        <button
          type="button"
          onClick={() => execCommand('removeFormat')}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 transition-colors ml-auto"
          title="Effacer le formatage"
        >
          <Eraser className="w-4 h-4" />
        </button>
      </div>

      {/* EDITABLE AREA */}
      <div className="relative">
        {isEditorEmpty && !isFocused && (
          <div className="absolute top-3 left-4 text-slate-400 text-sm pointer-events-none italic">
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{ minHeight }}
          className="p-3 sm:p-4 text-sm sm:text-base text-slate-800 outline-none rich-text-area leading-relaxed"
        />
      </div>
    </div>
  );
};

interface RichTextRendererProps {
  content?: string | null;
  className?: string;
}

export const RichTextRenderer: React.FC<RichTextRendererProps> = ({
  content,
  className = '',
}) => {
  if (!content) return null;

  // Check if content contains HTML tags
  const isHtml = /<[a-z][\s\S]*>/i.test(content);

  if (!isHtml) {
    // Preserve linebreaks for legacy plaintext
    return (
      <div className={`whitespace-pre-line text-slate-700 leading-relaxed ${className}`}>
        {content}
      </div>
    );
  }

  return (
    <div
      className={`rich-text-content text-slate-700 leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};
