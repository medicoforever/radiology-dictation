// Style Matching and RAG Service for Radiology Reports

const RAG_ENABLED_KEY = 'radiology_rag_style_matching_enabled';

export interface StyleTemplate {
  name: string;
  title?: string;
  category: string;
  exemplarText: string;
}

export function isRAGStyleMatchingEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const val = localStorage.getItem(RAG_ENABLED_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

export function setRAGStyleMatchingEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RAG_ENABLED_KEY, enabled ? 'true' : 'false');
  } catch (e) {
    console.error('Failed to set RAG enabled state:', e);
  }
}

const COMMON_REPORT_STYLES: StyleTemplate[] = [
  {
    name: 'CT Brain Plain Report Style',
    category: 'Brain',
    exemplarText: `C.T.SCAN OF BRAIN (PLAIN)
*Clinical Profile: C/o headache and dizziness.*
Technique: Serial axial sections of the brain were studied without IV contrast.
Findings:
The brain parenchyma demonstrates normal attenuation.
No focal areas of altered attenuation or mass effect are seen.
Ventricular system and basal cisterns are prominent/normal for age.
Midline structures are centrally placed.
Posterior fossa structures, cerebellum, and 4th ventricle appear normal.
Calvarium and skull base appear intact.
IMPRESSION:###No acute intracranial hemorrhage or territorial infarct.`,
  },
  {
    name: 'HRCT Chest Report Style',
    category: 'Chest',
    exemplarText: `HRCT CHEST (HIGH RESOLUTION CT)
*Clinical Profile: C/o chronic cough and exertional dyspnea.*
Technique: High-resolution volumetric axial CT sections of the thorax obtained in inspiration.
Findings:
Trachea and major bronchi appear patent with normal calibre.
Lungs: No focal consolidation, masses, or pleural-based nodules.
No evidence of bronchiectasis, interlobular septal thickening, or ground-glass opacities.
Mediastinum: Heart size is normal. No mediastinal or hilar lymphadenopathy.
Pleural spaces: No pleural effusion or pneumothorax bilaterally.
Thoracic cage and chest wall structures are unremarkable.
IMPRESSION:###Normal HRCT study of the thorax.###No parenchymal or interstitial lung disease.`,
  },
  {
    name: 'MRI Lumbar Spine Report Style',
    category: 'Spine',
    exemplarText: `MRI LUMBAR SPINE
*Clinical Profile: C/o low back pain radiating to left leg.*
Technique: Sagittal T1W, T2W, and axial T2W sections of the lumbar spine.
Findings:
Lumbar lordosis is maintained.
Vertebral body heights and alignment are normal with normal marrow signal.
Conus medullaris terminates at L1-L2 level and appears normal.
Intervertebral discs: Normal disc heights and hydration signals.
The thecal sac, exit neural foramina, and traversing nerve roots are preserved at all levels.
Posterior posterior elements and paraspinal soft tissues are unremarkable.
IMPRESSION:###No significant disc herniation, canal stenosis, or neural impingement in lumbar spine.`,
  },
  {
    name: 'CT Abdomen and Pelvis Report Style',
    category: 'Abdomen',
    exemplarText: `CT ABDOMEN AND PELVIS (CONTRAST ENHANCED)
*Clinical Profile: C/o abdominal discomfort.*
Technique: Helical axial contrast-enhanced CT of abdomen and pelvis.
Findings:
Liver: Normal in size and attenuation. No focal mass lesion.
Gallbladder and Biliary Tree: Gallbladder is normal with no intraluminal calculi. Intra- and extrahepatic bile ducts are non-dilated.
Spleen, Pancreas, and Adrenals: Normal in size and morphology.
Kidneys: Bilateral kidneys are normal in size, position, and enhancement without calculus or hydronephrosis.
GI Tract: Stomach and bowel loops show normal wall thickness and caliber.
Pelvis: Urinary bladder is normal. No pelvic mass or free fluid.
No significant retroperitoneal or mesenteric lymphadenopathy.
IMPRESSION:###No acute abdominal or pelvic pathology detected.`,
  },
];

export async function getRelevantStyleTemplates(hintText: string): Promise<StyleTemplate[]> {
  const text = (hintText || '').toLowerCase();
  const matched = COMMON_REPORT_STYLES.filter(s => {
    if (text.includes('brain') || text.includes('head') || text.includes('stroke')) return s.category === 'Brain';
    if (text.includes('chest') || text.includes('thorax') || text.includes('lung') || text.includes('hrct')) return s.category === 'Chest';
    if (text.includes('spine') || text.includes('lumbar') || text.includes('cervical')) return s.category === 'Spine';
    if (text.includes('abdomen') || text.includes('pelvis') || text.includes('liver') || text.includes('kidney')) return s.category === 'Abdomen';
    return false;
  });

  const list = matched.length > 0 ? matched : COMMON_REPORT_STYLES.slice(0, 1);
  return list.map(s => ({ ...s, title: s.title || s.name }));
}

export function augmentPromptWithStyleTemplates(basePrompt: string, styleTemplates: StyleTemplate[]): string {
  if (!styleTemplates || styleTemplates.length === 0) return basePrompt;
  const styleExamples = styleTemplates.map(st => `--- [STYLE EXEMPLAR: ${st.name}] ---\n${st.exemplarText}`).join('\n\n');
  return `${basePrompt}\n\n### RADIOLOGY REPORT EXEMPLAR & STYLE REFERENCE:\nFollow the professional tone, structure, and phrasing exemplified below:\n${styleExamples}\n`;
}
