import rawTemplatesData from './templatesData.json';

export interface RadiologyDocxTemplate {
  id: string;
  source: string;
  sourceType: 'gopinath' | 'centricity' | 'procedure' | 'custom';
  category: string;
  modality: string;
  code: string;
  name: string;
  fileName: string;
  relPath: string;
  lines: string[];
  docxBase64: string;
}

export const RADIOLOGY_TEMPLATES_CATALOG: RadiologyDocxTemplate[] = rawTemplatesData as RadiologyDocxTemplate[];

export const TEMPLATE_MODALITIES = [
  'ALL',
  'MRI',
  'CT',
  'USG',
  'X-Ray',
  'Gopinath Formats',
  'Centricity Normals',
  'Fluoroscopy',
  'Mammography',
  'Procedures',
] as const;

export type TemplateModalityFilter = typeof TEMPLATE_MODALITIES[number];

/**
 * Filter templates by modality, source, or search query
 */
export function filterTemplates(
  query: string,
  modalityFilter: string = 'ALL',
  sourceFilter: string = 'ALL'
): RadiologyDocxTemplate[] {
  let list = RADIOLOGY_TEMPLATES_CATALOG;

  if (modalityFilter && modalityFilter !== 'ALL') {
    if (modalityFilter === 'Gopinath Formats') {
      list = list.filter(t => t.sourceType === 'gopinath');
    } else if (modalityFilter === 'Centricity Normals') {
      list = list.filter(t => t.sourceType === 'centricity');
    } else if (modalityFilter === 'Procedures') {
      list = list.filter(t => t.sourceType === 'procedure');
    } else {
      list = list.filter(t => t.modality.toLowerCase() === modalityFilter.toLowerCase());
    }
  }

  if (sourceFilter && sourceFilter !== 'ALL') {
    list = list.filter(t => t.sourceType === sourceFilter);
  }

  if (!query || !query.trim()) {
    return list;
  }

  const q = query.toLowerCase().trim();
  return list.filter(t => 
    t.name.toLowerCase().includes(q) ||
    t.code.toLowerCase().includes(q) ||
    t.category.toLowerCase().includes(q) ||
    t.modality.toLowerCase().includes(q) ||
    t.fileName.toLowerCase().includes(q) ||
    t.lines.some(l => l.toLowerCase().includes(q))
  );
}

/**
 * Find template by ID
 */
export function getTemplateById(id: string): RadiologyDocxTemplate | undefined {
  return RADIOLOGY_TEMPLATES_CATALOG.find(t => t.id === id);
}

/**
 * Generate formatted prompt text for Gemini from a template
 */
export function formatTemplateForPrompt(template: RadiologyDocxTemplate): string {
  const cleanTitle = template.name.trim();
  const findingsList = template.lines.filter(l => l && l.trim() !== '');

  const templateJson = {
    title: cleanTitle,
    category: template.category,
    modality: template.modality,
    code: template.code || undefined,
    normal_findings: findingsList,
    instruction: `Merge user dictated findings into this ${template.name} template. Preserve normal lines not mentioned, replace corresponding normal lines with abnormal dictated findings prefixed with 'BOLD::', and generate a synthesized IMPRESSION at the end.`
  };

  return JSON.stringify(templateJson, null, 2);
}

export default RADIOLOGY_TEMPLATES_CATALOG;
