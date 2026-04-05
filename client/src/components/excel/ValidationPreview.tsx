import { useState, useCallback } from 'react'
import { Check, X, AlertTriangle, Loader2 } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import type { ParsedExcelData } from './FileUploader'
import type { ColumnMapping } from './ColumnMapper'

export interface ValidatedRow {
  index: number
  data: Record<string, string>
  mappedData: Record<string, string>
  isValid: boolean
  errors: string[]
}

interface ValidationPreviewProps {
  data: ParsedExcelData
  mapping: ColumnMapping
  onValidationComplete: (rows: ValidatedRow[]) => void
  onBack: () => void
}

export default function ValidationPreview({ data, mapping, onValidationComplete, onBack }: ValidationPreviewProps) {
  const [rows, setRows] = useState<ValidatedRow[]>(() =>
    data.rows.map((row, i) => ({
      index: i,
      data: row,
      mappedData: buildMappedData(row, mapping),
      isValid: true,
      errors: [],
    }))
  )
  const [validationState, setValidationState] = useState<'idle' | 'validating' | 'done'>('idle')
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; field: string } | null>(null)
  const [editValue, setEditValue] = useState('')

  const validRows = rows.filter((r) => r.isValid)
  const invalidRows = rows.filter((r) => !r.isValid)

  const handleValidate = useCallback(async () => {
    setValidationState('validating')
    try {
      const payload = {
        mapping,
        rows: rows.map((r) => r.mappedData),
      }
      const response = await api.post('/api/v1/excel/validate', payload)
      const results: { isValid: boolean; errors: string[] }[] = response.data.results

      setRows((prev) =>
        prev.map((row, i) => ({
          ...row,
          isValid: results[i]?.isValid ?? true,
          errors: results[i]?.errors ?? [],
        }))
      )
      setValidationState('done')
    } catch {
      // If validation endpoint fails, do client-side validation
      setRows((prev) =>
        prev.map((row) => {
          const errors: string[] = []
          if (!row.mappedData.summary?.trim()) {
            errors.push('Summary is required')
          }
          return { ...row, isValid: errors.length === 0, errors }
        })
      )
      setValidationState('done')
    }
  }, [rows, mapping])

  const handleStartEdit = (rowIndex: number, field: string, value: string) => {
    setEditingCell({ rowIndex, field })
    setEditValue(value)
  }

  const handleSaveEdit = () => {
    if (!editingCell) return
    const { rowIndex, field } = editingCell

    setRows((prev) =>
      prev.map((row) => {
        if (row.index !== rowIndex) return row

        // Find the excel column that maps to this jira field
        const excelCol = Object.entries(mapping).find(([, jira]) => jira === field)?.[0]
        const updatedData = { ...row.data }
        if (excelCol) updatedData[excelCol] = editValue

        const updatedMapped = { ...row.mappedData, [field]: editValue }

        return { ...row, data: updatedData, mappedData: updatedMapped }
      })
    )
    setEditingCell(null)
    setEditValue('')
  }

  const handleCancelEdit = () => {
    setEditingCell(null)
    setEditValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveEdit()
    if (e.key === 'Escape') handleCancelEdit()
  }

  const handleRemoveInvalid = () => {
    setRows((prev) => prev.filter((r) => r.isValid))
  }

  const handleContinue = () => {
    onValidationComplete(rows.filter((r) => r.isValid))
  }

  // Get jira fields that are mapped
  const mappedFields = Object.entries(mapping).map(([excel, jira]) => ({
    excelCol: excel,
    jiraField: jira,
  }))

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-4 rounded-xl border border-border bg-card px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-text-secondary" />
          <span className="text-sm text-text-secondary">
            <span className="font-semibold text-text-primary">{rows.length}</span> total
          </span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-status-green" />
          <span className="text-sm text-text-secondary">
            <span className="font-semibold text-status-green">{validRows.length}</span> valid
          </span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-status-red" />
          <span className="text-sm text-text-secondary">
            <span className="font-semibold text-status-red">{invalidRows.length}</span> invalid
          </span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {invalidRows.length > 0 && validationState === 'done' && (
            <button
              onClick={handleRemoveInvalid}
              className="rounded-lg border border-status-red/30 px-3 py-1.5 text-xs font-medium text-status-red hover:bg-status-red/10 transition-colors"
            >
              Remove {invalidRows.length} invalid
            </button>
          )}
          <button
            onClick={handleValidate}
            disabled={validationState === 'validating'}
            className={cn(
              'rounded-lg px-4 py-1.5 text-xs font-semibold text-white transition-colors',
              validationState === 'validating'
                ? 'bg-accent/50 cursor-not-allowed'
                : 'bg-accent hover:bg-accent-hover'
            )}
          >
            {validationState === 'validating' ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                Validating...
              </span>
            ) : validationState === 'done' ? (
              'Re-validate'
            ) : (
              'Validate'
            )}
          </button>
        </div>
      </div>

      {/* Validation table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border bg-sidebar">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-text-secondary w-12">#</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-text-secondary w-16">Status</th>
                {mappedFields.map(({ jiraField }) => (
                  <th key={jiraField} className="px-4 py-2.5 text-left text-xs font-medium text-text-secondary whitespace-nowrap">
                    {jiraField.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </th>
                ))}
                {validationState === 'done' && (
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-text-secondary">Errors</th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.index}
                  className={cn(
                    'border-b border-border/50 last:border-0 transition-colors',
                    !row.isValid && validationState === 'done' && 'bg-status-red/5'
                  )}
                >
                  <td className="px-4 py-2.5 text-text-muted text-xs">{row.index + 1}</td>
                  <td className="px-4 py-2.5 text-center">
                    {validationState === 'done' ? (
                      row.isValid ? (
                        <Check className="h-4 w-4 text-status-green mx-auto" />
                      ) : (
                        <X className="h-4 w-4 text-status-red mx-auto" />
                      )
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-border mx-auto" />
                    )}
                  </td>
                  {mappedFields.map(({ jiraField }) => {
                    const isEditing = editingCell?.rowIndex === row.index && editingCell?.field === jiraField
                    const cellValue = row.mappedData[jiraField] || ''

                    return (
                      <td key={jiraField} className="px-4 py-2.5 whitespace-nowrap max-w-[200px]">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={handleSaveEdit}
                            autoFocus
                            className="w-full rounded border border-accent bg-body px-2 py-1 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                          />
                        ) : (
                          <span
                            onClick={() => handleStartEdit(row.index, jiraField, cellValue)}
                            className="cursor-pointer truncate block text-text-primary hover:text-accent transition-colors"
                            title="Click to edit"
                          >
                            {cellValue || <span className="text-text-muted">-</span>}
                          </span>
                        )}
                      </td>
                    )
                  })}
                  {validationState === 'done' && (
                    <td className="px-4 py-2.5">
                      {row.errors.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-status-red shrink-0" />
                          <span className="text-xs text-status-red truncate max-w-[200px]">
                            {row.errors.join('; ')}
                          </span>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text-secondary hover:bg-card hover:text-text-primary transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={validationState !== 'done' || validRows.length === 0}
          className={cn(
            'rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition-colors',
            validationState === 'done' && validRows.length > 0
              ? 'bg-accent hover:bg-accent-hover'
              : 'bg-accent/40 cursor-not-allowed'
          )}
        >
          Continue to Create Tickets ({validRows.length})
        </button>
      </div>
    </div>
  )
}

function buildMappedData(row: Record<string, string>, mapping: ColumnMapping): Record<string, string> {
  const mapped: Record<string, string> = {}
  Object.entries(mapping).forEach(([excelCol, jiraField]) => {
    mapped[jiraField] = row[excelCol] || ''
  })
  return mapped
}
