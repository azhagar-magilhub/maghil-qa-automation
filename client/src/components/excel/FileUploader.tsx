import { useState, useRef, useCallback } from 'react'
import { Upload, FileSpreadsheet, X, Loader2, AlertTriangle } from 'lucide-react'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '@/lib/firebase'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

export interface ParsedExcelData {
  headers: string[]
  rows: Record<string, string>[]
  totalRows: number
  fileUrl: string
  fileName: string
  fileSize: number
}

interface FileUploaderProps {
  onUploadComplete: (data: ParsedExcelData) => void
}

const ACCEPTED_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
]
const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls', '.csv']
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function FileUploader({ onUploadComplete }: FileUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'parsing' | 'done' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [parsedPreview, setParsedPreview] = useState<ParsedExcelData | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      return `Invalid file type. Accepted formats: ${ACCEPTED_EXTENSIONS.join(', ')}`
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `File too large. Maximum size is ${formatFileSize(MAX_SIZE_BYTES)}.`
    }
    return null
  }

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setSelectedFile(file)
    setUploadState('uploading')

    try {
      // Upload to Firebase Storage
      const timestamp = Date.now()
      const storageRef = ref(storage, `excel-uploads/${timestamp}_${file.name}`)
      await uploadBytes(storageRef, file)
      const fileUrl = await getDownloadURL(storageRef)

      setUploadState('parsing')

      // Parse the file via API
      const response = await api.post('/api/v1/excel/parse', { fileUrl })
      const parsed: ParsedExcelData = {
        headers: response.data.headers,
        rows: response.data.rows,
        totalRows: response.data.totalRows,
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
      }

      setParsedPreview(parsed)
      setUploadState('done')
    } catch (err: unknown) {
      setUploadState('error')
      const message = err instanceof Error ? err.message : 'Upload failed. Please try again.'
      setError(message)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const resetUpload = () => {
    setSelectedFile(null)
    setUploadState('idle')
    setError(null)
    setParsedPreview(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleContinue = () => {
    if (parsedPreview) onUploadComplete(parsedPreview)
  }

  // Show file info and preview after upload
  if (uploadState === 'done' && parsedPreview) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-status-green/10 p-2.5">
                <FileSpreadsheet className="h-6 w-6 text-status-green" />
              </div>
              <div>
                <p className="font-medium text-text-primary">{parsedPreview.fileName}</p>
                <p className="text-sm text-text-secondary">
                  {formatFileSize(parsedPreview.fileSize)} &middot; {parsedPreview.totalRows} rows &middot; {parsedPreview.headers.length} columns
                </p>
              </div>
            </div>
            <button onClick={resetUpload} className="rounded-lg p-1.5 text-text-secondary hover:bg-body hover:text-text-primary transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Column headers preview */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Detected Columns</h3>
          <div className="flex flex-wrap gap-2">
            {parsedPreview.headers.map((header) => (
              <span key={header} className="rounded-full bg-body px-3 py-1 text-xs font-medium text-text-secondary border border-border">
                {header}
              </span>
            ))}
          </div>
        </div>

        {/* First 3 rows preview */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-6 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-text-primary">Data Preview (first 3 rows)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-body/50">
                  {parsedPreview.headers.map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left font-medium text-text-secondary whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsedPreview.rows.slice(0, 3).map((row, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    {parsedPreview.headers.map((h) => (
                      <td key={h} className="px-4 py-2.5 text-text-primary whitespace-nowrap max-w-[200px] truncate">
                        {row[h] || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <button
          onClick={handleContinue}
          className="w-full rounded-lg bg-accent py-3 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
        >
          Continue to Column Mapping
        </button>
      </div>
    )
  }

  // Uploading / parsing state
  if (uploadState === 'uploading' || uploadState === 'parsing') {
    return (
      <div className="rounded-xl border border-border bg-card p-12">
        <div className="flex flex-col items-center text-center">
          <Loader2 className="h-10 w-10 text-accent animate-spin mb-4" />
          <p className="text-text-primary font-medium">
            {uploadState === 'uploading' ? 'Uploading file...' : 'Parsing spreadsheet...'}
          </p>
          {selectedFile && (
            <p className="text-sm text-text-secondary mt-1">{selectedFile.name}</p>
          )}
        </div>
      </div>
    )
  }

  // Default: drag-and-drop zone
  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'relative cursor-pointer rounded-xl border-2 border-dashed p-16 text-center transition-all',
          isDragOver
            ? 'border-accent bg-accent/5'
            : 'border-border bg-card hover:border-text-secondary hover:bg-card-hover'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleInputChange}
          className="hidden"
        />
        <div className="flex flex-col items-center">
          <div className={cn(
            'rounded-2xl p-4 mb-4 transition-colors',
            isDragOver ? 'bg-accent/10' : 'bg-body'
          )}>
            <Upload className={cn('h-10 w-10', isDragOver ? 'text-accent' : 'text-text-secondary')} />
          </div>
          <p className="text-lg font-semibold text-text-primary">
            {isDragOver ? 'Drop your file here' : 'Drag and drop your spreadsheet'}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            or <span className="text-accent font-medium">browse files</span>
          </p>
          <p className="mt-3 text-xs text-text-muted">
            Supports .xlsx, .xls, .csv &middot; Max 10MB
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-status-red/10 border border-status-red/20 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-status-red shrink-0" />
          <p className="text-sm text-status-red">{error}</p>
          <button onClick={resetUpload} className="ml-auto text-status-red hover:text-red-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
