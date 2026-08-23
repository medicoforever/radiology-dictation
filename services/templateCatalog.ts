import rawTemplatesData from './templatesData.json';

export interface RadiologyDocxTemplate {
  id: string;
  name: string;
  category: string;
  modality: string;
  code?: string;
  lines: string[];
  docxBase64: string;
  skillPrompt?: string;
  source?: string;
  sourceType?: 'mri_proto' | 'ris' | 'procedure' | 'custom' | 'doppler';
  fileName?: string;
  relPath?: string;
}

export let RADIOLOGY_TEMPLATES_CATALOG: RadiologyDocxTemplate[] = (rawTemplatesData as RadiologyDocxTemplate[]) || [];

export const TEMPLATE_MODALITIES = [
  'ALL',
  'CT',
  'MRI',
] as const;

export type TemplateModalityFilter = typeof TEMPLATE_MODALITIES[number];

/**
 * Hydrate catalog from public static asset or GitHub raw if local json was truncated by an AI editor
 */
export async function initializeTemplateCatalog(): Promise<RadiologyDocxTemplate[]> {
  if (Array.isArray(RADIOLOGY_TEMPLATES_CATALOG) && RADIOLOGY_TEMPLATES_CATALOG.length >= 50) {
    return RADIOLOGY_TEMPLATES_CATALOG;
  }
  
  // 1. Try public static asset
  try {
    const res = await fetch('/templatesData.json');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length >= 50) {
        RADIOLOGY_TEMPLATES_CATALOG = data;
        return data;
      }
    }
  } catch (e) {
    console.warn('Local public template fetch failed, checking remote backup...', e);
  }

  // 2. Try GitHub raw remote backup
  try {
    const ghRes = await fetch('https://raw.githubusercontent.com/medicoforever/radiology-dictation/main/public/templatesData.json');
    if (ghRes.ok) {
      const ghData = await ghRes.json();
      if (Array.isArray(ghData) && ghData.length >= 50) {
        RADIOLOGY_TEMPLATES_CATALOG = ghData;
        return ghData;
      }
    }
  } catch (err) {
    console.warn('Remote template backup fetch failed:', err);
  }

  return RADIOLOGY_TEMPLATES_CATALOG;
}

if (typeof window !== 'undefined') {
  initializeTemplateCatalog().catch(() => {});
}

/**
 * Filter templates by modality or search query
 */
export function filterTemplates(
  query: string,
  modalityFilter: string = 'ALL'
): RadiologyDocxTemplate[] {
  let list = RADIOLOGY_TEMPLATES_CATALOG;

  if (modalityFilter && modalityFilter !== 'ALL') {
    list = list.filter(t => t.category.toLowerCase() === modalityFilter.toLowerCase() || t.modality.toLowerCase() === modalityFilter.toLowerCase());
  }

  if (!query || !query.trim()) {
    return list;
  }

  const q = query.toLowerCase().trim();
  return list.filter(t => 
    t.name.toLowerCase().includes(q) ||
    (t.code && t.code.toLowerCase().includes(q)) ||
    t.category.toLowerCase().includes(q) ||
    t.modality.toLowerCase().includes(q) ||
    t.lines.some(l => l.toLowerCase().includes(q))
  );
}

export function getTemplateById(id: string): RadiologyDocxTemplate | undefined {
  return RADIOLOGY_TEMPLATES_CATALOG.find(t => t.id === id);
}

export default {
  RADIOLOGY_TEMPLATES_CATALOG,
  initializeTemplateCatalog,
  filterTemplates,
  getTemplateById,
};
