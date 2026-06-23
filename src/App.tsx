import React, { useState, useEffect, useRef } from 'react';

// This component now points directly to the raw, processed Google Drive image URL 
// provided by the user. This guarantees the original, high-fidelity brand graphic is displayed.
function RexMindLogo({ className = "w-12 h-12" }) {
  const directLogoUrl = "https://lh3.googleusercontent.com/d/1zmF-7MLnCf71O-POF0fPkVQRqfhdAKGA";

  return (
    <img 
      src={directLogoUrl} 
      alt="RexMind AI Logo" 
      className={`${className} object-contain transition-transform duration-200 hover:scale-105`} 
      onError={(e) => {
        // Simple fallback in case of direct CDN load delay
        e.target.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150";
      }}
    />
  );
}

export default function App() {
  // Theme State (Defaulting to Dark Charcoal with Sage Elements)
  const [darkMode, setDarkMode] = useState(true);

  // App Navigation: 'home' | 'notebook'
  const [view, setView] = useState('home');
  const [activeNotebookId, setActiveNotebookId] = useState(null);

  // Library & Multi-Notebook State
  const [notebooks, setNotebooks] = useState([
    {
      id: 'nb-initial-1',
      title: '🌿 Eco-Architecture Studies',
      description: 'A study on natural climate-control and bio-inspired materials.',
      createdOn: 'June 22, 2026',
      documents: [
        {
          id: 'mock-doc-1',
          name: 'Bio_Inspirations_V1.pdf',
          size: '1.24 MB',
          pages: 3,
          textContext: '[Page 1] Bio-inspired materials represent a frontier of sustainable architecture. [Page 2] Adapting termite mound ventilation structures for cooling tall buildings. [Page 3] Conclusions recommend further funding in self-healing concrete compounds.',
          blobUrl: ''
        }
      ],
      chats: [
        { role: 'assistant', content: 'Greetings. I have initialized the Eco-Architecture Studies notebook. Feel free to query our active biological material references.' }
      ]
    },
    {
      id: 'nb-initial-2',
      title: '📈 Microgrid Tech Analysis',
      description: 'Reviewing neighborhood-scale energy grids, decentralized storage solutions, and efficiency curves.',
      createdOn: 'June 20, 2026',
      documents: [],
      chats: [
        { role: 'assistant', content: 'Microgrid notebook is open. Upload any technical PDFs to get started.' }
      ]
    }
  ]);

  // Inputs for creation
  const [newNotebookTitle, setNewNotebookTitle] = useState('');
  const [newNotebookDesc, setNewNotebookDesc] = useState('');

  // active document showcase state inside active notebook
  const [selectedDocId, setSelectedDocId] = useState(null);

  // Parsing loading states
  const [isParsing, setIsParsing] = useState(false);
  const [parsingProgress, setParsingProgress] = useState(0);

  // Interactive Prompt / Chat logic state
  const [inputMessage, setInputMessage] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [customApiKey, setCustomApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // PDF.js library status
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);

  // Toast message notification
  const [toast, setToast] = useState(null);

  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      setPdfjsLoaded(true);
    };
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const activeNotebook = notebooks.find(nb => nb.id === activeNotebookId);

  useEffect(() => {
    if (view === 'notebook') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeNotebook?.chats, isAiThinking, view]);

  const handleCreateNotebook = (e) => {
    e.preventDefault();
    if (!newNotebookTitle.trim()) {
      showToast('Please enter a notebook title', 'error');
      return;
    }

    const newNb = {
      id: crypto.randomUUID(),
      title: newNotebookTitle.trim(),
      description: newNotebookDesc.trim() || 'No description provided.',
      createdOn: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      documents: [],
      chats: [
        {
          role: 'assistant',
          content: `Welcome to your brand new notebook: ${newNotebookTitle.trim()}! Upload source PDF reference materials below to build my knowledge.`
        }
      ]
    };

    setNotebooks(prev => [newNb, ...prev]);
    setNewNotebookTitle('');
    setNewNotebookDesc('');
    showToast('New notebook initialized!', 'success');
  };

  const handleDeleteNotebook = (id, e) => {
    e.stopPropagation();
    setNotebooks(prev => prev.filter(nb => nb.id !== id));
    if (activeNotebookId === id) {
      setActiveNotebookId(null);
      setView('home');
    }
    showToast('Notebook discarded.', 'info');
  };

  const handleOpenNotebook = (id) => {
    setActiveNotebookId(id);
    setSelectedDocId(null);
    setView('notebook');
    showToast('Loaded notebook environment.', 'success');
  };

  const handlePdfUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    if (!pdfjsLoaded) {
      showToast('Engine loading. Please give it another moment!', 'warning');
      return;
    }

    for (const file of files) {
      if (file.type !== "application/pdf") {
        showToast('Only PDF files are supported.', 'error');
        continue;
      }

      setIsParsing(true);
      setParsingProgress(15);

      try {
        const fileReader = new FileReader();
        fileReader.onload = async function () {
          try {
            const typedarray = new Uint8Array(this.result);
            const pdf = await window.pdfjsLib.getDocument({ data: typedarray }).promise;
            let fullText = "";
            const totalPages = pdf.numPages;

            for (let i = 1; i <= totalPages; i++) {
              setParsingProgress(Math.round((i / totalPages) * 80) + 15);
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              const pageText = textContent.items.map(item => item.str).join(" ");
              fullText += `[Page ${i}] ${pageText}\n\n`;
            }

            const newDoc = {
              id: crypto.randomUUID(),
              name: file.name,
              size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
              pages: totalPages,
              textContext: fullText,
              blobUrl: URL.createObjectURL(file)
            };

            // Save references inside current active notebook
            setNotebooks(prev => prev.map(nb => {
              if (nb.id === activeNotebookId) {
                return {
                  ...nb,
                  documents: [...nb.documents, newDoc],
                  chats: [
                    ...nb.chats,
                    { role: 'assistant', content: `📚 Reference saved: parsed **${file.name}** successfully. You can select it in the showcase view above.` }
                  ]
                };
              }
              return nb;
            }));

            setSelectedDocId(newDoc.id);
            showToast('Document securely added to references.', 'success');

          } catch (err) {
            console.error("Parsing breakdown:", err);
            showToast('Error parsing file layers. It may be encrypted/scanned.', 'error');
          } finally {
            setIsParsing(false);
            setParsingProgress(0);
          }
        };
        fileReader.readAsArrayBuffer(file);
      } catch (e) {
        console.error(e);
        setIsParsing(false);
      }
    }
  };

  const handleDeleteDocument = (docId, e) => {
    e.stopPropagation();
    setNotebooks(prev => prev.map(nb => {
      if (nb.id === activeNotebookId) {
        return {
          ...nb,
          documents: nb.documents.filter(d => d.id !== docId)
        };
      }
      return nb;
    }));
    if (selectedDocId === docId) {
      setSelectedDocId(null);
    }
    showToast('Reference item removed.', 'info');
  };

  const queryGeminiModel = async (payload, retries = 3, delay = 1000) => {
    const apiKey = customApiKey || "";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          return await response.json();
        }

        if (response.status === 429 || response.status >= 500) {
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        }

        const err = await response.json();
        throw new Error(err.error?.message || 'Gemini core API reported error.');
      } catch (e) {
        if (i === retries - 1) throw e;
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  };

  const handleSendMessage = async (predefinedText = "") => {
    const queryText = predefinedText || inputMessage;
    if (!queryText.trim() && !predefinedText) return;

    if (!activeNotebook) return;

    // Append user's query immediately
    const userMsg = { role: 'user', content: queryText };
    const updatedChats = [...activeNotebook.chats, userMsg];

    // Optimistically update chatting flow inside the notebook
    setNotebooks(prev => prev.map(nb => {
      if (nb.id === activeNotebookId) {
        return { ...nb, chats: updatedChats };
      }
      return nb;
    }));

    setInputMessage('');
    setIsAiThinking(true);

    try {
      const activeDoc = activeNotebook.documents.find(d => d.id === selectedDocId);
      let contextWindow = "";

      if (activeDoc) {
        contextWindow = `The user has highlighted an active reference file named "${activeDoc.name}". Here is its contents:\n\n${activeDoc.textContext}\n\nUse this direct context to address the question accurately. Refer to pages if needed.`;
      } else if (activeNotebook.documents.length > 0) {
        const allTexts = activeNotebook.documents.map(d => `[File: ${d.name}]\n${d.textContext}`).join("\n\n");
        contextWindow = `Here are the uploaded background reference materials available for this entire notebook space:\n\n${allTexts}\n\nUse this information if relevant, or request the user select a specific file in the top showcase.`;
      } else {
        contextWindow = "No PDF files are uploaded yet. Instruct the user to upload scientific or notes papers in the references module above.";
      }

      const conversationHistory = updatedChats.slice(-12).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const systemInstruction = `You are RexMind AI, an exceptionally smart, elegant, and minimal notebook research companion.
      You design responses in accurate, clean paragraphs or structured bullet lists. Your aesthetic style is scientific, precise, and polite. Always support references.`;

      const payload = {
        contents: [
          ...conversationHistory.slice(0, -1), // History except the latest message
          {
            role: 'user',
            parts: [{ text: `${contextWindow}\n\nUser Question: ${queryText}` }]
          }
        ],
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        }
      };

      const result = await queryGeminiModel(payload);
      const aiResponse = result.candidates?.[0]?.content?.parts?.[0]?.text || "The AI model did not produce a standard text payload.";

      // Save chatting response to notebook state
      setNotebooks(prev => prev.map(nb => {
        if (nb.id === activeNotebookId) {
          return {
            ...nb,
            chats: [...updatedChats, { role: 'assistant', content: aiResponse }]
          };
        }
        return nb;
      }));

    } catch (e) {
      console.error(e);
      setNotebooks(prev => prev.map(nb => {
        if (nb.id === activeNotebookId) {
          return {
            ...nb,
            chats: [...updatedChats, { role: 'assistant', content: `⚠️ Connection Issue: ${e.message || 'The AI failed to sync with the workspace. Double check your API configuration.'}` }]
          };
        }
        return nb;
      }));
    } finally {
      setIsAiThinking(false);
    }
  };

  return (
    <div className={`min-h-screen w-full flex flex-col font-sans transition-colors duration-300 ${
      darkMode 
        ? 'bg-[#111215] text-[#e3e6eb]' 
        : 'bg-[#f5f6f4] text-[#2c322b]'
    }`}>
      
      {/* Dynamic Modern Toast Notification */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-2 px-5 py-3 rounded-xl shadow-2xl border animate-bounce backdrop-blur-md bg-[#8F9F83] text-white border-[#A8B89C]">
          <span className="text-xs font-semibold tracking-wider font-mono uppercase">{toast.type}:</span>
          <span className="text-xs font-medium">{toast.msg}</span>
        </div>
      )}

      {/* Header Panel */}
      <header className={`px-6 py-3 flex items-center justify-between border-b transition-colors duration-300 ${
        darkMode 
          ? 'border-[#24262a] bg-[#16171a]' 
          : 'border-[#dfdfdf] bg-white'
      }`}>
        <div className="flex items-center space-x-3">
          {/* Header Compact Brand Logo */}
          <div onClick={() => { setView('home'); }} className="cursor-pointer">
            <RexMindLogo className="w-11 h-11" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-base font-bold tracking-tight">RexMind</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold bg-[#8F9F83]/20 text-[#8F9F83]">v2.5</span>
            </div>
            <p className="text-[9px] text-gray-500 tracking-wider font-mono uppercase">Connect. Discover. Understand.</p>
          </div>
        </div>

        {/* Global Navigation Tools */}
        <div className="flex items-center space-x-3">
          {view === 'notebook' && (
            <button
              onClick={() => { setView('home'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all flex items-center space-x-2 ${
                darkMode 
                  ? 'border-[#2c2f34] hover:bg-[#202226] text-[#A8B89C]' 
                  : 'border-[#dfdfdf] hover:bg-gray-100 text-[#5D6B52] bg-white'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Library Home</span>
            </button>
          )}

          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-[#202226]' : 'hover:bg-gray-100'}`}
            title="Configure API key override"
          >
            <svg className="w-5 h-5 text-[#8F9F83]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
          </button>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-[#202226]' : 'hover:bg-gray-100'}`}
          >
            {darkMode ? (
              <svg className="w-5 h-5 text-[#8F9F83]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.364 17.636l-.707.707m12.728 0l-.707-.707M6.364 6.364l-.707-.707M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-[#5D6B52]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Global Config drawer */}
      {showSettings && (
        <div className={`p-4 border-b text-xs transition-all ${darkMode ? 'bg-[#1a1c1f] border-[#2c2f34]' : 'bg-[#eaebec] border-gray-300'}`}>
          <div className="max-w-xl mx-auto">
            <h3 className="font-bold text-[#8F9F83] mb-1 uppercase tracking-wider">Custom Gemini API Gateway</h3>
            <p className="text-gray-400 mb-2">Configure custom endpoints or private keys overrides for unbounded search requests.</p>
            <input
              type="password"
              placeholder="Enter custom key (optional)..."
              value={customApiKey}
              onChange={(e) => setCustomApiKey(e.target.value)}
              className={`w-full p-2.5 rounded-xl border outline-none font-mono text-xs ${
                darkMode ? 'bg-[#111215] border-gray-700 text-white' : 'bg-white border-gray-300'
              }`}
            />
          </div>
        </div>
      )}

      {/* Primary Workspace Dynamic Router */}
      <main className="flex-1 overflow-y-auto">
        
        {/* ================= VIEW 1: HOME CATALOG ================= */}
        {}
        {view === 'home' && (
          <div className="max-w-5xl mx-auto px-6 py-10 animate-fadeIn">
            
            {/* Header / Intro section with Large Custom Brand Logo */}
            <section className={`p-8 rounded-3xl border mb-10 transition-all flex flex-col md:flex-row items-center gap-8 ${
              darkMode 
                ? 'bg-[#16171a] border-[#24262a] text-gray-100' 
                : 'bg-white border-[#dfdfdf] text-[#2c322b] shadow-sm'
            }`}>
              {/* Massive Brand Showcase Logo */}
              <div className="flex-shrink-0 flex flex-col items-center">
                <RexMindLogo className="w-36 h-36" />
                <h3 className="text-xs font-mono font-bold tracking-[0.25em] text-[#8F9F83] mt-3 text-center uppercase">
                  RexMind
                </h3>
                <p className="text-[8px] font-mono text-gray-500 tracking-wider mt-1 text-center">
                  CONNECT. DISCOVER. UNDERSTAND.
                </p>
              </div>

              <div className="max-w-2xl text-center md:text-left">
                <span className="text-xs uppercase tracking-widest font-mono text-[#8F9F83] font-bold">Research workspace</span>
                <h2 className="text-3xl font-bold tracking-tight mt-1 mb-3">Your Intelligent Reference Hub</h2>
                <p className="text-sm leading-relaxed text-gray-500">
                  Welcome to RexMind AI. Create custom research notebooks, attach primary scientific text or reference PDFs, and consult with the Gemini context parser in a fully streamlined vertical workspace designed for deep comprehension.
                </p>
              </div>
            </section>

            {/* Creation Area and Notebook list */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Notebook Creator Panel */}
              <div className={`p-6 rounded-2xl border flex flex-col justify-between ${
                darkMode ? 'bg-[#16171a] border-[#24262a]' : 'bg-white border-gray-200'
              }`}>
                <div>
                  <h3 className="text-sm uppercase tracking-wider font-mono text-[#8F9F83] font-bold mb-4">Initialize Notebook</h3>
                  <form onSubmit={handleCreateNotebook} className="space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase font-mono tracking-widest text-gray-400 mb-1">Notebook Title</label>
                      <input
                        type="text"
                        placeholder="e.g. quantum physics notes"
                        value={newNotebookTitle}
                        onChange={(e) => setNewNotebookTitle(e.target.value)}
                        className={`w-full p-2.5 rounded-xl border text-xs outline-none ${
                          darkMode ? 'bg-[#111215] border-gray-700 text-white focus:border-[#8F9F83]' : 'bg-gray-50 border-gray-300 text-black'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-mono tracking-widest text-gray-400 mb-1">Brief Description</label>
                      <textarea
                        rows={3}
                        placeholder="Reviewing complex theorems..."
                        value={newNotebookDesc}
                        onChange={(e) => setNewNotebookDesc(e.target.value)}
                        className={`w-full p-2.5 rounded-xl border text-xs outline-none resize-none ${
                          darkMode ? 'bg-[#111215] border-gray-700 text-white focus:border-[#8F9F83]' : 'bg-gray-50 border-gray-300 text-black'
                        }`}
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#8F9F83] hover:bg-[#7e8f72] text-white transition-colors"
                    >
                      + Create New Space
                    </button>
                  </form>
                </div>
                <div className="mt-6 pt-4 border-t border-gray-800/10 dark:border-gray-200/5">
                  <p className="text-[10px] font-mono text-gray-500">Every notebook retains separate chats and reference repositories permanently inside your active session.</p>
                </div>
              </div>

              {/* Notebooks Library Cards */}
              <div className="md:col-span-2 space-y-4">
                <h3 className="text-xs uppercase tracking-widest font-mono text-gray-400">Existing Notebooks ({notebooks.length})</h3>
                
                {notebooks.length === 0 ? (
                  <div className={`p-10 rounded-2xl border text-center ${darkMode ? 'border-dashed border-gray-800' : 'border-dashed border-gray-300'}`}>
                    <svg className="w-10 h-10 mx-auto text-gray-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <p className="text-xs text-gray-500">No workspaces mapped yet. Create one on the left to begin.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {notebooks.map((nb) => (
                      <div
                        key={nb.id}
                        onClick={() => handleOpenNotebook(nb.id)}
                        className={`p-5 rounded-2xl border cursor-pointer group hover:scale-[1.01] transition-all relative flex flex-col justify-between h-48 ${
                          darkMode 
                            ? 'bg-[#16171a] border-[#24262a] hover:border-[#8F9F83]/50' 
                            : 'bg-white border-gray-200 hover:border-[#8F9F83]'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between">
                            <span className="text-xs font-bold text-[#8F9F83]">{nb.createdOn}</span>
                            <button
                              onClick={(e) => handleDeleteNotebook(nb.id, e)}
                              className="p-1 rounded hover:bg-red-500/10 text-gray-500 hover:text-red-500 transition-colors"
                              title="Discard Workspace"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                          
                          <h4 className="text-base font-bold tracking-tight mt-2 text-[#8F9F83] dark:text-[#A8B89C] group-hover:text-[#8F9F83] transition-colors">
                            {nb.title}
                          </h4>
                          <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                            {nb.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-800/10 dark:border-gray-200/5">
                          <span className="text-[10px] font-mono text-[#8F9F83] uppercase tracking-wider">
                            📁 {nb.documents.length} References
                          </span>
                          <span className="text-[10px] font-mono text-gray-500">
                            💬 {nb.chats.length} Chats saved
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            </div>

          </div>
        )}

        {/* ================= VIEW 2: NOTEBOOK DETAILS (FLOW SCROLL) ================= */}
        {}
        {view === 'notebook' && activeNotebook && (
          <div className="max-w-4xl mx-auto px-6 py-8 space-y-8 animate-fadeIn">
            
            {/* Header of specific Notebook */}
            <div className={`p-6 rounded-2xl border transition-all ${
              darkMode ? 'bg-[#16171a] border-[#24262a]' : 'bg-white border-gray-200'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start space-x-4">
                  <RexMindLogo className="w-14 h-14" />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-semibold text-[#8F9F83] uppercase">Active Notebook Workspace</span>
                      <span className="text-[9px] px-2 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">ID: {activeNotebook.id.slice(0, 8)}</span>
                    </div>
                    <h2 className="text-2xl font-bold mt-1 tracking-tight">{activeNotebook.title}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">{activeNotebook.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setView('home'); }}
                  className="px-4 py-2 text-xs font-mono font-bold rounded-xl bg-gray-500/10 hover:bg-gray-500/20 text-gray-400 border border-gray-500/20 self-start sm:self-auto"
                >
                  ← Library
                </button>
              </div>
            </div>

            {/* ================= SECTION 1: UP (SHOWCASE VIEW) ================= */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#8F9F83]"></div>
                  <h3 className="text-xs uppercase font-mono tracking-widest text-[#8F9F83] font-bold">1. Showcase (Up)</h3>
                </div>
                {selectedDocId && (
                  <span className="text-[10px] font-mono text-gray-500">
                    Active Layer: {activeNotebook.documents.find(d => d.id === selectedDocId)?.name}
                  </span>
                )}
              </div>

              <div className={`w-full h-[500px] rounded-3xl border overflow-hidden relative ${
                darkMode ? 'bg-[#16171a] border-[#24262a]' : 'bg-white border-gray-200'
              }`}>
                {selectedDocId ? (
                  <iframe
                    src={activeNotebook.documents.find(d => d.id === selectedDocId)?.blobUrl}
                    title="Active PDF Showcase Layer"
                    className="w-full h-full border-none"
                    style={{ colorScheme: darkMode ? 'dark' : 'light' }}
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                    <div className="mb-4">
                      <RexMindLogo className="w-20 h-20 opacity-40" />
                    </div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-gray-300">Showcase viewport is offline</h4>
                    <p className="text-xs text-gray-500 max-w-sm mt-1 leading-relaxed">
                      Select any uploaded reference in the panel below to overlay its visual layer here.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ================= SECTION 2: DOWN (REFERENCES MANAGER) ================= */}
            {}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#8F9F83]"></div>
                <h3 className="text-xs uppercase font-mono tracking-widest text-[#8F9F83] font-bold">2. References Vault (Down)</h3>
              </div>

              <div className={`p-6 rounded-3xl border ${
                darkMode ? 'bg-[#16171a] border-[#24262a]' : 'bg-white border-gray-200'
              }`}>
                
                {/* Drag / File selector trigger */}
                <div className="flex flex-col md:flex-row items-center gap-6 justify-between">
                  <div className="max-w-md">
                    <h4 className="text-sm font-bold">Attach Primary PDFs</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Load research essays or reports. Our locally run in-browser compiler extracts the text layer so you can query it below.
                    </p>
                  </div>
                  
                  <div className="shrink-0 w-full md:w-auto">
                    <input 
                      type="file" 
                      accept=".pdf" 
                      multiple 
                      onChange={handlePdfUpload} 
                      className="hidden" 
                      ref={fileInputRef} 
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full md:w-auto py-3 px-6 rounded-xl border border-dashed text-center flex items-center justify-center space-x-2 cursor-pointer transition-all border-[#8F9F83] bg-[#8F9F83]/5 hover:bg-[#8F9F83]/10 text-gray-300"
                    >
                      <svg className="w-5 h-5 text-[#8F9F83]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <span className="text-xs font-bold text-[#8F9F83]">Ingest New Documents</span>
                    </button>
                  </div>
                </div>

                {isParsing && (
                  <div className="mt-4 p-4 rounded-xl border border-dashed border-[#8F9F83]/30 bg-[#8F9F83]/5 flex items-center space-x-3">
                    <div className="w-4 h-4 border-2 border-[#8F9F83] border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs font-mono text-gray-400">Parsing reference context layers: {parsingProgress}%</span>
                  </div>
                )}

                {/* References List Container */}
                <div className="mt-6 pt-6 border-t border-gray-800/20 dark:border-gray-200/5">
                  {activeNotebook.documents.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-xs text-gray-500 italic">No reference documents attached to this notebook workspace.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activeNotebook.documents.map((doc) => {
                        const isDocShowcased = doc.id === selectedDocId;
                        return (
                          <div
                            key={doc.id}
                            onClick={() => setSelectedDocId(doc.id)}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                              isDocShowcased 
                                ? 'bg-[#8F9F83]/10 border-[#8F9F83] text-white' 
                                : 'bg-[#111215] border-transparent hover:border-[#8F9F83]/30 text-gray-300'
                            }`}
                          >
                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                isDocShowcased ? 'bg-[#8F9F83] text-white' : 'bg-[#8F9F83]/10 text-[#8F9F83]'
                              }`}>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold truncate">{doc.name}</p>
                                <p className="text-[10px] text-gray-500 font-mono mt-0.5">{doc.pages} Pages • {doc.size}</p>
                              </div>
                            </div>

                            <button
                              onClick={(e) => handleDeleteDocument(doc.id, e)}
                              className="p-1 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-500 transition-colors ml-3"
                              title="Discard document from vault"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* ================= SECTION 3: LOWEST (CONVERSATION COMPANION) ================= */}
            {}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#8F9F83]"></div>
                  <h3 className="text-xs uppercase font-mono tracking-widest text-[#8F9F83] font-bold">3. Companion AI (Lowest)</h3>
                </div>
                <button
                  onClick={() => {
                    setNotebooks(prev => prev.map(nb => {
                      if (nb.id === activeNotebookId) {
                        return {
                          ...nb,
                          chats: [{ role: 'assistant', content: 'Chat history cleared. Send a query to begin.' }]
                        };
                      }
                      return nb;
                    }));
                    showToast('Conversational thread reset.', 'info');
                  }}
                  className="p-1.5 px-3 rounded-lg bg-[#16171a] hover:bg-[#202226] text-gray-400 text-[10px] uppercase tracking-wider font-mono border border-gray-800"
                >
                  Reset Stream
                </button>
              </div>

              {/* Chat Container */}
              <div className={`rounded-3xl border flex flex-col ${
                darkMode ? 'bg-[#16171a] border-[#24262a]' : 'bg-white border-gray-200'
              }`}>
                
                {/* Suggestions / Prompt pills */}
                <div className="p-4 border-b border-inherit flex flex-wrap gap-2 bg-[#1c1d22]/40 rounded-t-3xl">
                  <button
                    disabled={activeNotebook.documents.length === 0}
                    onClick={() => handleSendMessage("Provide a structural high-level bulleted digest of this notebook's references.")}
                    className="text-[10px] font-mono px-3 py-1.5 rounded-full bg-[#8F9F83]/10 hover:bg-[#8F9F83]/20 text-[#A8B89C] border border-[#8F9F83]/30 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    🌿 Digest Library
                  </button>
                  <button
                    disabled={!selectedDocId}
                    onClick={() => handleSendMessage("Map out the core findings, conclusions, and methodologies explicitly.")}
                    className="text-[10px] font-mono px-3 py-1.5 rounded-full bg-[#8F9F83]/10 hover:bg-[#8F9F83]/20 text-[#A8B89C] border border-[#8F9F83]/30 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    📝 Structural Takeaways
                  </button>
                  <button
                    disabled={!selectedDocId}
                    onClick={() => handleSendMessage("Generate 4 critical thinking quiz questions based strictly on our active document.")}
                    className="text-[10px] font-mono px-3 py-1.5 rounded-full bg-[#8F9F83]/10 hover:bg-[#8F9F83]/20 text-[#A8B89C] border border-[#8F9F83]/30 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    🧩 Comprehension Quiz
                  </button>
                </div>

                {/* Messages Scroller */}
                <div className="h-96 overflow-y-auto p-6 space-y-4">
                  {activeNotebook.chats.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 leading-relaxed text-xs ${
                        msg.role === 'user'
                          ? 'bg-[#8F9F83] text-white shadow-md'
                          : darkMode
                          ? 'bg-[#111215] text-gray-200 border border-[#24262a]'
                          : 'bg-gray-50 text-gray-800 border border-gray-200'
                      }`}>
                        <p className="whitespace-pre-line font-medium">
                          {msg.content}
                        </p>
                      </div>
                      <span className="text-[9px] text-[#8F9F83] mt-1.5 px-1 uppercase tracking-widest font-mono">
                        {msg.role === 'user' ? 'You' : 'RexMind Companion'}
                      </span>
                    </div>
                  ))}

                  {isAiThinking && (
                    <div className="flex flex-col items-start">
                      <div className="bg-[#111215] border border-[#24262a] rounded-2xl px-4 py-3 text-xs flex items-center space-x-2">
                        <div className="flex space-x-1 shrink-0">
                          <span className="h-1.5 w-1.5 bg-[#8F9F83] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="h-1.5 w-1.5 bg-[#8F9F83] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="h-1.5 w-1.5 bg-[#8F9F83] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                        <span className="text-[10px] text-gray-500 font-mono">Reading research nodes...</span>
                      </div>
                    </div>
                  )}
                  
                  <div ref={chatEndRef} />
                </div>

                {/* Message Input Panel */}
                <div className="p-4 border-t border-inherit">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder={selectedDocId ? "Ask a specific query regarding showcased PDF..." : "Type research query to consult files..."}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      className={`flex-1 px-4 py-3 text-xs rounded-xl border outline-none focus:ring-1 focus:ring-[#8F9F83] transition-all ${
                        darkMode 
                          ? 'bg-[#111215] border-[#24262a] text-white focus:border-[#8F9F83]' 
                          : 'bg-gray-50 border-gray-200 text-black focus:border-[#8F9F83]'
                      }`}
                    />
                    <button
                      onClick={() => handleSendMessage()}
                      disabled={isAiThinking}
                      className="p-3 rounded-xl bg-[#8F9F83] hover:bg-[#7d8c72] text-white transition-colors flex items-center justify-center shrink-0 disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </button>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
