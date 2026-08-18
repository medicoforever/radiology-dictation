import React from 'react';
import SparklesIcon from '../icons/SparklesIcon';
import CloseIcon from '../icons/CloseIcon';
import { SelectedTemplateData } from './TemplateSelectionModal';

interface TemplateSelectorBannerProps {
  selectedTemplate: SelectedTemplateData | null;
  onOpenModal: () => void;
  onClearTemplate: () => void;
  autoDownloadDocx: boolean;
  onToggleAutoDownload: (enabled: boolean) => void;
  className?: string;
}

const TemplateSelectorBanner: React.FC<TemplateSelectorBannerProps> = ({
  selectedTemplate,
  onOpenModal,
  onClearTemplate,
  autoDownloadDocx,
  onToggleAutoDownload,
  className = '',
}) => {
  return (
    <div className={`w-full bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-4 shadow-sm ${className}`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Left: Template Info & Badge */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 flex-shrink-0">
            <SparklesIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Report Template
              </span>
              {selectedTemplate ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {selectedTemplate.modality}
                </span>
              ) : (
                <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                  (Standard dictation mode)
                </span>
              )}
            </div>

            {selectedTemplate ? (
              <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 mt-0.5 flex items-center gap-2">
                <span>{selectedTemplate.name}</span>
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400 hidden md:inline">
                  • {selectedTemplate.category}
                </span>
              </h3>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Select from 560+ Dr. Gopinath & Centricity RIS formats to auto-merge findings into native Word DOCX.
              </p>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          {selectedTemplate ? (
            <>
              <button
                type="button"
                onClick={onOpenModal}
                className="text-xs font-bold px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors shadow-sm"
              >
                Change Template
              </button>
              <button
                type="button"
                onClick={onClearTemplate}
                className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                title="Clear active template"
                aria-label="Clear template"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onOpenModal}
              className="w-full sm:w-auto text-xs font-bold px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <SparklesIcon className="w-4 h-4" />
              Select Template (560+ Formats)
            </button>
          )}
        </div>
      </div>

      {/* Auto-Download DOCX Setting Row */}
      {selectedTemplate && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
          <span className="text-slate-600 dark:text-slate-300">
            📄 <strong>Native DOCX Integration:</strong> Spoken abnormal findings will be merged into this template preserving all font styles and margins.
          </span>
          <label className="flex items-center gap-2 cursor-pointer select-none font-semibold text-slate-700 dark:text-slate-300">
            <span>Auto-Download Merged DOCX</span>
            <input
              type="checkbox"
              checked={autoDownloadDocx}
              onChange={e => onToggleAutoDownload(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </label>
        </div>
      )}
    </div>
  );
};

export default TemplateSelectorBanner;
