export type UserRole = 'ADMIN' | 'MANAGER' | 'USER'

export interface UserProfile {
  uid: string
  email: string
  fullName: string
  role: UserRole
  isActive: boolean
  setupComplete: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Integration {
  type: 'JIRA' | 'CONFLUENCE' | 'TEAMS'
  isActive: boolean
  lastTestedAt: Date | null
  lastTestStatus: boolean | null
  updatedAt: Date
}

export interface TicketBatch {
  id: string
  userId: string
  source: 'EXCEL' | 'TEAMS'
  totalCount: number
  successCount: number
  failedCount: number
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'PARTIAL_FAILURE' | 'FAILED'
  createdAt: Date
}

export interface Ticket {
  id: string
  batchId: string
  jiraKey: string | null
  jiraId: string | null
  summary: string
  description: string | null
  issueType: string
  priority: string | null
  assignee: string | null
  labels: string[]
  status: 'PENDING' | 'CREATING' | 'CREATED' | 'FAILED'
  errorMsg: string | null
  createdAt: Date
}

export interface AuditLog {
  id: string
  userId: string
  action: string
  details: Record<string, unknown> | null
  status: 'SUCCESS' | 'FAILURE'
  createdAt: Date
}

export interface MappingTemplate {
  id: string
  name: string
  mappings: Record<string, string>
  createdAt: Date
  updatedAt: Date
}

// Navigation items
export interface NavItem {
  label: string
  path: string
  icon: string
  section?: string
}
