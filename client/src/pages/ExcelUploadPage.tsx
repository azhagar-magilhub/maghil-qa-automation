import { useState, useCallback } from 'react'
import {
  Upload,
  FileSpreadsheet,
  Check,
  ArrowRight,
  ArrowLeft,
  Info,
  Columns2,
  List,
  CheckSquare,
  AlertTriangle,
  Play,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePageTitle } from '@/hooks/usePageTitle'
import HowItWorks from '@/components/shared/HowItWorks'

const howItWorksSteps = [
  {
    title: 'Upload File',
    description: 'Drag and drop an Excel or CSV file, or click to browse. The system automatically parses your spreadsheet and extracts column headers.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Upload className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Drag file</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Uploaded</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Map Columns',
    description: 'Map your spreadsheet columns to Jira fields like Summary, Description, Priority, and Issue Type. Unmapped columns are ignored.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Columns2 className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Excel columns</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <List className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Jira fields</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Validate Data',
    description: 'Review each row for validation errors such as missing required fields or invalid values. Fix issues inline before proceeding.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <CheckSquare className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Valid rows</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-yellow/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-status-yellow" />
          </div>
          <span className="text-xs text-text-secondary">Fix errors</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Create Tickets',
    description: 'Bulk-create Jira tickets from your validated rows. Track progress in real time and view created ticket keys when done.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Play className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Start</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Processing</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Done</span>
        </div>
      </div>
    ),
  },
]
import FileUploader, { type ParsedExcelData } from '@/components/excel/FileUploader'
import ColumnMapper, { type ColumnMapping } from '@/components/excel/ColumnMapper'
import ValidationPreview, { type ValidatedRow } from '@/components/excel/ValidationPreview'
import BulkCreateProgress from '@/components/excel/BulkCreateProgress'

const STEPS = [
  { id: 1, label: 'Upload', icon: Upload },
  { id: 2, label: 'Map Columns', icon: ArrowRight },
  { id: 3, label: 'Validate', icon: FileSpreadsheet },
  { id: 4, label: 'Create', icon: Check },
]

export default function ExcelUploadPage() {
  usePageTitle('Excel Upload')
  const [showHelp, setShowHelp] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [parsedData, setParsedData] = useState<ParsedExcelData | null>(null)
  const [columnMapping, setColumnMapping] = useState<ColumnMapping | null>(null)
  const [validatedRows, setValidatedRows] = useState<ValidatedRow[] | null>(null)

  const handleUploadComplete = useCallback((data: ParsedExcelData) => {
    setParsedData(data)
    setCurrentStep(2)
  }, [])

  const handleMappingComplete = useCallback((mapping: ColumnMapping) => {
    setColumnMapping(mapping)
    setCurrentStep(3)
  }, [])

  const handleValidationComplete = useCallback((rows: ValidatedRow[]) => {
    setValidatedRows(rows)
    setCurrentStep(4)
  }, [])

  const handleReset = useCallback(() => {
    setCurrentStep(1)
    setParsedData(null)
    setColumnMapping(null)
    setValidatedRows(null)
  }, [])

  const handleBackToStep = useCallback((step: number) => {
    setCurrentStep(step)
  }, [])

  return (
    <>
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Excel to Jira</h1>
          <p className="text-text-secondary mt-1">
            Upload Excel files and map columns to Jira fields for bulk ticket creation
          </p>
        </div>
        <button onClick={() => setShowHelp(true)} className="flex items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition">
          <Info className="h-4 w-4" /> How it works
        </button>
      </div>

      {/* Step indicator */}
      <div className="rounded-xl border border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            const isActive = currentStep === step.id
            const isCompleted = currentStep > step.id
            const isLast = i === STEPS.length - 1

            return (
              <div key={step.id} className="flex items-center flex-1 last:flex-none">
                {/* Step circle + label */}
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                      isActive && 'bg-accent text-white',
                      isCompleted && 'bg-status-green text-white',
                      !isActive && !isCompleted && 'bg-body text-text-muted border border-border'
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <div className="hidden sm:block">
                    <p
                      className={cn(
                        'text-sm font-medium',
                        isActive && 'text-text-primary',
                        isCompleted && 'text-status-green',
                        !isActive && !isCompleted && 'text-text-muted'
                      )}
                    >
                      {step.label}
                    </p>
                    <p className="text-[10px] text-text-muted">Step {step.id}</p>
                  </div>
                </div>

                {/* Connector line */}
                {!isLast && (
                  <div className="flex-1 mx-4">
                    <div
                      className={cn(
                        'h-px w-full transition-colors',
                        currentStep > step.id ? 'bg-status-green' : 'bg-border'
                      )}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step content */}
      <div>
        {currentStep === 1 && (
          <FileUploader onUploadComplete={handleUploadComplete} />
        )}

        {currentStep === 2 && parsedData && (
          <ColumnMapper
            data={parsedData}
            onMappingComplete={handleMappingComplete}
            onBack={() => handleBackToStep(1)}
          />
        )}

        {currentStep === 3 && parsedData && columnMapping && (
          <ValidationPreview
            data={parsedData}
            mapping={columnMapping}
            onValidationComplete={handleValidationComplete}
            onBack={() => handleBackToStep(2)}
          />
        )}

        {currentStep === 4 && parsedData && columnMapping && validatedRows && (
          <BulkCreateProgress
            rows={validatedRows}
            mapping={columnMapping}
            fileUrl={parsedData.fileUrl}
            onBack={() => handleBackToStep(3)}
            onReset={handleReset}
          />
        )}
      </div>
    </div>

    <HowItWorks steps={howItWorksSteps} isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}
