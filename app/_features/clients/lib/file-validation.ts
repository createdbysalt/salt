/**
 * File validation utilities for client file uploads
 * Only allows AI-readable file types for intelligence processing
 */

// AI-readable file types - these can be parsed and analyzed
export const ALLOWED_FILE_TYPES = {
  // Documents (AI can parse text)
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],

  // Spreadsheets (AI can parse structured data)
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'text/csv': ['.csv'],

  // Images (Vision AI can analyze)
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
} as const;

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_FILE_SIZE_DISPLAY = '50MB';

// Get all allowed extensions for the file input accept attribute
export const ALLOWED_EXTENSIONS = Object.values(ALLOWED_FILE_TYPES).flat();

// Get all allowed MIME types
export const ALLOWED_MIME_TYPES = Object.keys(ALLOWED_FILE_TYPES) as Array<keyof typeof ALLOWED_FILE_TYPES>;

// Human-readable file type categories
export const FILE_TYPE_CATEGORIES = [
  {
    name: 'Documents',
    description: 'PDFs, Word docs, text files, Markdown',
    extensions: ['.pdf', '.docx', '.doc', '.txt', '.md'],
    icon: 'FileText',
  },
  {
    name: 'Spreadsheets',
    description: 'Excel files, CSV data',
    extensions: ['.xlsx', '.xls', '.csv'],
    icon: 'FileSpreadsheet',
  },
  {
    name: 'Images',
    description: 'PNG, JPEG, WebP images',
    extensions: ['.png', '.jpg', '.jpeg', '.webp'],
    icon: 'FileImage',
  },
] as const;

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  errorType?: 'size' | 'type' | 'extension';
}

/**
 * Validate a file for upload
 */
export function validateFile(file: File): FileValidationResult {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File is too large. Maximum size is ${MAX_FILE_SIZE_DISPLAY}.`,
      errorType: 'size',
    };
  }

  // Check MIME type
  const isAllowedMimeType = ALLOWED_MIME_TYPES.includes(file.type as keyof typeof ALLOWED_FILE_TYPES);

  // Also check by extension as fallback (some browsers report wrong MIME types)
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  const isAllowedExtension = (ALLOWED_EXTENSIONS as readonly string[]).includes(extension);

  if (!isAllowedMimeType && !isAllowedExtension) {
    return {
      valid: false,
      error: `This file type is not supported. Please upload documents, spreadsheets, or images.`,
      errorType: 'type',
    };
  }

  return { valid: true };
}

/**
 * Get a human-readable file type name
 */
export function getFileTypeName(mimeType: string | null, fileName: string): string {
  if (!mimeType) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'md') return 'Markdown';
    if (ext === 'pdf') return 'PDF';
    if (ext === 'docx' || ext === 'doc') return 'Word Document';
    if (ext === 'xlsx' || ext === 'xls') return 'Spreadsheet';
    if (ext === 'csv') return 'CSV';
    if (ext === 'txt') return 'Text File';
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) return 'Image';
    return 'File';
  }

  if (mimeType === 'text/markdown') return 'Markdown';
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'Word Document';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'Spreadsheet';
  if (mimeType === 'text/csv') return 'CSV';
  if (mimeType === 'text/plain') return 'Text File';
  if (mimeType.startsWith('image/')) return 'Image';

  return 'File';
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Validate an attachment from email (server-side, by filename and mime type)
 * Used when processing incoming email attachments
 */
export function validateEmailAttachment(
  fileName: string,
  mimeType: string | null,
  sizeBytes: number
): FileValidationResult {
  // Check file size
  if (sizeBytes > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File is too large. Maximum size is ${MAX_FILE_SIZE_DISPLAY}.`,
      errorType: 'size',
    };
  }

  // Check MIME type
  const isAllowedMimeType = mimeType && ALLOWED_MIME_TYPES.includes(mimeType as keyof typeof ALLOWED_FILE_TYPES);

  // Also check by extension as fallback
  const extension = '.' + fileName.split('.').pop()?.toLowerCase();
  const isAllowedExtension = (ALLOWED_EXTENSIONS as readonly string[]).includes(extension);

  if (!isAllowedMimeType && !isAllowedExtension) {
    return {
      valid: false,
      error: `File type not supported: ${mimeType || extension}`,
      errorType: 'type',
    };
  }

  return { valid: true };
}
