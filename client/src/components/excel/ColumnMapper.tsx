import { useState, useEffect } from 'react'
import { ArrowRight, AlertTriangle, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ParsedExcelData } from './FileUploader'

const JIRA_FIELDS = [
  { value: 'summary', label: 'Summary', required: true },
  { value: 'description', label: 'Description', required: false },
  { value: 'priority', label: 'Priority', required: false },
  { value: 'labels', label: 'Labels', required: false },
  { value: 'assignee', label: 'Assignee', required: false },
  { value: 'sprint', label: 'Sprint', required: false },
  { value: 'story_points', label: 'Story Points', required: false },
  { value: 'issue_type', label: 'Issue Type', required: false },
  { value: 'epic_link', label: 'Epic Link', required: false },
]

export type ColumnMapping = Record<string, string> // excelColumn -> jiraField

interface ColumnMapperProps {
  data: ParsedExcelData
  onMappingComplete: (mapping: ColumnMapping) => void
  onBack: () => void
}

function autoDetect(header: string): string {
  const normalized = header.toLowerCase().trim().replace(/[_\-\s]+/g, '')
  const matchMap: Record<string, string> = {
    summary: 'summary',
    title: 'summary',
    name: 'summary',
    tickettitle: 'summary',
    description: 'description',
    desc: 'description',
    details: 'description',
    priority: 'priority',
    labels: 'labels',
    label: 'labels',
    tags: 'labels',
    assignee: 'assignee',
    assignedto: 'assignee',
    owner: 'assignee',
    sprint: 'sprint',
    storypoints: 'story_points',
    points: 'story_points',
    sp: 'story_points',
    issuetype: 'issue_type',
    type: 'issue_type',
    tickettype: 'issue_type',
    epiclink: 'epic_link',
    epic: 'epic_link',
  }
  return matchMap[normalized] || 'unmapped'
}

export default function ColumnMapper({ data, onMappingComplete, onBack }: ColumnMapperProps) {
  const [mapping, setMapping] = useState<ColumnMapping>({})

  // Auto-detect on mount
  useEffect(() => {
    const initial: ColumnMapping = {}
    const usedFields = new Set<string>()

    data.headers.forEach((header) => {
      const detected = autoDetect(header)
      if (detected !== 'unmapped' && !usedFields.has(detected)) {
        initial[header] = detected
        usedFields.add(detected)
      } else {
        initial[header] = 'unmapped'
      }
    })
    setMapping(initial)
  }, [data.headers])

  const handleChange = (excelCol: string, jiraField: string) => {
    setMapping((prev) => {
      const next = { ...prev }
      // If this jira field is already mapped to another column, clear that one
      if (jiraField !== 'unmapped') {
        Object.keys(next).forEach((key) => {
          if (next[key] === jiraField && key !== excelCol) {
            next[key] = 'unmapped'
          }
        })
      }
      next[excelCol] = jiraField
      return next
    })
  }

  const isSummaryMapped = Object.values(mapping).includes('summary')
  const mappedCount = Object.values(mapping).filter((v) => v !== 'unmapped').length

  const handleContinue = () => {
    // Filter out unmapped columns
    const finalMapping: ColumnMapping = {}
    Object.entries(mapping).forEach(([excel, jira]) => {
      if (jira !== 'unmapped') finalMapping[excel] = jira
    })
    onMappingComplete(finalMapping)
  }

  return (
    <div className="space-y-6">
      {/* Mapping table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-text-primary">Map Columns to Jira Fields</h3>
          <p className="text-xs text-text-secondary mt-1">
            {mappedCount} of {data.headers.length} columns mapped
          </p>
        </div>

        <div className="divide-y divide-border">
          {data.headers.map((header) => {
            const currentValue = mapping[header] || 'unmapped'
            const isRequired = currentValue === 'summary'
            const isMapped = currentValue !== 'unmapped'

            return (
              <div key={header} className="flex items-center gap-4 px-6 py-3">
                {/* Excel column */}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-text-primary truncate block">{header}</span>
                  <span className="text-xs text-text-muted truncate block mt-0.5">
                    e.g. "{data.rows[0]?.[header] || '-'}"
                  </span>
                </div>

                {/* Arrow */}
                <ArrowRight className={cn('h-4 w-4 shrink-0', isMapped ? 'text-accent' : 'text-border')} />

                {/* Jira field dropdown */}
                <div className="flex-1 min-w-0">
                  <div className="relative">
                    <select
                      value={currentValue}
                      onChange={(e) => handleChange(header, e.target.value)}
                      className={cn(
                        'w-full appearance-none rounded-lg border px-3 py-2 text-sm bg-body pr-8 transition-colors',
                        'focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent',
                        isMapped
                          ? 'border-accent/30 text-text-primary'
                          : 'border-border text-text-muted'
                      )}
                    >
                      <option value="unmapped">-- Skip this column --</option>
                      {JIRA_FIELDS.map((field) => {
                        const usedBy = Object.entries(mapping).find(
                          ([key, val]) => val === field.value && key !== header
                        )
                        return (
                          <option key={field.value} value={field.value} disabled={!!usedBy}>
                            {field.label}{field.required ? ' *' : ''}{usedBy ? ` (used by ${usedBy[0]})` : ''}
                          </option>
                        )
                      })}
                    </select>
                    <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
                      {isMapped ? (
                        <Check className="h-3.5 w-3.5 text-status-green" />
                      ) : (
                        <div className="h-3.5 w-3.5" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Required indicator */}
                <div className="w-16 text-right shrink-0">
                  {isRequired && (
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-accent">Required</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Required field warning */}
      {!isSummaryMapped && (
        <div className="flex items-center gap-2 rounded-lg bg-status-yellow/10 border border-status-yellow/20 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-status-yellow shrink-0" />
          <p className="text-sm text-status-yellow">
            The <span className="font-semibold">Summary</span> field is required. Map at least one column to Summary to continue.
          </p>
        </div>
      )}

      {/* Data preview table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text-primary">Data Preview (first 5 rows)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-body/50">
                {data.headers.map((h) => {
                  const jiraField = mapping[h]
                  const fieldMeta = JIRA_FIELDS.find((f) => f.value === jiraField)
                  return (
                    <th key={h} className="px-4 py-2.5 text-left whitespace-nowrap">
                      <span className="font-medium text-text-secondary text-xs">{h}</span>
                      {fieldMeta && (
                        <span className="block text-[10px] text-accent mt-0.5">
                          {fieldMeta.label}
                        </span>
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {data.rows.slice(0, 5).map((row, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0">
                  {data.headers.map((h) => (
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
          disabled={!isSummaryMapped}
          className={cn(
            'rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition-colors',
            isSummaryMapped
              ? 'bg-accent hover:bg-accent-hover'
              : 'bg-accent/40 cursor-not-allowed'
          )}
        >
          Continue to Validation
        </button>
      </div>
    </div>
  )
}
