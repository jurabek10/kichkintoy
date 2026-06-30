import type { DocumentTemplateType } from '@/data/documents';

/** Map a template type to its `templateType.*` i18n key (camelCase). */
export function templateTypeKey(type: DocumentTemplateType): string {
  switch (type) {
    case 'medical_allergy':
      return 'templateType.medicalAllergy';
    case 'emergency_contact':
      return 'templateType.emergencyContact';
    case 'file_upload':
      return 'templateType.fileUpload';
    case 'admission':
      return 'templateType.admission';
    case 'consent':
      return 'templateType.consent';
    default:
      return 'templateType.custom';
  }
}
