import React, { useState, useCallback } from 'react';
import { useLiveSession } from '../hooks/useLiveSession';
import WaveformIcon from './icons/WaveformIcon';
import ResultsDisplay from './ResultsDisplay';
import CustomPromptInput from './ui/CustomPromptInput';
import { GEMINI_FLASH_LITE_MODEL } from '../constants';
import { SelectedTemplateData } from './ui/TemplateSelectionModal';

interface LiveDictationProps {
    onComplete: (transcript: string, audioBlob: Blob | null) => void;
    onBack: () => void;
    selectedTemplate?: SelectedTemplateData | null;
}

const LiveDictation: React.FC<LiveDictationProps> = ({ onComplete, onBack, selectedTemplate = null }) => {
    const [findings, setFindings] = useState<string[]>([]);
    const [customPrompt, setCustomPrompt] = useState('');
    const [liveModel, setLiveModel] = useState<'gemini-3.5-flash-lite' | 'gemini-3.1-flash-lite'>('gemini-3.5-flash-lite');

    const {
        status,
        error,
        isSessionActive,
        startSession,
        stopSession,
        pauseSession,
        resumeSession,
        syncFindings,
    } = useLiveSession();

    const handleStart = useCallback(() => {
        // If a template is selected, prepend template guidance to customPrompt
        let fullPrompt = customPrompt;
        if (selectedTemplate) {
            const templateGuide = `Active Template: ${selectedTemplate.name} (${selectedTemplate.category || selectedTemplate.modality}). Normal findings structure: ${selectedTemplate.lines.slice(0, 5).join('; ')}...`;
            fullPrompt = fullPrompt ? `${templateGuide}\n${fullPrompt}` : templateGuide;
        }
        startSession(setFindings, fullPrompt, liveModel);
    }, [startSession, customPrompt, selectedTemplate, liveModel]);

    const handleStop = useCallback(() => {
        const { transcript, audioBlob } = stopSession();
        onComplete(transcript, audioBlob);
    }, [stopSession, onComplete]);

    const handleUpdateFinding = (index: number, newText: string) => {
        const newFindings = [...findings];
        if (newFindings[index] !== undefined) {
            newFindings[index] = newText;
        }
        setFindings(newFindings);
        syncFindings(newFindings);
    };

    const handleAllFindingsUpdate = (newFindings: string[]) => {
        setFindings(newFindings);
        syncFindings(newFindings);
    };

    if (!isSessionActive) {
        return (
            <div className="flex flex-col items-center justify-center p-4">
                <div className="relative mb-6">
                    <div className="relative w-24 h-24 rounded-full bg-white dark:bg-slate-700 shadow-lg flex items-center justify-center">
                        <WaveformIcon className="w-10 h-10 text-green-600 dark:text-green-400 animate-pulse" />
                    </div>
                </div>
                <h2 className="text-2xl font-semibold text-slate-700 dark:text-slate-200 mb-2 text-center">
                    Live Dictation
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mb-6 text-center max-w-lg text-sm sm:text-base">
                    Dictate radiology findings live. Spoken audio is transcribed continuously into clean, structured report lines.
                </p>

                {/* Model Selector Card */}
                <div className="w-full max-w-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 p-4 rounded-xl mb-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block mb-1">
                            Live AI Model
                        </span>
                        <div className="flex items-center gap-2">
                            <select
                                value={liveModel}
                                onChange={(e) => setLiveModel(e.target.value as any)}
                                className="bg-white border border-emerald-300 dark:border-emerald-700 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 dark:bg-slate-800"
                            >
                                <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash-Lite (Default - Fast)</option>
                                <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash-Lite</option>
                            </select>
                        </div>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-800/50 dark:text-emerald-200 self-start sm:self-auto">
                        ⚡ Real-Time Streaming
                    </span>
                </div>

                {/* Selected Template Indicator if active */}
                {selectedTemplate && (
                    <div className="w-full max-w-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 p-3 rounded-xl mb-4 text-xs text-blue-900 dark:text-blue-200 flex items-center justify-between">
                        <div>
                            <span className="font-bold block text-blue-950 dark:text-blue-100">
                                📄 Active Template: {selectedTemplate.name}
                            </span>
                            <span className="text-blue-700 dark:text-blue-300 text-[11px]">
                                Findings will merge into this template upon completion.
                            </span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-bold text-[10px]">
                            {selectedTemplate.modality}
                        </span>
                    </div>
                )}

                {/* Voice Commands Guide */}
                <div className="w-full max-w-md bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-4 rounded-xl mb-6 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
                    <p className="font-semibold text-sm mb-1 text-slate-900 dark:text-slate-100">💡 Natural Voice Commands:</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li>Say <strong>"move to next line"</strong> or <strong>"next line"</strong> for a new line.</li>
                        <li>Say <strong>"new finding"</strong> or <strong>"next finding"</strong> to start a separate bold finding.</li>
                        <li>Say <strong>"full stop"</strong> for periods, <strong>"comma"</strong> for commas, <strong>"colon"</strong> for colons.</li>
                        <li>Say <strong>"impression section"</strong> to start an IMPRESSION block.</li>
                    </ul>
                </div>

                <div className="w-full max-w-md mb-6">
                   <CustomPromptInput 
                        prompt={customPrompt} 
                        onPromptChange={setCustomPrompt}
                        isLiveMode={true}
                    />
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="bg-slate-200 text-slate-700 font-bold py-3 px-8 rounded-full hover:bg-slate-300 transition-colors dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                    >
                        &larr; Back
                    </button>
                    <button
                        onClick={handleStart}
                        className="flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-3 px-8 rounded-full hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-300 transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                        aria-label="Start Live Session"
                    >
                        <WaveformIcon className="w-6 h-6" />
                        Start Live Dictation
                    </button>
                </div>
                <div className="mt-6 text-center text-sm min-h-[20px]">
                    {error ? <span className="text-red-500 font-medium">{error}</span> : <span className="text-slate-500 dark:text-slate-400">{status}</span>}
                </div>
            </div>
        );
    }

    return (
        <ResultsDisplay
            isLive={true}
            onStopLive={handleStop}
            liveStatus={status}
            liveError={error}
            findings={findings}
            onUpdateFinding={handleUpdateFinding}
            onAllFindingsUpdate={handleAllFindingsUpdate}
            onPauseLive={pauseSession}
            onResumeLive={resumeSession}
            customPrompt={customPrompt}
            onCustomPromptChange={setCustomPrompt}
            onReset={onBack}
            audioBlob={null}
            chatHistory={[]}
            isChatting={false}
            onSendMessage={() => {}}
            onSwitchToBatch={() => {}}
            selectedModel={liveModel}
            onModelChange={() => {}}
            onReprocess={() => {}}
            onContinueDictation={async () => {}}
            customImages={[]}
            onCustomImagesChange={() => {}}
            identifiedErrors={[]}
            errorCheckStatus={'idle'}
            selectedTemplate={selectedTemplate}
        />
    );
};

export default LiveDictation;
