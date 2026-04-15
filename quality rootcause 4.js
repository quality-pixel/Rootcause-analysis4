import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  EyeOff, 
  Eye, 
  FileText, 
  Download, 
  Moon, 
  Sun, 
  Settings, 
  Wand2, 
  AlertCircle,
  X,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  ListTree,
  CheckCircle2,
  Building2,
  Users,
  Truck,
  LayoutDashboard,
  GitMerge,
  Loader2
} from 'lucide-react';

// --- Types & Initial Data ---

const INITIAL_CATEGORIES = [
  { id: '1', name: 'Man (Personnel)', causes: [{ id: 'c1', text: 'Lack of training' }], ignored: false },
  { id: '2', name: 'Machine (Equipment)', causes: [{ id: 'c2', text: 'Worn out tool' }, { id: 'c3', text: 'Calibration error' }], ignored: false },
  { id: '3', name: 'Material', causes: [{ id: 'c4', text: 'Inconsistent raw material' }], ignored: false },
  { id: '4', name: 'Method (Process)', causes: [{ id: 'c5', text: 'Outdated SOP' }], ignored: false },
  { id: '5', name: 'Measurement', causes: [{ id: 'c6', text: 'Gauge R&R failure' }], ignored: false },
  { id: '6', name: 'Environment', causes: [], ignored: true }, // Optional 6th M
];

// --- Utilities ---

const generateId = () => Math.random().toString(36).substring(2, 9);

const exportToWord = (elementId, filename = '8D_Report.doc') => {
  const preHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
  <head><meta charset='utf-8'><title>Export HTML To Doc</title>
  <style>
    body { font-family: Arial, sans-serif; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th, td { border: 1px solid #000; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; font-weight: bold; }
    h1, h2, h3 { color: #333; }
  </style>
  </head><body>`;
  const postHtml = "</body></html>";
  const html = preHtml + document.getElementById(elementId).innerHTML + postHtml;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(html);
  
  const downloadLink = document.createElement("a");
  document.body.appendChild(downloadLink);
  
  if (navigator.msSaveOrOpenBlob) {
    navigator.msSaveOrOpenBlob(blob, filename);
  } else {
    downloadLink.href = url;
    downloadLink.download = filename;
    downloadLink.click();
  }
  document.body.removeChild(downloadLink);
};

// --- API Service (Gemini) ---
const suggestCausesAPI = async (problem, categories) => {
  const apiKey = ""; // Environment provided
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  
  const categoryNames = categories.map(c => c.name).join(', ');
  const prompt = `As a Quality Engineering expert, suggest 1 potential specific root cause for each of the following categories regarding this problem: "${problem}". Categories: ${categoryNames}. Return ONLY a valid JSON object where keys are category names and values are the suggested cause string. Example: {"Material": "Defective resin lot"}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" }
  };

  let delay = 1000;
  for (let i = 0; i < 3; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('API Error');
      const data = await response.json();
      return JSON.parse(data.candidates[0].content.parts[0].text);
    } catch (error) {
      if (i === 2) throw error;
      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
    }
  }
};

// --- Main Application Component ---

export default function App() {
  const [problemStatement, setProblemStatement] = useState("Product fails final torque specification test");
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [darkMode, setDarkMode] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Core States
  const [currentView, setCurrentView] = useState('splash'); // 'splash' | 'onboarding' | 'fishbone' | 'five-whys'
  const [fiveWhysData, setFiveWhysData] = useState({});
  const [collapsedCauses, setCollapsedCauses] = useState({});
  const [projectInfo, setProjectInfo] = useState({ customer: '', supplier: '', teamMembers: '' });

  // Splash Screen Timer
  useEffect(() => {
    if (currentView === 'splash') {
      const timer = setTimeout(() => setCurrentView('onboarding'), 2500);
      return () => clearTimeout(timer);
    }
  }, [currentView]);

  // Global Nav Handler
  const handleNav = (view) => {
    if (view === 'five-whys') {
      const hasCauses = categories.some(c => !c.ignored && c.causes.length > 0);
      if (!hasCauses) {
        alert("Please add at least one cause in the Fishbone diagram before proceeding to 5 Whys Analysis.");
        return;
      }
    }
    setCurrentView(view);
  };

  const proceedToFiveWhys = () => handleNav('five-whys');

  const updateFiveWhy = (causeId, index, value) => {
    setFiveWhysData(prev => {
      const currentWhys = prev[causeId] || ['', '', '', '', ''];
      const newWhys = [...currentWhys];
      newWhys[index] = value;
      return { ...prev, [causeId]: newWhys };
    });
  };

  const toggleCollapse = (causeId) => {
    setCollapsedCauses(prev => ({ ...prev, [causeId]: !prev[causeId] }));
  };

  // Toggle Dark Mode globally
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // Diagram Operations
  const addCategory = () => setCategories([...categories, { id: generateId(), name: 'New Category', causes: [], ignored: false }]);
  const updateCategoryName = (id, name) => setCategories(categories.map(c => c.id === id ? { ...c, name } : c));
  const toggleIgnoreCategory = (id) => setCategories(categories.map(c => c.id === id ? { ...c, ignored: !c.ignored } : c));
  const removeCategory = (id) => setCategories(categories.filter(c => c.id !== id));
  
  const addCause = (categoryId, text = '') => {
    setCategories(categories.map(c => c.id === categoryId ? { ...c, causes: [...c.causes, { id: generateId(), text }] } : c));
  };
  const updateCause = (categoryId, causeId, text) => {
    setCategories(categories.map(c => c.id === categoryId ? { ...c, causes: c.causes.map(cause => cause.id === causeId ? { ...cause, text } : cause) } : c));
  };
  const removeCause = (categoryId, causeId) => {
    setCategories(categories.map(c => c.id === categoryId ? { ...c, causes: c.causes.filter(cause => cause.id !== causeId) } : c));
  };

  const handleSuggestCauses = async () => {
    setIsGeneratingAI(true);
    try {
      const activeCategories = categories.filter(c => !c.ignored);
      const suggestions = await suggestCausesAPI(problemStatement, activeCategories);
      
      setCategories(prev => prev.map(c => {
        if (!c.ignored && suggestions[c.name]) {
          return { ...c, causes: [...c.causes, { id: generateId(), text: suggestions[c.name] }] };
        }
        return c;
      }));
    } catch (error) {
      console.error("AI generation failed:", error);
      alert("Failed to generate AI suggestions. Please try again later.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Render Splash Screen
  if (currentView === 'splash') {
    return <SplashScreen />;
  }

  return (
    <div className={`min-h-screen font-sans transition-colors duration-200 ${darkMode ? 'dark bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #report-modal, #report-modal * { visibility: visible; }
          #report-modal { position: absolute; left: 0; top: 0; width: 100%; background: white !important; color: black !important; padding: 0 !important; box-shadow: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Header/Navbar */}
      <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">RootCause<span className="text-blue-600 dark:text-blue-400">Pro</span></h1>
          
          {/* Breadcrumb Navigation */}
          {currentView !== 'onboarding' && (
            <div className="flex items-center gap-2 ml-4 px-4 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-full text-sm font-medium transition-all">
              <span 
                className={`cursor-pointer transition-colors ${currentView === 'fishbone' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-blue-600 dark:hover:text-blue-400'}`} 
                onClick={() => handleNav('fishbone')}
              >
                Fishbone
              </span>
              {currentView === 'five-whys' && (
                <>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                  <span className="text-blue-600 dark:text-blue-400">5 Whys Analysis</span>
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          {currentView !== 'onboarding' && (
            <button 
              onClick={() => setShowReport(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors shadow-sm"
            >
              <FileText className="w-4 h-4" /> Generate 8D Report
            </button>
          )}
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)]">
        
        {/* Global Sidebar */}
        <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-6 overflow-y-auto z-10 hidden md:flex shrink-0">
          <div>
            <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Navigation</h2>
            <nav className="space-y-1">
              <NavItem icon={<LayoutDashboard />} label="Project Details" active={currentView === 'onboarding'} onClick={() => handleNav('onboarding')} />
              <NavItem icon={<GitMerge />} label="Fishbone Diagram" active={currentView === 'fishbone'} onClick={() => handleNav('fishbone')} />
              <NavItem icon={<ListTree />} label="5 Whys Analysis" active={currentView === 'five-whys'} onClick={() => handleNav('five-whys')} />
            </nav>
          </div>

          {/* Contextual Sidebar: Fishbone Tools */}
          {currentView === 'fishbone' && (
            <>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Diagram Tools</h2>
                <button onClick={addCategory} className="w-full flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 transition-colors mb-2 text-slate-700 dark:text-slate-200">
                  <Plus className="w-4 h-4 text-blue-500" /> <span className="text-sm font-medium">Add Branch</span>
                </button>
                <button 
                  onClick={handleSuggestCauses}
                  disabled={isGeneratingAI}
                  className="w-full flex items-center gap-2 p-2 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded border border-indigo-200 dark:border-indigo-800 transition-colors disabled:opacity-50"
                >
                  <Wand2 className="w-4 h-4" /> 
                  <span className="text-sm font-medium">{isGeneratingAI ? 'Thinking...' : 'AI Suggest Causes'}</span>
                </button>
              </div>
              <div>
                <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Active Branches</h2>
                <div className="space-y-1">
                  {categories.map(c => (
                    <div key={c.id} className={`flex items-center justify-between p-2 rounded text-sm ${c.ignored ? 'opacity-50 text-slate-500' : 'text-slate-700 dark:text-slate-300'} hover:bg-slate-50 dark:hover:bg-slate-700`}>
                      <span className="truncate pr-2">{c.name}</span>
                      <button onClick={() => toggleIgnoreCategory(c.id)} className="p-1 hover:text-blue-500 text-slate-400" title={c.ignored ? "Show" : "Hide"}>
                        {c.ignored ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Contextual Sidebar: 5 Whys Navigation */}
          {currentView === 'five-whys' && (
            <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
              <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Jump to Category</h2>
              <nav className="space-y-1">
                {categories.filter(c => !c.ignored && c.causes.length > 0).map(category => (
                  <a 
                    key={`nav-${category.id}`} 
                    href={`#category-${category.id}`}
                    className="flex items-center justify-between px-3 py-2 text-sm font-medium rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <span className="truncate">{category.name}</span>
                    <span className="ml-2 text-xs bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-400 py-0.5 px-2 rounded-full">
                      {category.causes.length}
                    </span>
                  </a>
                ))}
              </nav>
            </div>
          )}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden relative bg-slate-50 dark:bg-slate-900 custom-scrollbar flex flex-col">
          
          {/* Onboarding View */}
          {currentView === 'onboarding' && (
            <OnboardingView 
              projectInfo={projectInfo} 
              setProjectInfo={setProjectInfo} 
              onContinue={() => handleNav('fishbone')} 
              onSkip={() => handleNav('fishbone')} 
            />
          )}

          {/* Fishbone View */}
          {currentView === 'fishbone' && (
            <>
              <div className="flex-1 overflow-auto relative">
                <FishboneCanvas 
                  problemStatement={problemStatement} setProblemStatement={setProblemStatement}
                  categories={categories} updateCategoryName={updateCategoryName}
                  toggleIgnoreCategory={toggleIgnoreCategory} removeCategory={removeCategory}
                  addCause={addCause} updateCause={updateCause} removeCause={removeCause}
                />
              </div>
              <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4 flex justify-end shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20 sticky bottom-0">
                <button
                  onClick={proceedToFiveWhys}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
                >
                  Finish & Proceed to 5 Whys <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {/* 5 Whys View */}
          {currentView === 'five-whys' && (
            <FiveWhysContent 
              categories={categories} fiveWhysData={fiveWhysData} 
              updateFiveWhy={updateFiveWhy} collapsedCauses={collapsedCauses} 
              toggleCollapse={toggleCollapse} setShowReport={setShowReport} 
            />
          )}

        </main>
      </div>

      {/* 8D Report Modal */}
      {showReport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm">
          <div id="report-modal" className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col relative my-auto">
            
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 no-print sticky top-0 bg-white dark:bg-slate-800 z-10 rounded-t-xl">
              <h2 className="text-2xl font-bold">8D Corrective Action Report</h2>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded flex items-center gap-2 text-sm font-medium">
                  <FileText className="w-4 h-4" /> PDF
                </button>
                <button onClick={() => exportToWord('report-content')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded flex items-center gap-2 text-sm font-medium">
                  <Download className="w-4 h-4" /> Word
                </button>
                <button onClick={() => setShowReport(false)} className="p-2 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 rounded ml-2">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div id="report-content" className="p-8 overflow-y-auto space-y-8 bg-white text-black print:p-0">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold uppercase tracking-wider mb-2">8D Report</h1>
                <p className="text-sm text-slate-500">Generated on {new Date().toLocaleDateString()}</p>
              </div>

              {/* Dynamic Header Data */}
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm text-slate-800">
                 <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                    <span className="font-bold block text-xs text-slate-500 uppercase tracking-wide mb-1">Customer Information</span>
                    {projectInfo.customer || 'Not Provided'}
                 </div>
                 <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                    <span className="font-bold block text-xs text-slate-500 uppercase tracking-wide mb-1">Supplier Information</span>
                    {projectInfo.supplier || 'Not Provided'}
                 </div>
              </div>

              <ReportSection title="D1: Team Formation">
                <div className="bg-slate-50 p-4 border border-slate-200 rounded font-medium whitespace-pre-wrap min-h-[60px]">
                  {projectInfo.teamMembers || 'Team information not provided.'}
                </div>
              </ReportSection>

              <ReportSection title="D2: Problem Description">
                <div className="bg-slate-50 p-4 border border-slate-200 rounded font-medium text-lg">
                  {problemStatement}
                </div>
              </ReportSection>

              <ReportSection title="D3: Interim Containment Actions (ICA)">
                 <div className="text-slate-500 italic border border-dashed border-slate-300 p-4 rounded">
                  [Describe actions taken to isolate the problem from any internal/external customer]
                </div>
              </ReportSection>

              <ReportSection title="D4: Root Cause Analysis (RCA)">
                <p className="mb-4 text-sm text-slate-600">The following potential root causes were identified via Ishikawa Diagram and 5 Whys Analysis:</p>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-300 p-2 text-left w-1/4">Category</th>
                        <th className="border border-slate-300 p-2 text-left w-1/3">Identified Cause (Fishbone)</th>
                        <th className="border border-slate-300 p-2 text-left">Root Cause (5 Whys Result)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.filter(c => !c.ignored && c.causes.length > 0).map(category => (
                        <React.Fragment key={category.id}>
                          {category.causes.map((cause, idx) => {
                            const whys = fiveWhysData[cause.id] || ['', '', '', '', ''];
                            const rootCause = [...whys].reverse().find(w => w.trim() !== '') || 'Pending 5 Whys Analysis';
                            
                            return (
                              <tr key={cause.id}>
                                {idx === 0 && (
                                  <td className="border border-slate-300 p-2 font-medium align-top bg-slate-50" rowSpan={category.causes.length}>
                                    {category.name}
                                  </td>
                                )}
                                <td className="border border-slate-300 p-2">{cause.text}</td>
                                <td className="border border-slate-300 p-2 font-semibold text-red-600">{rootCause}</td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      ))}
                      {categories.filter(c => !c.ignored && c.causes.length > 0).length === 0 && (
                        <tr><td colSpan="3" className="border border-slate-300 p-4 text-center text-slate-500 italic">No causes identified in active categories.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </ReportSection>

              <ReportSection title="D5: Permanent Corrective Actions (PCA)">
                 <div className="text-slate-500 italic border border-dashed border-slate-300 p-4 rounded">
                  [Define the best permanent corrective actions to eliminate the root cause(s)]
                </div>
              </ReportSection>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                 <ReportSection title="D6: Implementation">
                   <div className="h-24 border border-dashed border-slate-300 rounded"></div>
                 </ReportSection>
                 <ReportSection title="D7: Prevent Recurrence">
                   <div className="h-24 border border-dashed border-slate-300 rounded"></div>
                 </ReportSection>
                 <ReportSection title="D8: Recognize Team">
                   <div className="h-24 border border-dashed border-slate-300 rounded"></div>
                 </ReportSection>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Sub-Components ---

const SplashScreen = () => (
  <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center z-50 text-white">
    <div className="flex flex-col items-center gap-6 animate-pulse">
      <div className="bg-blue-600 p-5 rounded-3xl shadow-2xl shadow-blue-500/20">
        <Settings className="w-16 h-16 text-white animate-[spin_3s_linear_infinite]" />
      </div>
      <h1 className="text-4xl font-bold tracking-tight">RootCause<span className="text-blue-400">Pro</span></h1>
    </div>
    <div className="mt-16 w-64">
      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden relative">
        <div className="absolute top-0 left-0 h-full bg-blue-500" style={{ animation: 'progress 2.5s ease-in-out forwards' }}></div>
      </div>
      <p className="text-center text-slate-400 text-sm mt-4 font-medium tracking-wide flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-blue-500"/> Initializing workspace...
      </p>
    </div>
    <style>{`
      @keyframes progress {
        0% { width: 0%; }
        100% { width: 100%; }
      }
    `}</style>
  </div>
);

const NavItem = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors text-sm ${
      active 
        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' 
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
    }`}
  >
    {React.cloneElement(icon, { className: 'w-4 h-4' })}
    {label}
  </button>
);

const OnboardingView = ({ projectInfo, setProjectInfo, onContinue, onSkip }) => (
  <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6 custom-scrollbar">
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 w-full max-w-2xl p-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Project Details</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Enter the cross-functional team and project context to be included in the final 8D report.</p>
      </div>
      
      <form onSubmit={(e) => { e.preventDefault(); onContinue(); }} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-500" /> Customer Information
            </label>
            <input 
              type="text" 
              value={projectInfo.customer}
              onChange={e => setProjectInfo({...projectInfo, customer: e.target.value})}
              className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400"
              placeholder="e.g., Acme Corporation"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-500" /> Supplier Information
            </label>
            <input 
              type="text" 
              value={projectInfo.supplier}
              onChange={e => setProjectInfo({...projectInfo, supplier: e.target.value})}
              className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400"
              placeholder="e.g., Global Parts Mfg."
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" /> Team Members (D1)
          </label>
          <textarea 
            value={projectInfo.teamMembers}
            onChange={e => setProjectInfo({...projectInfo, teamMembers: e.target.value})}
            className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-32 resize-none transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400"
            placeholder="List project champion, sponsor, and cross-functional team members involved in this analysis..."
          />
        </div>
        
        <div className="pt-8 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-4">
          <button 
            type="button" 
            onClick={onSkip}
            className="px-6 py-2.5 rounded-lg font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
          >
            Skip for now
          </button>
          <button 
            type="submit"
            className="px-6 py-2.5 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
          >
            Save & Continue <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  </div>
);

const ReportSection = ({ title, children }) => (
  <section className="mb-6 page-break-inside-avoid">
    <h3 className="text-lg font-bold bg-blue-600 text-white p-2 mb-3 rounded-sm shadow-sm print:bg-slate-200 print:text-black print:border print:border-black">{title}</h3>
    <div>{children}</div>
  </section>
);

const FishboneCanvas = ({ 
  problemStatement, setProblemStatement, categories, 
  updateCategoryName, toggleIgnoreCategory, removeCategory, 
  addCause, updateCause, removeCause 
}) => {
  const HORIZONTAL_GAP = 320;
  const SPINE_Y = 400;
  const BOX_WIDTH = 260;
  const START_X_OFFSET = 380;

  const layout = useMemo(() => {
    let topCount = 0;
    let bottomCount = 0;
    const nodes = [];
    const activeCats = categories; 
    
    const maxItemsOneSide = Math.ceil(activeCats.length / 2);
    const requiredWidth = Math.max(1200, (maxItemsOneSide * HORIZONTAL_GAP) + START_X_OFFSET + 100);
    const startX = requiredWidth - START_X_OFFSET;

    activeCats.forEach((cat, index) => {
      const isTop = index % 2 === 0;
      let attachX, boxX, boxY, lineStartX, lineStartY;

      if (isTop) {
        attachX = startX - (topCount * HORIZONTAL_GAP);
        boxX = attachX - BOX_WIDTH + 60;
        boxY = 60;
        lineStartX = boxX + BOX_WIDTH - 20;
        lineStartY = boxY + 40;
        topCount++;
      } else {
        attachX = startX - (bottomCount * HORIZONTAL_GAP) - (HORIZONTAL_GAP / 2); 
        boxX = attachX - BOX_WIDTH + 60;
        boxY = SPINE_Y + 80;
        lineStartX = boxX + BOX_WIDTH - 20;
        lineStartY = boxY + 20;
        bottomCount++;
      }
      nodes.push({ ...cat, isTop, attachX, boxX, boxY, lineStartX, lineStartY });
    });

    return { nodes, width: requiredWidth, spineEndX: startX + 50 };
  }, [categories]);

  return (
    <div className="relative w-full h-[850px] overflow-auto select-none" style={{ minWidth: layout.width }}>
      <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0" style={{ minWidth: layout.width }}>
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" className="fill-blue-500 dark:fill-blue-400" />
          </marker>
        </defs>
        <line x1={50} y1={SPINE_Y} x2={layout.width - 200} y2={SPINE_Y} stroke="currentColor" strokeWidth="4" className="text-blue-500 dark:text-blue-400" markerEnd="url(#arrowhead)"/>
        {layout.nodes.map(node => {
          if (node.ignored) return null;
          return <line key={`line-${node.id}`} x1={node.lineStartX} y1={node.lineStartY} x2={node.attachX} y2={SPINE_Y} stroke="currentColor" strokeWidth="2" className="text-slate-400 dark:text-slate-500" />
        })}
      </svg>

      <div className="absolute top-0 left-0 w-full h-full z-10 pointer-events-none">
        <div className="absolute pointer-events-auto bg-white dark:bg-slate-800 border-2 border-blue-500 rounded-lg shadow-lg p-4 flex flex-col transition-all hover:shadow-xl" style={{ left: layout.width - 230, top: SPINE_Y - 70, width: 200, height: 140 }}>
          <div className="text-xs font-bold text-blue-500 uppercase tracking-wide mb-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3"/> Effect (Problem)
          </div>
          <textarea value={problemStatement} onChange={(e) => setProblemStatement(e.target.value)} className="w-full flex-1 resize-none bg-transparent outline-none text-sm font-medium leading-relaxed" placeholder="Describe the problem here..."/>
        </div>

        {layout.nodes.map(node => (
          <div key={node.id} className={`absolute pointer-events-auto transition-all duration-300 group ${node.ignored ? 'opacity-40 grayscale scale-95' : 'opacity-100'}`} style={{ left: node.boxX, top: node.boxY, width: BOX_WIDTH }}>
            <div className={`relative bg-white dark:bg-slate-800 rounded shadow-md border border-slate-200 dark:border-slate-700 p-2 z-10 flex items-center gap-2 ${node.isTop ? 'border-b-4 border-b-blue-400' : 'border-t-4 border-t-blue-400'}`}>
              <input type="text" value={node.name} onChange={(e) => updateCategoryName(node.id, e.target.value)} className={`flex-1 bg-transparent font-bold outline-none ${node.ignored ? 'line-through' : ''}`} />
              <div className="flex opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-800 rounded">
                <button onClick={() => toggleIgnoreCategory(node.id)} className="p-1 hover:text-blue-500 text-slate-400"><EyeOff className="w-4 h-4"/></button>
                <button onClick={() => removeCategory(node.id)} className="p-1 hover:text-red-500 text-slate-400"><Trash2 className="w-4 h-4"/></button>
              </div>
            </div>

            {!node.ignored && (
              <div className={`mt-2 flex flex-col gap-1 w-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm p-2 rounded border border-white/20 dark:border-slate-700/50 shadow-inner ${node.isTop ? '' : 'order-first mb-2 mt-0'}`}>
                {node.causes.map(cause => (
                  <div key={cause.id} className="group/cause flex items-center gap-1 bg-white dark:bg-slate-700 px-2 py-1.5 rounded border border-slate-200 dark:border-slate-600 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></div>
                    <input type="text" value={cause.text} onChange={(e) => updateCause(node.id, cause.id, e.target.value)} className="flex-1 bg-transparent outline-none min-w-0" placeholder="Empty cause..." autoFocus={cause.text === ''} />
                    <button onClick={() => removeCause(node.id, cause.id)} className="opacity-0 group-hover/cause:opacity-100 text-red-400 hover:text-red-600 p-0.5"><X className="w-3 h-3" /></button>
                  </div>
                ))}
                <button onClick={() => addCause(node.id)} className="mt-1 flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-1.5 rounded transition-colors w-full justify-center border border-dashed border-blue-200 dark:border-blue-800">
                  <Plus className="w-3 h-3" /> Add Cause
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const FiveWhysContent = ({ categories, fiveWhysData, updateFiveWhy, collapsedCauses, toggleCollapse, setShowReport }) => {
  const activeCategories = categories.filter(c => !c.ignored && c.causes.length > 0);

  return (
    <div className="flex-1 overflow-auto p-8 scroll-smooth custom-scrollbar relative">
      <div className="max-w-4xl mx-auto w-full space-y-10 pb-20">
        <div className="mb-8 border-b border-slate-200 dark:border-slate-700 pb-6">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <ListTree className="w-6 h-6 text-blue-600" />
            5 Whys Root Cause Analysis
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Drill down into each identified cause by asking "Why?" repeatedly until you find the fundamental root cause.
          </p>
        </div>

        {activeCategories.map(category => (
          <section key={`category-${category.id}`} id={`category-${category.id}`} className="scroll-mt-8">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 pb-2 border-b-2 border-blue-100 dark:border-blue-900/30">
              {category.name}
            </h3>
            
            <div className="space-y-6">
              {category.causes.map((cause, index) => (
                <CauseCard 
                  key={cause.id} category={category} cause={cause} index={index}
                  whys={fiveWhysData[cause.id] || ['', '', '', '', '']}
                  updateWhy={(idx, val) => updateFiveWhy(cause.id, idx, val)}
                  isCollapsed={collapsedCauses[cause.id]}
                  toggleCollapse={() => toggleCollapse(cause.id)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="fixed bottom-0 right-0 left-64 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4 flex justify-end shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
        <button onClick={() => setShowReport(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm">
          <FileText className="w-4 h-4" /> Generate 8D Report
        </button>
      </div>
    </div>
  );
};

const CauseCard = ({ category, cause, index, whys, updateWhy, isCollapsed, toggleCollapse }) => {
  const isCompleted = whys[4].trim() !== '';
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
      <div onClick={toggleCollapse} className="px-5 py-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-start justify-between">
        <div className="flex gap-3 items-start">
          <div className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 w-8 h-8 rounded-lg flex items-center justify-center font-bold shrink-0 mt-0.5">{index + 1}</div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{category.name}</div>
            <h4 className="text-lg font-medium text-slate-800 dark:text-slate-100">{cause.text}</h4>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isCompleted && <CheckCircle2 className="w-5 h-5 text-emerald-500" title="Completed" />}
          <div className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400">
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </div>
      {!isCollapsed && (
        <div className="px-6 py-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700/50">
          <div className="relative space-y-4">
            <div className="absolute left-[1.35rem] top-8 bottom-8 w-0.5 bg-slate-200 dark:bg-slate-700"></div>
            {whys.map((whyText, i) => (
              <div key={i} className="flex gap-4 relative z-10 group">
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div className={`w-11 h-11 rounded-full border-2 flex items-center justify-center font-bold shadow-sm transition-colors ${whyText.trim() !== '' ? (i === 4 ? 'bg-red-500 border-red-500 text-white' : 'bg-blue-500 border-blue-500 text-white') : (i === 4 ? 'bg-white dark:bg-slate-800 border-red-200 dark:border-red-900/50 text-red-400' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400')}`}>W{i + 1}</div>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{i === 4 ? 'Why 5 (Root Cause)' : `Why ${i + 1}`}</label>
                  <input type="text" value={whyText} onChange={(e) => updateWhy(i, e.target.value)} placeholder={i === 0 ? `Why did "${cause.text}" happen?` : `Why did the above happen?`} className={`w-full bg-white dark:bg-slate-700 border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-shadow ${i === 4 ? 'border-red-200 dark:border-red-900/50 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500/20'}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};