import React, { useState, useCallback, useEffect, useRef } from 'react';
import AudioRecorder from './components/AudioRecorder';
import ResultsDisplay from './components/ResultsDisplay';
import { AppStatus, IdentifiedError } from './types';
import { processAudio, createChat, blobToBase64, base64ToBlob, createChatFromText, identifyPotentialErrors } from './services/geminiService';
import Spinner from './components/ui/Spinner';
import { Chat } from '@google/genai';
import { saveAudioBlob, getAudioBlob, deleteAudioBlob } from './services/audioStorage';
import { BatchProcessor } from './components/BatchProcessor';
import LiveDictation from './components/LiveDictation';
import MergeTemplateProcessor from './components/MergeTemplateProcessor';
import WaveformIcon from './components/icons/WaveformIcon';
import SunIcon from './components/icons/SunIcon';
import MoonIcon from './components/icons/MoonIcon';
import CustomPromptInput from './components/ui/CustomPromptInput';
import TemplateSelectorBanner from './components/ui/TemplateSelectorBanner';
import TemplateSelectionModal, { SelectedTemplateData } from './components/ui/TemplateSelectionModal';
import { mergeFindingsIntoDocx, downloadDocxBlob } from './services/docxService';
import { getUserTemplates, UserTemplate } from './services/templateStorage';

interface ChatMessage {
  author: 'You' | 'AI';
  text: string;
}

const SINGLE_MODE_STORAGE_KEY = 'radiologyDictationSingleMode';
const ERROR_CHECK_ENABLED_KEY = 'radiologyErrorCheckEnabled';
const TEMPLATE_STORAGE_KEY = 'radiologyDictationActiveTemplate';

const getCleanMimeType = (blob: Blob): string => {
    let mimeType = blob.type;
    if (!mimeType) {
        return 'audio/ogg';
    }
    if (mimeType.startsWith('audio/webm') || mimeType.startsWith('video/webm')) {
        return 'audio/webm';
    }
    return mimeType.split(';')[0];
};

const App: React.FC = () => {
  const [mode, setMode] = useState<'single' | 'batch' | 'live' | 'merge_template'>('single');
  const [status, setStatus] = useState<AppStatus>(AppStatus.Idle);
  const [findings, setFindings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const isCancelledRef = useRef<boolean>(false);

  const [chat, setChat] = useState<Chat | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatting, setIsChatting] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.5-flash');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [customImages, setCustomImages] = useState<Array<{ data: string; mimeType: string }>>([]);
  const [identifiedErrors, setIdentifiedErrors] = useState<IdentifiedError[]>([]);
  const [errorCheckStatus, setErrorCheckStatus] = useState<'idle' | 'checking' | 'complete'>('idle');

  // Template state (optional: only if selected by user)
  const [selectedTemplate, setSelectedTemplate] = useState<SelectedTemplateData | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [autoDownloadDocx, setAutoDownloadDocx] = useState<boolean>(true);
  const [userCustomTemplates, setUserCustomTemplates] = useState<UserTemplate[]>([]);

  const [theme, setTheme] = useState(() => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) {
      return storedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [isErrorCheckEnabled, setIsErrorCheckEnabled] = useState(() => {
    const saved = localStorage.getItem(ERROR_CHECK_ENABLED_KEY);
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);
  
  useEffect(() => {
    localStorage.setItem(ERROR_CHECK_ENABLED_KEY, JSON.stringify(isErrorCheckEnabled));
  }, [isErrorCheckEnabled]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const loadUserCustomTemplates = async () => {
    try {
      const list = await getUserTemplates();
      setUserCustomTemplates(list);
    } catch (e) {
      console.warn('Could not load custom user templates:', e);
    }
  };

  useEffect(() => {
    loadUserCustomTemplates();
  }, []);

  const [isRestored, setIsRestored] = useState(false);

  // Load state from localStorage & IndexedDB on initial render
  useEffect(() => {
    const loadState = async () => {
      try {
        const savedTemplateJSON = localStorage.getItem(TEMPLATE_STORAGE_KEY);
        if (savedTemplateJSON) {
          try {
            const savedTmpl = JSON.parse(savedTemplateJSON);
            setSelectedTemplate(savedTmpl);
          } catch (e) {}
        }

        const savedStateJSON = localStorage.getItem(SINGLE_MODE_STORAGE_KEY);
        if (savedStateJSON) {
          const savedState = JSON.parse(savedStateJSON);
          if (savedState.findings && savedState.findings.length > 0) {
            let blob: Blob | null = null;
            blob = await getAudioBlob('single_mode_audio');

            if (!blob && savedState.audio?.data) {
              try {
                blob = base64ToBlob(savedState.audio.data, savedState.audio.type);
              } catch (e) {
                console.warn("Could not decode legacy base64 audio:", e);
              }
            }

            setAudioBlob(blob);
            setFindings(savedState.findings);
            setChatHistory(savedState.chatHistory || []);
            setStatus(AppStatus.Success);
            
            setSelectedModel(savedState.selectedModel || 'gemini-3.1-pro-preview');
            setCustomPrompt(savedState.customPrompt || '');
            setCustomImages(savedState.customImages || []);

            const chatPromise = blob 
                ? createChat(blob, savedState.findings, savedState.customPrompt, savedState.customImages)
                : createChatFromText(savedState.findings, savedState.customPrompt, savedState.customImages);

            chatPromise
              .then(setChat)
              .catch(err => console.error("Failed to recreate chat session from saved state:", err));
          }
        }
      } catch (err) {
        console.error("Failed to load state from localStorage:", err);
        localStorage.removeItem(SINGLE_MODE_STORAGE_KEY);
      } finally {
        setIsRestored(true);
      }
    };
    loadState();
  }, []);

  // Save state to localStorage & IndexedDB whenever it changes
  useEffect(() => {
    if (!isRestored) return;

    const saveState = async () => {
      if (selectedTemplate) {
        localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(selectedTemplate));
      } else {
        localStorage.removeItem(TEMPLATE_STORAGE_KEY);
      }

      if (status === AppStatus.Success && findings.length > 0) {
        try {
          const stateToSave: any = {
            findings,
            chatHistory,
            selectedModel,
            customPrompt,
            customImages,
            hasAudio: !!audioBlob,
          };
          localStorage.setItem(SINGLE_MODE_STORAGE_KEY, JSON.stringify(stateToSave));

          if (audioBlob) {
            await saveAudioBlob('single_mode_audio', audioBlob);
          } else {
            await deleteAudioBlob('single_mode_audio');
          }
        } catch (err) {
          console.error("Failed to save state:", err);
        }
      } else if (status === AppStatus.Idle && findings.length === 0) {
        localStorage.removeItem(SINGLE_MODE_STORAGE_KEY);
        deleteAudioBlob('single_mode_audio').catch(() => {});
      }
    };
    saveState();
  }, [status, findings, audioBlob, chatHistory, selectedModel, customPrompt, customImages, selectedTemplate, isRestored]);

  // Background error check
  useEffect(() => {
    const checkForErrors = async () => {
        if (isErrorCheckEnabled && status === AppStatus.Success && findings.length > 0) {
            setErrorCheckStatus('checking');
            setIdentifiedErrors([]);
            try {
                const errors = await identifyPotentialErrors(findings, selectedModel);
                setIdentifiedErrors(errors);
            } catch (err) {
                console.error("Failed to check for errors:", err);
            } finally {
                setErrorCheckStatus('complete');
            }
        } else {
            setIdentifiedErrors([]);
            setErrorCheckStatus('idle');
        }
    };

    checkForErrors();
  }, [findings, status, selectedModel, isErrorCheckEnabled]);

  const handleCancelProcessing = useCallback(() => {
    isCancelledRef.current = true;
    setStatus(AppStatus.Idle);
    setError(null);
  }, []);

  const handleRecordingComplete = useCallback(async (audioBlob: Blob) => {
    if (!audioBlob || audioBlob.size === 0) {
      setError('Recording or upload failed. The audio file is empty.');
      setStatus(AppStatus.Error);
      return;
    }
    isCancelledRef.current = false;
    setStatus(AppStatus.Processing);
    setError(null);
    setFindings([]);
    setAudioBlob(audioBlob);

    try {
      const processedText = await processAudio(
        audioBlob,
        selectedModel,
        customPrompt,
        customImages,
        undefined,
        selectedTemplate
      );
      if (isCancelledRef.current) return;
      setFindings(processedText);

      // DOCX merge & auto-download if template is selected
      if (selectedTemplate && autoDownloadDocx && processedText.length > 0) {
        try {
          const docxBase64 = selectedTemplate.docxBase64;
          const title = selectedTemplate.name || processedText[0] || 'Radiology_Report';
          const cleanFileName = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.docx`;
          const blob = await mergeFindingsIntoDocx(docxBase64, processedText, title);
          if (!isCancelledRef.current) {
            downloadDocxBlob(blob, cleanFileName);
          }
        } catch (docErr) {
          console.warn('Auto DOCX download error:', docErr);
        }
      }

      if (isCancelledRef.current) return;
      const chatSession = await createChat(audioBlob, processedText, customPrompt, customImages);
      if (isCancelledRef.current) return;
      setChat(chatSession);
      const aiGreeting = "I have reviewed the audio and the transcript. How can I help you further?";
      setChatHistory([{ author: 'AI', text: `${processedText.join('\n\n')}\n\n${aiGreeting}` }]);
      
      setStatus(AppStatus.Success);
    } catch (err) {
      if (isCancelledRef.current) return;
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred during processing.');
      setStatus(AppStatus.Error);
    }
  }, [selectedModel, customPrompt, customImages, selectedTemplate, autoDownloadDocx]);

  
  const handleLiveDictationComplete = useCallback(async (transcript: string, audioBlob: Blob | null) => {
    setStatus(AppStatus.Processing);
    setError(null);
    setFindings([]);
    setAudioBlob(audioBlob);

    try {
        const processedText = transcript.split('\n').filter(line => line.trim() !== '');
        setFindings(processedText);

        // DOCX merge & auto-download if template is selected
        if (selectedTemplate && autoDownloadDocx && processedText.length > 0) {
          try {
            const docxBase64 = selectedTemplate.docxBase64;
            const title = selectedTemplate.name || processedText[0] || 'Radiology_Report';
            const cleanFileName = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.docx`;
            const blob = await mergeFindingsIntoDocx(docxBase64, processedText, title);
            downloadDocxBlob(blob, cleanFileName);
          } catch (docErr) {
            console.warn('Auto DOCX download error:', docErr);
          }
        }
        
        const chatSession = await createChatFromText(processedText, customPrompt, customImages);
        setChat(chatSession);

        const aiGreeting = "I have reviewed the live transcript. How can I help you further?";
        setChatHistory([{ author: 'AI', text: `${processedText.join('\n\n')}\n\n${aiGreeting}` }]);

        setMode('single');
        setStatus(AppStatus.Success);

    } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred during live processing.');
        setStatus(AppStatus.Error);
        setMode('single');
    }
  }, [customPrompt, customImages, selectedTemplate, autoDownloadDocx]);

  const handleReprocess = useCallback(async () => {
    if (!audioBlob) {
      setError('No audio available to reprocess.');
      setStatus(AppStatus.Error);
      return;
    }

    setStatus(AppStatus.Processing);
    setError(null);
    
    try {
      const processedText = await processAudio(
        audioBlob,
        selectedModel,
        customPrompt,
        customImages,
        findings,
        selectedTemplate
      );
      setFindings(processedText);

      // DOCX merge & auto-download ONLY if template is selected
      if (selectedTemplate && autoDownloadDocx && processedText.length > 0) {
        try {
          const docxBase64 = selectedTemplate.docxBase64;
          if (docxBase64) {
            const title = selectedTemplate.name || processedText[0] || 'Radiology_Report';
            const cleanFileName = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.docx`;
            const blob = await mergeFindingsIntoDocx(docxBase64, processedText, title);
            downloadDocxBlob(blob, cleanFileName);
          }
        } catch (docErr) {
          console.warn('Auto DOCX download error:', docErr);
        }
      }

      const chatSession = await createChat(audioBlob, processedText, customPrompt, customImages);
      setChat(chatSession);
      const aiGreeting = "I have re-processed the audio with your new instructions. How can I help you further?";
      setChatHistory([{ author: 'AI', text: `${processedText.join('\n\n')}\n\n${aiGreeting}` }]);
      
      setStatus(AppStatus.Success);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred during re-processing.');
      setStatus(AppStatus.Error);
    }
  }, [audioBlob, selectedModel, customPrompt, customImages, findings, selectedTemplate, autoDownloadDocx]);

  const handleUpdateFinding = (index: number, newText: string) => {
    setFindings(prevFindings => {
      const updatedFindings = [...prevFindings];
      if (updatedFindings[index] !== undefined) {
        updatedFindings[index] = newText;
      }
      return updatedFindings;
    });
  };

  const handleSendMessage = useCallback(async (message: string | Blob) => {
    if (!chat) return;

    setIsChatting(true);
    let userMessageText = '';

    if (typeof message === 'string') {
        userMessageText = message;
    } else {
        userMessageText = 'Dictated instruction sent.';
    }

    setChatHistory(prevHistory => [...prevHistory, { author: 'You', text: userMessageText }]);

    try {
        let messageParam: any;

        if (typeof message === 'string') {
            messageParam = message;
        } else {
            const base64Audio = await blobToBase64(message);
            messageParam = [
                {
                    inlineData: {
                        mimeType: getCleanMimeType(message),
                        data: base64Audio,
                    },
                },
                {
                    text: 'Please listen to the audio and answer the question or follow the instructions.',
                },
            ];
        }

        const response = await chat.sendMessage(messageParam);
        const modelResponse = response.text;
        setChatHistory(prevHistory => [...prevHistory, { author: 'AI', text: modelResponse }]);
    } catch (err) {
        console.error("Chat error:", err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setChatHistory(prevHistory => [
            ...prevHistory,
            { author: 'AI', text: `Sorry, I encountered an error: ${errorMessage}` },
        ]);
    } finally {
        setIsChatting(false);
    }
  }, [chat]);

  const resetSingleMode = () => {
    setStatus(AppStatus.Idle);
    setFindings([]);
    setError(null);
    setAudioBlob(null);
    setChat(null);
    setChatHistory([]);
    setIsChatting(false);
    setIdentifiedErrors([]);
    setErrorCheckStatus('idle');
  };

  const handleContinueDictation = async (newAudioBlob: Blob) => {
    setStatus(AppStatus.Processing);
    try {
        const fullTranscript = findings.join('\n');
        const processedText = await processAudio(
          newAudioBlob,
          selectedModel,
          customPrompt,
          customImages,
          findings,
          selectedTemplate
        );
        setFindings(processedText);

        if (selectedTemplate && autoDownloadDocx && processedText.length > 0) {
          try {
            const docxBase64 = selectedTemplate.docxBase64;
            if (docxBase64) {
              const title = selectedTemplate.name || processedText[0] || 'Radiology_Report';
              const cleanFileName = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.docx`;
              const blob = await mergeFindingsIntoDocx(docxBase64, processedText, title);
              downloadDocxBlob(blob, cleanFileName);
            }
          } catch (docErr) {
            console.warn('Auto DOCX download error:', docErr);
          }
        }

        const chatSession = await createChatFromText(processedText, customPrompt, customImages);
        setChat(chatSession);
        const aiGreeting = "I've appended your new dictation. How can I help you further?";
        setChatHistory([{ author: 'AI', text: `${processedText.join('\n\n')}\n\n${aiGreeting}` }]);
        
        setStatus(AppStatus.Success);
    } catch (err) {
        console.error("Failed to continue dictation with full reprocessing:", err);
        setError(err instanceof Error ? err.message : 'Failed to append dictation.');
        setStatus(AppStatus.Error);
    }
  };

  const handleDownload = () => {
    if (audioBlob) {
      try {
        const url = URL.createObjectURL(audioBlob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        const mimeType = audioBlob.type;
        const extension = mimeType === 'audio/mpeg' ? 'mp3' : (mimeType.split('/')[1] || 'webm').split(';')[0];
        a.download = `radiology_recording.${extension}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      } catch (err) {
        console.error('Failed to download audio:', err);
      }
    }
  };

  const renderSingleModeContent = () => {
    switch (status) {
      case AppStatus.Idle:
      case AppStatus.Recording:
        return (
          <>
            <div className="flex justify-end items-center gap-3 mb-4 -mt-4 flex-wrap">
                 <button 
                    onClick={() => setMode('merge_template')} 
                    className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-teal-600 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300 transition-colors bg-teal-50 dark:bg-teal-950/40 px-3 py-1.5 rounded-xl border border-teal-200 dark:border-teal-850"
                >
                    📑 Merge Findings to Template
                </button>
                 <button 
                    onClick={() => setMode('live')} 
                    className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                >
                    <WaveformIcon className="w-4 h-4" />
                    Live Dictation
                </button>
                 <button 
                    onClick={() => setMode('batch')} 
                    className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                    Batch Processing &rarr;
                </button>
            </div>

            {/* Template Selector Banner at Top */}
            <TemplateSelectorBanner
              selectedTemplate={selectedTemplate}
              onOpenModal={() => setIsTemplateModalOpen(true)}
              onClearTemplate={() => setSelectedTemplate(null)}
              autoDownloadDocx={autoDownloadDocx}
              onToggleAutoDownload={setAutoDownloadDocx}
              className="mb-4"
            />

             <CustomPromptInput
                prompt={customPrompt}
                onPromptChange={setCustomPrompt}
                images={customImages}
                onImagesChange={setCustomImages}
                className="mb-6"
            />
            <AudioRecorder
              status={status}
              setStatus={setStatus}
              onRecordingComplete={handleRecordingComplete}
            />
          </>
        );
      case AppStatus.Processing:
        return (
          <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 max-w-xl mx-auto my-6">
            <Spinner className="w-12 h-12 mx-auto text-blue-600 mb-2" />
            <p className="text-slate-700 dark:text-slate-200 mt-4 text-xl font-semibold">
              {selectedTemplate ? `Integrating findings into ${selectedTemplate.name}...` : 'Analyzing and correcting text...'}
            </p>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
              {selectedTemplate && autoDownloadDocx ? 'Your formatted Word DOCX report will be downloaded automatically.' : 'This may take a moment.'}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={handleCancelProcessing}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-6 rounded-xl shadow transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
                aria-label="Cancel processing"
              >
                Cancel
              </button>
              {audioBlob && (
                <button
                  onClick={handleDownload}
                  className="bg-slate-500 text-white font-semibold py-2.5 px-6 rounded-xl hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 transition-colors"
                >
                  Download File
                </button>
              )}
            </div>
          </div>
        );

      case AppStatus.Success:
        return (
          <ResultsDisplay 
            findings={findings} 
            onReset={resetSingleMode} 
            audioBlob={audioBlob}
            chatHistory={chatHistory}
            isChatting={isChatting}
            onSendMessage={handleSendMessage}
            onSwitchToBatch={() => setMode('batch')}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            onReprocess={handleReprocess}
            onUpdateFinding={handleUpdateFinding}
            onAllFindingsUpdate={setFindings}
            onContinueDictation={handleContinueDictation}
            customPrompt={customPrompt}
            onCustomPromptChange={setCustomPrompt}
            customImages={customImages}
            onCustomImagesChange={setCustomImages}
            identifiedErrors={identifiedErrors}
            errorCheckStatus={errorCheckStatus}
            selectedTemplate={selectedTemplate}
            onSelectTemplate={setSelectedTemplate}
          />
        );
      case AppStatus.Error:
        return (
          <div className="max-w-2xl mx-auto text-center p-8 bg-red-50/80 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 rounded-2xl shadow-sm space-y-5">
            <h3 className="text-2xl font-bold text-red-700 dark:text-red-300">An Error Occurred</h3>
            <p className="text-sm text-red-600 dark:text-red-300 bg-white/80 dark:bg-slate-900/60 p-4 rounded-xl border border-red-200 dark:border-red-900/60 font-mono text-xs text-left max-w-xl mx-auto">
              {error || 'An unexpected error occurred during audio processing.'}
            </p>
            <p className="text-slate-600 dark:text-slate-300 text-sm">
              {audioBlob ? 'Your recorded audio is preserved. You can download it, change the model to retry, or upload a different audio file.' : 'Please try recording or uploading an audio file again.'}
            </p>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm max-w-xl mx-auto space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
                <label htmlFor="single-error-model-select" className="font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  Select Model to Retry:
                </label>
                <select 
                  id="single-error-model-select"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-slate-50 border border-slate-300 text-slate-900 text-sm font-semibold rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 w-full sm:w-auto dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                >
                  <option value="gemini-3.7-flash">Gemini 3.7 Flash</option>
                  <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
                  <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                  <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite</option>
                </select>
              </div>

              <div className="flex flex-wrap justify-center items-center gap-3 pt-3 border-t dark:border-slate-700">
                {audioBlob && (
                  <button
                    onClick={handleDownload}
                    className="bg-slate-700 hover:bg-slate-800 text-white font-bold py-2.5 px-5 rounded-xl shadow transition-colors flex items-center gap-2 text-sm"
                    title="Download audio recording safely to your device"
                  >
                    <DownloadIcon className="w-4 h-4" />
                    Download Audio File
                  </button>
                )}

                <label className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-xl shadow transition-colors flex items-center gap-2 text-sm cursor-pointer">
                  <UploadIcon className="w-4 h-4" />
                  <span>Upload & Process Audio</span>
                  <input
                    type="file"
                    accept="audio/*,.mp3,.wav,.ogg,.m4a,.webm"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleRecordingComplete(file);
                        e.target.value = '';
                      }
                    }}
                    className="hidden"
                  />
                </label>

                {audioBlob && (
                  <button
                    onClick={() => handleRecordingComplete(audioBlob)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl shadow transition-colors text-sm"
                  >
                    Retry Current Audio
                  </button>
                )}

                <button
                  onClick={resetSingleMode}
                  className="bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 font-bold py-2.5 px-5 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors text-sm"
                >
                  Start Fresh
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const renderContent = () => {
    switch (mode) {
      case 'single':
        return renderSingleModeContent();
      case 'merge_template':
        return (
          <MergeTemplateProcessor
            selectedModel={selectedModel}
            initialTemplate={selectedTemplate}
            onSelectTemplate={(tmpl) => setSelectedTemplate(tmpl)}
            onBack={() => setMode('single')}
          />
        );
      case 'batch':
        return <BatchProcessor 
                    selectedModel={selectedModel} 
                    isErrorCheckEnabled={isErrorCheckEnabled}
                    selectedTemplate={selectedTemplate}
                    onBack={() => {
                        resetSingleMode();
                        setMode('single');
                    }} 
                />;
      case 'live':
        return <LiveDictation 
                  onComplete={handleLiveDictationComplete} 
                  onBack={() => setMode('single')} 
                  selectedTemplate={selectedTemplate}
               />;
      default:
        return renderSingleModeContent();
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Template Selection Modal */}
      <TemplateSelectionModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSelectTemplate={tmpl => {
          setSelectedTemplate(tmpl);
          setAutoDownloadDocx(true);
        }}
        selectedTemplateId={selectedTemplate?.id}
        customTemplates={userCustomTemplates}
        onRefreshCustomTemplates={loadUserCustomTemplates}
      />

      <header className="bg-white dark:bg-slate-800 shadow-sm p-4 border-b border-slate-200 dark:border-slate-700/50 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 
              onClick={() => {
                if (status === AppStatus.Success) {
                  resetSingleMode();
                }
                setMode('single');
              }}
              className="text-xl sm:text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent cursor-pointer select-none"
            >
              Radiology Dictation Corrector
            </h1>
            <span className="hidden sm:inline text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
              v23.0 • DOCX Formats
            </span>
          </div>

          <div className="flex items-center gap-3">
             {/* Model Select */}
             <div className="flex items-center gap-2">
                <label htmlFor="global-model-select" className="text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">Model:</label>
                <select
                  id="global-model-select"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-lg p-1.5 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="gemini-3.5-flash">Gemini 3.5 Flash (Default)</option>
                  <option value="gemini-3.7-flash">Gemini 3.7 Flash</option>
                  <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
                  <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite</option>
                </select>
             </div>

             {/* Dark mode toggle */}
             <button
                onClick={toggleTheme}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                aria-label="Toggle theme"
             >
                {theme === 'dark' ? <SunIcon className="w-4 h-4 text-amber-400" /> : <MoonIcon className="w-4 h-4 text-slate-600" />}
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto w-full p-4 sm:p-6 flex-1 flex flex-col justify-start">
        {renderContent()}
      </main>

      <footer className="text-center p-3 text-xs text-slate-400 dark:text-slate-500 border-t border-slate-200 dark:border-slate-800">
        AI-Powered Radiology Transcription & Native DOCX Formats Integration
      </footer>
    </div>
  );
};

export default App;
