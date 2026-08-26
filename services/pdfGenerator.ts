/**
 * Service to generate and print/export a PDF guide for RADNITO.
 * Provides complete documentation on getting free Gemini API keys,
 * batch processing, template merging, error checks, and speech dictation.
 */

export const generateRadnitoPDF = (): void => {
  const guideHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>RADNITO - Complete Radiology Dictation & API Key Guide</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 15mm 15mm 15mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1e293b;
      background: #ffffff;
      line-height: 1.5;
      margin: 0;
      padding: 20px;
    }
    .header {
      border-bottom: 2px solid #2563eb;
      padding-bottom: 15px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .title {
      font-size: 24px;
      font-weight: 800;
      color: #1e3a8a;
      margin: 0 0 4px 0;
    }
    .subtitle {
      font-size: 13px;
      color: #64748b;
      margin: 0;
    }
    .badge {
      display: inline-block;
      background: #dbeafe;
      color: #1e40af;
      font-weight: 700;
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 9999px;
      margin-bottom: 6px;
    }
    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px;
      margin-bottom: 16px;
      page-break-inside: avoid;
    }
    .card-title {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 8px 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .step-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin-top: 8px;
    }
    .step-box {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px;
    }
    .step-num {
      display: inline-block;
      width: 20px;
      height: 20px;
      background: #2563eb;
      color: #ffffff;
      border-radius: 50%;
      text-align: center;
      line-height: 20px;
      font-size: 11px;
      font-weight: bold;
      margin-right: 6px;
    }
    .step-heading {
      font-weight: bold;
      font-size: 13px;
      color: #1e293b;
      margin-bottom: 4px;
    }
    .step-desc {
      font-size: 11px;
      color: #475569;
    }
    .tip-box {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 10px 12px;
      border-radius: 4px;
      font-size: 12px;
      color: #92400e;
      margin: 12px 0;
      page-break-inside: avoid;
    }
    ul, ol {
      margin: 6px 0;
      padding-left: 20px;
      font-size: 12px;
    }
    li {
      margin-bottom: 4px;
    }
    .footer {
      margin-top: 25px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      font-size: 10px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
    .btn-print {
      background: #2563eb;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 20px; text-align: right;">
    <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>

  <div class="header">
    <div>
      <span class="badge">RADNITO v23.0 USER GUIDE</span>
      <h1 class="title">RADNITO Radiology AI Dictation & Template System</h1>
      <p class="subtitle">Complete user manual, API key configuration, and workflow reference.</p>
    </div>
    <div style="text-align: right; font-size: 11px; color: #64748b;">
      Updated: 2026<br>
      Status: 100% Free Client-Side
    </div>
  </div>

  <div class="card">
    <div class="card-title">🔑 How to Get Your Free Google Gemini API Key (1 Minute)</div>
    <p style="font-size: 12px; margin: 0 0 10px 0; color: #475569;">
      RADNITO processes audio directly using Google Gemini's advanced multimodal models. Follow these simple steps to obtain your free personal API key:
    </p>
    <div class="step-grid">
      <div class="step-box">
        <div class="step-heading"><span class="step-num">1</span>Open Google AI Studio</div>
        <div class="step-desc">Visit <strong>aistudio.google.com/app/apikey</strong> in any browser.</div>
      </div>
      <div class="step-box">
        <div class="step-heading"><span class="step-num">2</span>Sign in with Google</div>
        <div class="step-desc">Use any existing personal or workspace Google Account (no billing or credit card required).</div>
      </div>
      <div class="step-box">
        <div class="step-heading"><span class="step-num">3</span>Create API Key</div>
        <div class="step-desc">Click the blue <strong>"Create API Key"</strong> button, choose your project, and copy the generated key.</div>
      </div>
      <div class="step-box">
        <div class="step-heading"><span class="step-num">4</span>Save in RADNITO</div>
        <div class="step-desc">Paste the key into the RADNITO setup modal. Keys are encrypted and stored solely in your local browser.</div>
      </div>
    </div>
  </div>

  <div class="tip-box">
    <strong>⚡ Load Balancing & Zero Downtime:</strong> You can add 2 or 3 API keys in the <em>API Key Management</em> window. RADNITO automatically distributes requests and gracefully fails over to secondary keys if rate limits are reached.
  </div>

  <div class="card">
    <div class="card-title">🎙️ Core Workflow & Capabilities</div>
    <ul>
      <li><strong>Concurrent Batch Audio Transcription:</strong> Drop multiple audio files or record dictations in parallel. Process 10+ cases in seconds.</li>
      <li><strong>600+ Standard Radiology Templates:</strong> Instant auto-filling across Neuro, Chest, MSK, Abdomen, Pelvis, and Pediatric examinations.</li>
      <li><strong>DOCX Template Merging:</strong> Upload your hospital's custom formatted Word (.docx) letterheads and merge findings into exact placeholders without disturbing layout or header logos.</li>
      <li><strong>Radiology Contradiction & Error Detection:</strong> Automatically flags contradictory statements (e.g., negative PE with a described thrombus).</li>
      <li><strong>Multi-Patient Audio Splitting:</strong> Continuous recordings containing multiple cases are automatically segmented into individual patient reports.</li>
    </ul>
  </div>

  <div class="card">
    <div class="card-title">💡 Pro Tips for Radiologists</div>
    <ul>
      <li><strong>Dictate Natural Instructions:</strong> Say <em>"Heading Impression: Acute infarction"</em> or <em>"Remove previous normal line"</em> during dictation.</li>
      <li><strong>Drag & Drop Reordering:</strong> Easily rearrange finding rows and merge related sections using the Merge Mode toggle.</li>
      <li><strong>One-Click HTML Export:</strong> Download comprehensive interactive report archives that operate completely offline.</li>
    </ul>
  </div>

  <div class="footer">
    <div>RADNITO AI Dictation Corrector</div>
    <div>Secure &bull; Client-Side Storage &bull; Gemini Multimodal AI</div>
  </div>

  <script>
    window.addEventListener('load', () => {
      // Auto trigger print dialog if requested
      setTimeout(() => {
        window.print();
      }, 500);
    });
  </script>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(guideHtml);
    printWindow.document.close();
  } else {
    // If popup was blocked, fallback to creating a blob and downloading HTML
    const blob = new Blob([guideHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'RADNITO_User_Guide.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};
