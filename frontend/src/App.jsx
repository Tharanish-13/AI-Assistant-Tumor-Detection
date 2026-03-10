import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  Activity, 
  Image as ImageIcon, 
  Cpu, 
  Database, 
  ShieldCheck, 
  Settings, 
  LayoutDashboard,
  List,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  BarChart2,
  PieChart,
  FileText,
  Activity as ActivityIcon
} from 'lucide-react';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [metricsData, setMetricsData] = useState(null);
  const [worklist, setWorklist] = useState([
    { id: '1003', patientName: 'Robert Johnson', scanType: 'CT Thorax', priority: 'Urgent', date: new Date().toLocaleDateString() },
    { id: '1001', patientName: 'John Doe', scanType: 'Chest X-Ray', priority: 'Routine', date: new Date().toLocaleDateString() },
    { id: '1002', patientName: 'Jane Smith', scanType: 'MRI Brain', priority: 'Normal', date: new Date().toLocaleDateString() }
  ]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [reviewStatus, setReviewStatus] = useState(null); // 'accept', 'modify', 'reject', 'submitted'
  const [reviewComments, setReviewComments] = useState('');
  const [radiologyReport, setRadiologyReport] = useState('');
  const [criticalAlert, setCriticalAlert] = useState(null);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const fileInputRef = useRef(null);

  const getPriorityIcon = (priority) => {
    if (priority === 'Urgent') return <AlertTriangle size={16} />;
    if (priority === 'Routine') return <AlertCircle size={16} />;
    return <CheckCircle size={16} />;
  };

  const getSortedWorklist = () => {
    const priorityWeight = { 'Urgent': 3, 'Routine': 2, 'Normal': 1 };
    return [...worklist].sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);
  };

  const generateReport = (predictions, localizations) => {
    const date = new Date().toLocaleDateString();
    let findings = [];
    let highestRisk = "Low";
    let maxProb = 0;

    if (predictions) {
      for (const [cls, prob] of Object.entries(predictions)) {
        if (cls !== "Normal" && prob > 0.5) {
          findings.push(`- ${cls} (Confidence: ${(prob * 100).toFixed(1)}%)`);
        }
        if (cls !== "Normal" && prob > maxProb) {
          maxProb = prob;
        }
      }
    }

    if (maxProb > 0.8) highestRisk = "High";
    else if (maxProb > 0.4) highestRisk = "Moderate";

    let localizationText = "No specific focal lesions mapped.";
    if (localizations && localizations.length > 0) {
      localizationText = localizations.map((loc, i) => 
        `- Lesion ${i + 1}: Region at coords (${loc.x}, ${loc.y}), size ${loc.w}x${loc.h} px. Consistent with ${loc.class}.`
      ).join('\n');
    }

    return `*** PRELIMINARY RADIOLOGY REPORT ***
STATUS: AI Generated – Pending Radiologist Review
Date: ${date}
Exam: Chest/MRI Scan Review
--------------------------------------------------
CLINICAL INDICATION: AI Second Reader Automatic Assessment
--------------------------------------------------
FINDINGS:
${findings.length > 0 ? findings.join('\n') : "No significant abnormalities detected above pathological threshold."}

LOCALIZATION & SIZE:
${localizationText}

IMPRESSION & RISK ASSESSMENT:
Overall AI Risk Level: ${highestRisk}
Follow-up or correlation with clinical symptoms recommended.
--------------------------------------------------
Electronically drafted by: NeuroScan AI`;
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (selectedFile) => {
    // Check supported formats (DICOM, PNG, JPG)
    const validTypes = ['image/png', 'image/jpeg', 'application/dicom'];
    const filename = selectedFile.name.toLowerCase();
    const isValidExtension = filename.endsWith('.png') || filename.endsWith('.jpg') || filename.endsWith('.jpeg') || filename.endsWith('.dcm');
    
    if (validTypes.includes(selectedFile.type) || isValidExtension) {
      setFile(selectedFile);
      setError(null);
      setResult(null);
      setReviewStatus(null);
      setReviewComments('');
      // Store currently entered patient values for upload logic
      uploadFile(selectedFile, patientName, patientId);
    } else {
      setError('Invalid file format. Please upload a .dcm, .png, or .jpg file.');
    }
  };

  const onFileUploadBtnClick = () => {
    fileInputRef.current.click();
  };

  const uploadFile = async (fileToUpload, name, id) => {
    setIsUploading(true);
    setResult(null);
    setError(null);

    const formData = new FormData();
    formData.append('file', fileToUpload);
    if (name) formData.append('patient_name', name);
    if (id) formData.append('patient_id', id);

    try {
      // Connecting to our FastAPI backend
      const response = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      if (data.status === 'success') {
        setResult(data);
        setRadiologyReport(generateReport(data.predictions, data.localizations));
        
        // Add to Triage Worklist automatically
        const priority = data.triage_priority || 'Normal';
        const newItem = {
          id: id || Math.floor(Math.random() * 10000 + 2000).toString(),
          patientName: name || 'Unassigned',
          scanType: data.type || 'Medical Scan',
          priority: priority,
          date: new Date().toLocaleDateString(),
          resultData: data
        };
        setWorklist(prev => [newItem, ...prev]);
        
        // Critical Alert Trigger
        if (priority === 'Urgent' && data.predictions) {
          const topAbnormality = Object.entries(data.predictions).reduce((a, b) => (b[1] > a[1] && b[0] !== 'Normal') ? b : a, ['', 0]);
          if (topAbnormality[0]) {
            setCriticalAlert({
              patient: newItem.patientName,
              message: `High confidence of ${topAbnormality[0]} (${(topAbnormality[1] * 100).toFixed(1)}%). Requires immediate attention.`,
              preview: data.preview
            });
          }
        }
        
        // Note: we stay on the 'upload' view dynamically for them to read the current scan results,
        // but it highlights how the system works for continuous workflow.
      } else {
        setError(data.message || 'An error occurred during processing.');
      }
    } catch (err) {
      setError(`Failed to connect to the analysis server: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const res = await fetch('http://localhost:8000/metrics');
      const data = await res.json();
      setMetricsData(data);
    } catch (e) {
      console.error("Failed to fetch metrics", e);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'monitoring' && !metricsData) {
      fetchMetrics();
    }
  };

  const submitFeedback = async (status) => {
    setIsSubmittingFeedback(true);
    try {
      const response = await fetch('http://localhost:8000/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: result.filename,
          status: status,
          comments: reviewComments,
          generated_report: radiologyReport,
          ai_predictions: result.predictions || {},
          ai_localizations: result.localizations || []
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      setReviewStatus('submitted');
    } catch (err) {
      setError(`Feedback submission error: ${err.message}`);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="logo">
          <Activity className="logo-icon" size={28} />
          <span>NeuroScan AI</span>
        </div>
        
        <nav className="nav-links">
          <div className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => handleTabChange('dashboard')}>
            <PieChart size={20} />
            Overview Dashboard
          </div>
          <div className={`nav-link ${activeTab === 'upload' ? 'active' : ''}`} onClick={() => handleTabChange('upload')}>
            <UploadCloud size={20} />
            Diagnostic Upload
          </div>
          <div className={`nav-link ${activeTab === 'worklist' ? 'active' : ''}`} onClick={() => handleTabChange('worklist')}>
            <List size={20} />
            AI Triage Worklist
          </div>
          <div className={`nav-link ${activeTab === 'monitoring' ? 'active' : ''}`} onClick={() => handleTabChange('monitoring')}>
            <BarChart2 size={20} />
            AI Performance
          </div>
          <div className={`nav-link ${activeTab === 'models' ? 'active' : ''}`} onClick={() => handleTabChange('models')}>
            <Cpu size={20} />
            AI Models
          </div>
        </nav>
      </aside>

      <main className="main-content">
        <header className="header">
          <div className="header-title">Diagnostic System Overview</div>
          <div className="user-profile">
            <ShieldCheck size={20} color="var(--success)" />
            <span>Secure Connection</span>
            <div className="avatar">Dr.</div>
          </div>
        </header>

        {activeTab === 'dashboard' ? (
          <section className="content-area">
            <div className="dashboard-overview">
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <PieChart color="var(--accent-color)" /> Clinic Intelligence Dashboard
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Real-time overview of AI processing pipeline, patient ingest queues, and hardware diagnostic load.
              </div>

              <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="panel" style={{ borderLeft: '4px solid var(--accent-color)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '0.25rem', fontWeight: 600 }}>Triage Queue Size</div>
                  <div style={{ fontSize: '2rem', color: '#fff', fontWeight: 700 }}>{worklist.length}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>Active patients pending review</div>
                </div>
                <div className="panel" style={{ borderLeft: '4px solid var(--warning)', borderColor: 'rgba(210, 153, 34, 0.4)' }}>
                  <div style={{ color: 'var(--warning)', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '0.25rem', fontWeight: 600 }}>Urgent Scans</div>
                  <div style={{ fontSize: '2rem', color: '#fff', fontWeight: 700 }}>{worklist.filter(w => w.priority === 'Urgent').length}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>High confidence tumor findings</div>
                </div>
                <div className="panel" style={{ borderLeft: '4px solid var(--success)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '0.25rem', fontWeight: 600 }}>System Status</div>
                  <div style={{ fontSize: '2rem', color: 'var(--success)', fontWeight: 700 }}>100%</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>5 inference modes online</div>
                </div>
              </div>

              <div className="panel" style={{ marginTop: '1rem' }}>
                <div className="panel-header" style={{ marginBottom: '1rem' }}>
                  <Activity size={18} /> Recent Upload Activity
                </div>
                {worklist.slice(0, 3).map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>
                    <div>
                      <div style={{ color: '#fff', fontWeight: 500 }}>{item.patientName}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Scan: {item.scanType} • ID: #{item.id}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div className={`priority-badge priority-${item.priority.toLowerCase()}`}>
                        {item.priority}
                      </div>
                    </div>
                  </div>
                ))}
                <button 
                  onClick={() => handleTabChange('upload')} 
                  style={{ width: '100%', marginTop: '1.5rem', padding: '0.75rem', backgroundColor: 'var(--accent-color)', color: '#000', fontWeight: 600, border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  + Upload New Patient Scan
                </button>
              </div>
            </div>
          </section>
        ) : activeTab === 'upload' ? (
        <section className="content-area">
          <div className="upload-section">
            <div className="patient-form" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
               <div style={{ flex: 1 }}>
                 <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Patient Full Name</label>
                 <input 
                   type="text" 
                   className="form-input" 
                   placeholder="e.g., John Doe" 
                   value={patientName} 
                   onChange={e => setPatientName(e.target.value)}
                   style={{ 
                     width: '100%', 
                     padding: '0.75rem', 
                     backgroundColor: 'rgba(255, 255, 255, 0.05)', 
                     border: '1px solid var(--border-color)', 
                     borderRadius: '6px', 
                     color: '#fff' 
                   }}
                 />
               </div>
               <div style={{ flex: 1 }}>
                 <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Patient ID / MRN</label>
                 <input 
                   type="text" 
                   className="form-input" 
                   placeholder="e.g., MRN-1004" 
                   value={patientId} 
                   onChange={e => setPatientId(e.target.value)}
                   style={{ 
                     width: '100%', 
                     padding: '0.75rem', 
                     backgroundColor: 'rgba(255, 255, 255, 0.05)', 
                     border: '1px solid var(--border-color)', 
                     borderRadius: '6px', 
                     color: '#fff' 
                   }}
                 />
               </div>
            </div>
            
            <div 
              className={`upload-zone ${isDragging ? 'drag-active' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={onFileUploadBtnClick}
            >
              {isUploading && (
                <div className="loading-overlay">
                  <div className="spinner"></div>
                  <div style={{ color: '#fff', fontWeight: 500 }}>
                    Processing scan for AI pipeline...
                  </div>
                </div>
              )}
              
              <UploadCloud className="upload-icon" />
              <div className="upload-title">Secure Medical Image Upload</div>
              <div className="upload-desc">
                Drag and drop your Chest X-ray or MRI scan here, or click to browse.
                Supported formats: DICOM (.dcm), PNG, JPG.
              </div>
              <button className="upload-button" onClick={(e) => {
                e.stopPropagation();
                onFileUploadBtnClick();
              }}>
                Select Local File
              </button>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange} 
                accept=".dcm,.png,.jpg,.jpeg,image/png,image/jpeg,application/dicom" 
                className="hidden-input" 
              />
            </div>

            {error && (
              <div style={{ color: 'var(--error)', backgroundColor: 'rgba(248, 81, 73, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--error)' }}>
                {error}
              </div>
            )}
          </div>

          {result && (
            <div className="results-grid">
              <div className="panel viewer-panel" style={{ gridColumn: result.previous_scan ? '1 / span 2' : 'auto' }}>
                <div className="panel-header" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <ImageIcon size={20} /> {result.previous_scan ? "Historical Scan Comparison" : "Scan Viewer & Localization"}
                  </div>
                  {result.previous_scan && (
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      Comparing Current Scan vs. Previous Scan ({result.previous_scan.date})
                    </div>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  
                  {/* Previous Scan (if available) */}
                  {result.previous_scan && (
                    <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, textAlign: 'center' }}>PREVIOUS SCAN ({result.previous_scan.date})</div>
                      <div className="viewer-wrapper" style={{ position: 'relative', width: '100%', maxWidth: '400px', aspectRatio: '1' }}>
                        <img 
                          src={`data:image/jpeg;base64,${result.previous_scan.preview}`} 
                          alt="Previous Scan" 
                          className="viewer-image" 
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                        {/* Bounding box overlays for prev */}
                        {result.previous_scan.localizations && result.previous_scan.localizations.map((loc, idx) => (
                          <div 
                            key={`prev-${idx}`}
                            className="localization-box"
                            style={{
                              position: 'absolute',
                              left: `${loc.x_norm * 100}%`,
                              top: `${loc.y_norm * 100}%`,
                              width: `${loc.w_norm * 100}%`,
                              height: `${loc.h_norm * 100}%`,
                              border: '2px dashed var(--text-muted)',
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              pointerEvents: 'none'
                            }}
                          >
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Current Scan */}
                  <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                    {result.previous_scan && (
                      <div style={{ color: 'var(--accent-color)', fontSize: '0.9rem', fontWeight: 600, textAlign: 'center' }}>CURRENT SCAN (Today)</div>
                    )}
                    <div className="viewer-wrapper" style={{ position: 'relative', width: '100%', maxWidth: '400px', aspectRatio: '1' }}>
                      <img 
                        src={`data:image/jpeg;base64,${result.preview}`} 
                        alt="Scan Preview" 
                        className="viewer-image" 
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                      {/* Bounding box overlays */}
                      {result.localizations && result.localizations.map((loc, idx) => (
                        <div 
                          key={`box-${idx}`}
                          className="localization-box"
                          style={{
                            position: 'absolute',
                            left: `${loc.x_norm * 100}%`,
                            top: `${loc.y_norm * 100}%`,
                            width: `${loc.w_norm * 100}%`,
                            height: `${loc.h_norm * 100}%`,
                            border: '2px solid var(--error)',
                            backgroundColor: 'rgba(248, 81, 73, 0.2)',
                            pointerEvents: 'none',
                            boxShadow: '0 0 10px rgba(248, 81, 73, 0.5)'
                          }}
                        />
                      ))}
                      {/* Labels on top of all bounding boxes */}
                      {result.localizations && result.localizations.map((loc, idx) => (
                        <div 
                          key={`label-${idx}`}
                          style={{
                            position: 'absolute',
                            top: `calc(${loc.y_norm * 100}% - 24px)`,
                            left: `calc(${loc.x_norm * 100}% - 2px)`,
                            backgroundColor: 'var(--error)',
                            color: '#fff',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            padding: '2px 6px',
                            borderRadius: '4px 4px 4px 0',
                            whiteSpace: 'nowrap',
                            pointerEvents: 'none',
                            zIndex: 10
                          }}
                        >
                          {loc.class} {(loc.score * 100).toFixed(1)}%
                        </div>
                      ))}
                    </div>
                  </div>
                  
                </div>
              </div>

              <div className="panel data-panel">
                <div className="panel-header">
                  <Cpu size={20} /> AI Pre-processing Metadata
                </div>
                
                <div className="success-badge">
                  <ShieldCheck size={16} /> 
                  File stored securely & encrypted
                </div>
                
                <div className="info-list">
                  <div className="info-item">
                    <span className="info-label">Filename</span>
                    <span className="info-value">{result.filename}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Format Type</span>
                    <span className="info-value">{result.type}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">AI Input Tensor</span>
                    <span className="info-value">{result.tensor_shape}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Normalization</span>
                    <span className="info-value">ImageNet Stats (μ, σ)</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Ready for AI processing</span>
                    <span className="info-value" style={{ color: 'var(--success)' }}>Yes</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">AI Triage Priority</span>
                    <span className="info-value">
                      <div className={`priority-badge priority-${(result.triage_priority || "Normal").toLowerCase()}`} style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem', marginTop: '-4px', marginBottom: '-4px' }}>
                        {getPriorityIcon(result.triage_priority || "Normal")} {result.triage_priority || "Normal"}
                      </div>
                    </span>
                  </div>
                </div>

                {result.predictions && (
                  <div className="predictions-section" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
                    <div style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem', color: '#fff' }}>DenseNet121 Detection Results</div>
                    {Object.entries(result.predictions).map(([className, prob]) => (
                      <div key={className} style={{ marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                          <span style={{ color: 'var(--text-main)' }}>{className}</span>
                          <span style={{ 
                            color: prob > 0.5 ? 'var(--error)' : 'var(--success)', 
                            fontWeight: 600 
                          }}>
                            {(prob * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ 
                            width: `${prob * 100}%`, 
                            height: '100%', 
                            backgroundColor: prob > 0.5 ? 'var(--error)' : 'var(--success)',
                            borderRadius: '3px'
                          }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {result.localizations && result.localizations.length > 0 && (
                  <div className="localizations-section" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
                    <div style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Activity size={18} color="var(--error)" /> Detected Lesion Regions
                    </div>
                    {result.localizations.map((loc, idx) => (
                      <div key={idx} className="info-item" style={{ flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                          <span style={{ color: 'var(--error)', fontWeight: 500 }}>{loc.class}</span>
                          <span style={{ color: 'var(--text-muted)' }}>Confidence: {(loc.score * 100).toFixed(1)}%</span>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          <span><strong style={{ color: '#fff' }}>Size:</strong> {loc.w}x{loc.h} px</span>
                          <span><strong style={{ color: '#fff' }}>Coords:</strong> ({loc.x}, {loc.y})</span>
                        </div>
                        {loc.growth_pct !== undefined && loc.growth_pct > 0 && (
                          <div style={{ fontSize: '0.85rem', color: 'var(--error)', backgroundColor: 'rgba(248, 81, 73, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(248, 81, 73, 0.3)', marginTop: '0.25rem' }}>
                            <AlertTriangle size={12} style={{ display: 'inline', marginBottom: '-2px' }}/> 
                            <strong> Size Change:</strong> +{loc.growth_pct}% Area Growth detected since last scan
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* AI Structured Radiology Report Module */}
                <div className="report-section" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <LayoutDashboard size={18} color="var(--accent-color)" /> Preliminary Radiology Report
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    AI Generated – Pending Radiologist Review. Radiologists may edit this report before final sign-off.
                  </div>
                  <textarea 
                    value={radiologyReport}
                    onChange={(e) => setRadiologyReport(e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: '280px',
                      backgroundColor: 'rgba(13, 17, 23, 0.9)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '1rem',
                      color: '#c9d1d9',
                      fontFamily: 'monospace',
                      fontSize: '0.9rem',
                      lineHeight: '1.5',
                      resize: 'vertical',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                    }}
                  />
                </div>

                {/* Second Reader Review Module */}
                <div className="review-section" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldCheck size={18} color="var(--accent-color)" /> Finalize & Submit Review
                  </div>
                  
                  {reviewStatus === 'submitted' ? (
                    <div style={{ backgroundColor: 'rgba(46, 160, 67, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--success)', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <ShieldCheck size={20} /> Review & Radiology Report successfully signed and logged.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {reviewStatus === 'modify' && (
                        <textarea 
                          placeholder="Additional internal clinical notes for AI model retraining (not part of the patient report)..."
                          value={reviewComments}
                          onChange={(e) => setReviewComments(e.target.value)}
                          style={{
                            width: '100%',
                            minHeight: '80px',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            padding: '0.75rem',
                            color: '#fff',
                            fontFamily: 'inherit',
                            resize: 'vertical'
                          }}
                        />
                      )}
                      
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {reviewStatus !== 'modify' && (
                          <>
                            <button 
                              onClick={() => submitFeedback('preliminary_saved')}
                              disabled={isSubmittingFeedback}
                              style={{ flex: 1, backgroundColor: 'rgba(88, 166, 255, 0.1)', color: 'var(--accent-color)', border: '1px solid var(--accent-color)', padding: '0.75rem 1rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                            >
                              Save as Preliminary
                            </button>
                            <button 
                              onClick={() => submitFeedback('accepted')}
                              disabled={isSubmittingFeedback}
                              style={{ flex: 1, backgroundColor: 'var(--success)', color: '#fff', border: 'none', padding: '0.75rem 1rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                            >
                              Approve AI & Report
                            </button>
                          </>
                        )}
                        
                        {reviewStatus === 'modify' ? (
                          <button 
                            onClick={() => submitFeedback('modified')}
                            disabled={isSubmittingFeedback}
                            style={{ flex: 1, backgroundColor: 'var(--accent-color)', color: '#000', border: 'none', padding: '0.75rem 1rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Submit Modifications
                          </button>
                        ) : (
                          <button 
                            onClick={() => setReviewStatus('modify')}
                            style={{ flex: 1, backgroundColor: 'transparent', color: 'var(--accent-color)', border: '1px solid var(--accent-color)', padding: '0.75rem 1rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Flag for Model Correction
                          </button>
                        )}
                        
                        <button 
                          onClick={() => submitFeedback('rejected')}
                          disabled={isSubmittingFeedback}
                          style={{ flex: 1, backgroundColor: 'transparent', color: 'var(--error)', border: '1px solid var(--error)', padding: '0.75rem 1rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Reject AI Findings
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}
        </section>
        ) : activeTab === 'worklist' ? (
        <section className="content-area">
          <div className="worklist-view">
             <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <List color="var(--accent-color)" /> AI-Prioritized Triage Queue
             </div>
             <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Medical cases are automatically ingested and sorted by AI inferred abnormalities. Urgent cases are pushed to the top of the workflow stack.
             </div>
             
             <div className="panel" style={{ padding: '0' }}>
                <table className="worklist-table">
                  <thead>
                    <tr>
                      <th>Queue ID</th>
                      <th>Patient Profile</th>
                      <th>Scan Category</th>
                      <th>Acquired Date</th>
                      <th>AI Triage Priority</th>
                      <th>Review Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedWorklist().map((item) => (
                      <tr key={item.id} onClick={() => {
                        if (item.resultData) {
                          setResult(item.resultData);
                          setRadiologyReport(generateReport(item.resultData.predictions, item.resultData.localizations));
                          setReviewStatus(null);
                          setFile(null);
                          setActiveTab('upload');
                        }
                      }}>
                        <td style={{ fontFamily: 'monospace' }}>#{item.id}</td>
                        <td style={{ color: '#fff', fontWeight: 500 }}>{item.patientName}</td>
                        <td>{item.scanType}</td>
                        <td>{item.date}</td>
                        <td>
                          <div className={`priority-badge priority-${item.priority.toLowerCase()}`}>
                            {getPriorityIcon(item.priority)} {item.priority}
                          </div>
                        </td>
                        <td>
                          {item.resultData ? (
                            <span style={{ color: 'var(--accent-color)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              Diagnose <ArrowRight size={14} />
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>Historical Data</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        </section>
        ) : activeTab === 'monitoring' ? (
        <section className="content-area">
          <div className="monitoring-view">
             <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <BarChart2 color="var(--accent-color)" /> Model Performance Oversight
             </div>
             <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Auditing active deep learning accuracy, false positive thresholds, and clinical correction rates mapped against live deployment.
             </div>
             
             {metricsData ? (
               <>
                 <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                   <div className="panel" style={{ textAlign: 'center' }}>
                     <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 600 }}>Total Analyzed</div>
                     <div style={{ fontSize: '2rem', color: '#fff', fontWeight: 700 }}>{metricsData.metrics.total_analyzed}</div>
                     <div style={{ color: 'var(--success)', fontSize: '0.85rem', marginTop: '0.5rem' }}>↗ Vol. Increasing</div>
                   </div>
                   <div className="panel" style={{ textAlign: 'center' }}>
                     <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 600 }}>Sensitivity</div>
                     <div style={{ fontSize: '2rem', color: 'var(--accent-color)', fontWeight: 700 }}>{metricsData.metrics.sensitivity}</div>
                     <div style={{ color: 'var(--success)', fontSize: '0.85rem', marginTop: '0.5rem' }}>Optimized Profile</div>
                   </div>
                   <div className="panel" style={{ textAlign: 'center' }}>
                     <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 600 }}>Doctor Agreement</div>
                     <div style={{ fontSize: '2rem', color: 'var(--success)', fontWeight: 700 }}>{metricsData.metrics.radiologist_agreement}</div>
                     <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>Reviewer verified</div>
                   </div>
                   <div className="panel" style={{ textAlign: 'center', borderColor: 'rgba(248, 81, 73, 0.4)' }}>
                     <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 600 }}>False Positive Rate</div>
                     <div style={{ fontSize: '2rem', color: 'var(--error)', fontWeight: 700 }}>{metricsData.metrics.false_positive_rate}</div>
                     <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>Within 5% Tolerance</div>
                   </div>
                 </div>
                 
                 <div className="panel" style={{ padding: '0', marginBottom: '2rem' }}>
                  <div className="panel-header" style={{ margin: '1.5rem 1.5rem 0.5rem 1.5rem' }}>
                    <FileText size={18} /> Central Audit Trail
                  </div>
                  <table className="worklist-table">
                    <thead>
                      <tr>
                        <th>Scan ID</th>
                        <th>Timestamp</th>
                        <th>Target Patient</th>
                        <th>AI Findings</th>
                        <th>Reviewer Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metricsData.audit_trail.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ fontFamily: 'monospace' }}>#{item.id}</td>
                          <td>{item.date}</td>
                          <td style={{ color: '#fff', fontWeight: 500 }}>{item.patient}</td>
                          <td style={{ color: 'var(--text-muted)' }}>
                            {item.findings.length > 0 ? item.findings.join(", ") : "Normal"}
                          </td>
                          <td>
                            {item.action === 'ACCEPTED' && <span style={{ color: 'var(--success)' }}><CheckCircle size={14} style={{ display: 'inline', marginBottom: '-2px' }}/> Approved</span>}
                            {item.action === 'MODIFIED' && <span style={{ color: 'var(--accent-color)' }}><AlertCircle size={14} style={{ display: 'inline', marginBottom: '-2px' }}/> Modified</span>}
                            {item.action === 'REJECTED' && <span style={{ color: 'var(--error)' }}><AlertTriangle size={14} style={{ display: 'inline', marginBottom: '-2px' }}/> Rejected</span>}
                            {item.action === 'PRELIMINARY_SAVED' && <span style={{ color: 'var(--text-muted)' }}><ActivityIcon size={14} style={{ display: 'inline', marginBottom: '-2px' }}/> Draft Pending</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                 </div>
               </>
             ) : (
               <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                 Generating Telemetry Overview...
               </div>
             )}
          </div>
        </section>
        ) : activeTab === 'models' ? (
        <section className="content-area">
          <div className="models-view">
             <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Cpu color="var(--accent-color)" /> AI Model Administration
             </div>
             <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Manage loaded neural networks and deep learning models for inference.
             </div>
             
             <div className="models-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <div className="panel" style={{ borderLeft: '4px solid var(--success)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ fontWeight: 600, color: '#fff' }}>DenseNet-121 Classifier</div>
                    <div style={{ fontSize: '0.75rem', backgroundColor: 'rgba(46, 160, 67, 0.1)', color: 'var(--success)', padding: '2px 8px', borderRadius: '10px', border: '1px solid var(--success)' }}>ACTIVE</div>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    Primary multi-class classification model for detecting 14 common thoracic diseases and tumors from chest X-rays.
                  </div>
                  <div style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--glass-border)', paddingTop: '0.75rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Version: v2.4.1</span>
                    <span style={{ color: '#fff' }}>Params: 7.0M</span>
                  </div>
                </div>

                <div className="panel" style={{ borderLeft: '4px solid var(--success)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ fontWeight: 600, color: '#fff' }}>ResNet-50 Localization Model</div>
                    <div style={{ fontSize: '0.75rem', backgroundColor: 'rgba(46, 160, 67, 0.1)', color: 'var(--success)', padding: '2px 8px', borderRadius: '10px', border: '1px solid var(--success)' }}>ACTIVE</div>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    Bounding box regression model for highlighting precise lesion coordinates on input scans.
                  </div>
                  <div style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--glass-border)', paddingTop: '0.75rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Version: v1.8.0</span>
                    <span style={{ color: '#fff' }}>Params: 23.5M</span>
                  </div>
                </div>
                
                <div className="panel" style={{ borderLeft: '4px solid var(--text-muted)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ fontWeight: 600, color: '#fff' }}>Brain MRI Segmentation Subsystem</div>
                    <div style={{ fontSize: '0.75rem', backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: '10px', border: '1px solid var(--text-muted)' }}>INACTIVE</div>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    High-resolution 3D U-Net masking for volumetric brain tumor isolation. Currently pending validation.
                  </div>
                  <div style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--glass-border)', paddingTop: '0.75rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Version: v0.9.beta</span>
                    <span style={{ color: '#fff' }}>Params: 19.0M</span>
                  </div>
                </div>
             </div>
          </div>
        </section>
        ) : null}
      </main>

      {/* Critical Alert Portal */}
      {criticalAlert && (
        <div className="critical-alert-overlay">
          <div className="critical-alert-box">
            <div className="alert-header">
              <AlertTriangle color="white" />
              <span>URGENT MEDICAL ALERT</span>
            </div>
            <div className="alert-body">
              <img src={`data:image/jpeg;base64,${criticalAlert.preview}`} alt="Alert Preview" />
              <div className="alert-info">
                <div style={{ marginBottom: '0.5rem' }}><strong>Target Patient:</strong> {criticalAlert.patient}</div>
                <div style={{ marginBottom: '0.5rem' }}><strong>Detection:</strong> <span style={{ color: 'var(--error)', fontWeight: 600 }}>{criticalAlert.message}</span></div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>This scan has been automatically pushed to the top of your AI Triage Queue for immediate review.</div>
              </div>
            </div>
            <button className="alert-ack-btn" onClick={() => setCriticalAlert(null)}>Acknowledge & Review Scan</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
