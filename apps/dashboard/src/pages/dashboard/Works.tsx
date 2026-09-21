import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from 'react'

import type { ChangeEvent, DragEvent } from 'react'

import {
  HardHat,
  ChevronUp,
  ChevronDown,
  Upload,
  FileText,
  X,
} from 'lucide-react'

import { ALERTS } from '@/data/mockAlerts'

import type { AlertRow } from '@/data/mockAlerts'

import { useRoleStore } from '@/stores/useRoleStore'

import { filterByRole } from '@/lib/roleFilter'
import { parseCsv } from '@/lib/parseCsv'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://127.0.0.1:5000'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SortKey =
  | 'work_id'
  | 'work_category'
  | 'state'
  | 'mp_name'
  | 'status'
  | 'cost_estimate'
  | 'payment_released_pct'
  | 'risk_score'

type SortDir = 'asc' | 'desc' | 'none'

type SeverityFilter = 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'

type UploadResultRow = {
  work_id?: string | number
  is_anomaly: boolean | null
  risk_score: number | null
  risk_level: string
  error?: string
  missing_fields?: string[]
  details?: string
  engineered_features?: Record<string, number>
}

type MergedRow = {
  work_id: string
  risk_score: number | null
  risk_level: string
  is_anomaly: boolean | null
  error?: string
  // Raw CSV fields — present only when the join succeeded
  state?: string
  work_category?: string
  mp_name?: string
  status?: string
  cost_estimate?: string
  payment_released_pct?: string
}

type UploadResponse = {
  status?: string
  filename?: string
  total_records?: number
  anomalies?: number
  normal_records?: number
  invalid_records?: number
  error_records?: number
  results?: UploadResultRow[]
  error?: string
  details?: string
  missing?: string[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCost(raw: string): string {
  const n = Number(raw)

  if (isNaN(n)) return raw

  if (n >= 1e7) {
    return `₹${(n / 1e7).toFixed(1)} Cr`
  }

  if (n >= 1e5) {
    return `₹${(n / 1e5).toFixed(1)} L`
  }

  return `₹${n.toLocaleString('en-IN')}`
}

const STATUS_STYLES: Record<string, string> = {
  Completed: 'bg-[#1A1A18] text-[#F5F2E8]',
  'In Progress': 'bg-[#1E3878] text-[#F5F2E8]',
  Sanctioned: 'bg-[#E8C018] text-[#1A1A18]',
}

const RISK_BADGE: Record<string, string> = {
  High: 'bg-[#C8302A] text-[#F5F2E8]',
  Medium: 'bg-[#E8C018] text-[#1A1A18]',
  Low: 'bg-[#F5F2E8] text-[#1A1A18] border border-[#8A8680]',
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SortIcon({
  active,
  dir,
}: {
  active: boolean
  dir: SortDir
}) {
  if (!active || dir === 'none') {
    return (
      <span className="inline-block w-3 h-3 opacity-20">
        <ChevronUp className="w-3 h-3" />
      </span>
    )
  }

  return dir === 'asc' ? (
    <ChevronUp className="w-3 h-3 text-[#1E3878]" />
  ) : (
    <ChevronDown className="w-3 h-3 text-[#1E3878]" />
  )
}

// ---------------------------------------------------------------------------
// Unique option lists
// ---------------------------------------------------------------------------

const ALL_CATEGORIES = Array.from(
  new Set(ALERTS.map((r) => r.work_category))
).sort()

const ALL_STATES = Array.from(
  new Set(ALERTS.map((r) => r.state))
).sort()

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

const COLS: { key: SortKey; label: string }[] = [
  { key: 'work_id', label: 'Work ID' },
  { key: 'work_category', label: 'Category' },
  { key: 'state', label: 'State' },
  { key: 'mp_name', label: 'MP' },
  { key: 'status', label: 'Status' },
  { key: 'cost_estimate', label: 'Cost' },
  { key: 'payment_released_pct', label: 'Paid %' },
  { key: 'risk_score', label: 'Risk' },
]

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function Works() {
  const { activeRole } = useRoleStore()

  // -------------------------------------------------------------------------
  // CSV Upload State
  // -------------------------------------------------------------------------

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null)

  const [isDragging, setIsDragging] =
    useState(false)

  const [isUploading, setIsUploading] =
    useState(false)

  const [uploadMessage, setUploadMessage] =
    useState('')

  const [uploadError, setUploadError] =
    useState('')

  const [uploadResult, setUploadResult] =
    useState<UploadResponse | null>(null)

  const [mergedRows, setMergedRows] = useState<MergedRow[]>([])
  const [uploadPage, setUploadPage] = useState(1)
  const [uploadPageSize, setUploadPageSize] = useState(25)

  // -------------------------------------------------------------------------
  // Handle selected CSV file
  // -------------------------------------------------------------------------

  const handleFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setSelectedFile(null)
      setUploadMessage('')
      setUploadError('Please select a CSV file.')
      return
    }

    setUploadError('')
    setUploadMessage('')
    setUploadResult(null)
    setSelectedFile(file)
  }

  // -------------------------------------------------------------------------
  // File input change
  // -------------------------------------------------------------------------

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]

    if (file) {
      handleFile(file)
    }
  }

  // -------------------------------------------------------------------------
  // Drag & Drop
  // -------------------------------------------------------------------------

  const handleDrop = (
    event: DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault()

    setIsDragging(false)

    const file = event.dataTransfer.files?.[0]

    if (file) {
      handleFile(file)
    }
  }

  const handleDragOver = (
    event: DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (
    event: DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault()
    setIsDragging(false)
  }

  // -------------------------------------------------------------------------
  // Remove selected file
  // -------------------------------------------------------------------------

  const removeSelectedFile = () => {
    setSelectedFile(null)
    setUploadMessage('')
    setUploadError('')
    setUploadResult(null)
    setMergedRows([])
    setUploadPage(1)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // -------------------------------------------------------------------------
  // Upload CSV to Flask backend
  // -------------------------------------------------------------------------

  const uploadCSV = async () => {
    if (!selectedFile) {
      setUploadError('Please select a CSV file first.')
      return
    }

    setIsUploading(true)
    setUploadMessage('')
    setUploadError('')
    setUploadResult(null)

    try {
      const formData = new FormData()

      formData.append('file', selectedFile)

      const response = await fetch(
        `${BACKEND_URL}/api/upload-csv`,
        {
          method: 'POST',
          body: formData,
        }
      )

      const data: UploadResponse =
        await response.json()

      if (!response.ok) {
        setUploadError(
          data.error ||
            'CSV upload failed. Please check the file.'
        )

        setUploadResult(data)

        return
      }

      setUploadResult(data)

      setUploadMessage(
        'CSV uploaded and analyzed successfully.'
      )

      try {
        const text = await selectedFile.text()
        const rawRows = parseCsv(text)
        const rawById = new Map(
          rawRows.map((r) => [String(r.work_id ?? ''), r]),
        )

        const merged: MergedRow[] = (data.results ?? []).map((res) => {
          const id = String(res.work_id ?? '')
          const raw = rawById.get(id)
          return {
            work_id: id,
            risk_score: res.risk_score ?? null,
            risk_level: res.risk_level ?? 'Unknown',
            is_anomaly: res.is_anomaly ?? null,
            error: res.error,
            ...(raw
              ? {
                  state: raw.state,
                  work_category: raw.work_category,
                  mp_name: raw.mp_name,
                  status: raw.status,
                  cost_estimate: raw.cost_estimate,
                  payment_released_pct: raw.payment_released_pct,
                }
              : {}),
          }
        })

        setMergedRows(merged)
        setUploadPage(1)
      } catch {
        setMergedRows([])
        setUploadPage(1)
      }
    } catch (error) {
      console.error('CSV upload error:', error)

      setUploadError(
        'Could not connect to the Flask backend. Make sure the backend is running on port 5000.'
      )
    } finally {
      setIsUploading(false)
    }
  }

  // -------------------------------------------------------------------------
  // Role-scoped base dataset
  // -------------------------------------------------------------------------

  const scopedWorks = useMemo(
    () => filterByRole(ALERTS, activeRole),
    [activeRole]
  )

  // -------------------------------------------------------------------------
  // Filter state
  // -------------------------------------------------------------------------

  const [severity, setSeverity] =
    useState<SeverityFilter>('ALL')

  const [category, setCategory] =
    useState('All Categories')

  const [stateFilter, setStateFilter] =
    useState('All States')

  const [search, setSearch] =
    useState('')

  // -------------------------------------------------------------------------
  // Sort state
  // -------------------------------------------------------------------------

  const [sortKey, setSortKey] =
    useState<SortKey>('risk_score')

  const [sortDir, setSortDir] =
    useState<SortDir>('desc')

  // -------------------------------------------------------------------------
  // Pagination state
  // -------------------------------------------------------------------------

  const [page, setPage] =
    useState(1)

  const [pageSize, setPageSize] =
    useState(50)

  const uploadTotalPages = Math.max(1, Math.ceil(mergedRows.length / uploadPageSize))
  const uploadStartIdx = (uploadPage - 1) * uploadPageSize
  const uploadPagedRows = mergedRows.slice(uploadStartIdx, uploadStartIdx + uploadPageSize)

  // -------------------------------------------------------------------------
  // Reset page on filter/size/role change
  // -------------------------------------------------------------------------

  useEffect(() => {
    setPage(1)
  }, [
    severity,
    category,
    stateFilter,
    search,
    pageSize,
    activeRole,
  ])

  // -------------------------------------------------------------------------
  // Toggle sort
  // -------------------------------------------------------------------------

  const toggleSort = useCallback(
    (key: SortKey) => {
      setSortKey((prev) => {
        if (prev !== key) {
          setSortDir('desc')
          return key
        }

        setSortDir((d) => {
          if (d === 'desc') return 'asc'
          if (d === 'asc') return 'none'

          return 'desc'
        })

        return key
      })
    },
    []
  )

  // -------------------------------------------------------------------------
  // Filtered + sorted rows
  // -------------------------------------------------------------------------

  const filteredRows = useMemo<AlertRow[]>(() => {
    const q = search.trim().toLowerCase()

    let rows = scopedWorks.filter((row) => {
      if (
        severity !== 'ALL' &&
        row.risk_level.toUpperCase() !== severity
      ) {
        return false
      }

      if (
        category !== 'All Categories' &&
        row.work_category !== category
      ) {
        return false
      }

      if (
        stateFilter !== 'All States' &&
        row.state !== stateFilter
      ) {
        return false
      }

      if (q) {
        const hit =
          row.work_id.toLowerCase().includes(q) ||
          row.mp_name.toLowerCase().includes(q) ||
          row.implementing_agency
            .toLowerCase()
            .includes(q)

        if (!hit) return false
      }

      return true
    })

    if (sortDir !== 'none') {
      rows = [...rows].sort((a, b) => {
        let cmp = 0

        if (
          sortKey === 'risk_score' ||
          sortKey === 'cost_estimate' ||
          sortKey === 'payment_released_pct'
        ) {
          cmp =
            Number(a[sortKey]) -
            Number(b[sortKey])
        } else {
          cmp =
            a[sortKey].localeCompare(
              b[sortKey]
            )
        }

        return sortDir === 'asc'
          ? cmp
          : -cmp
      })
    }

    return rows
  }, [
    severity,
    category,
    stateFilter,
    search,
    sortKey,
    sortDir,
    scopedWorks,
  ])

  // -------------------------------------------------------------------------
  // Pagination
  // -------------------------------------------------------------------------

  const totalFiltered =
    filteredRows.length

  const totalPages = Math.max(
    1,
    Math.ceil(
      totalFiltered / pageSize
    )
  )

  const startIdx =
    (page - 1) * pageSize

  const pagedRows =
    filteredRows.slice(
      startIdx,
      startIdx + pageSize
    )

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="p-4 sm:p-6 lg:p-8">

      {/* Page header */}

      <div className="flex flex-wrap items-center gap-3 mb-6 border-b-2 border-[#1A1A18] pb-4">

        <HardHat
          className="w-5 h-5 text-[#1E3878]"
          strokeWidth={2}
        />

        <h1 className="text-xl font-black uppercase tracking-tight text-[#1A1A18]">
          Works
        </h1>

        <span className="w-full sm:w-auto sm:ml-auto text-xs font-medium uppercase tracking-wider text-[#8A8680] whitespace-nowrap">
          SHOWING{' '}
          {totalFiltered.toLocaleString()}{' '}
          OF{' '}
          {scopedWorks.length.toLocaleString()}{' '}
          RECORDS
        </span>

      </div>

      {/* ------------------------------------------------------------------ */}
      {/* CSV Drag & Drop Upload */}
      {/* ------------------------------------------------------------------ */}

      <div className="mb-6">

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() =>
            !selectedFile &&
            fileInputRef.current?.click()
          }
          className={`
            relative
            border-2
            border-dashed
            transition-all
            duration-200
            px-6
            py-8
            text-center
            ${
              selectedFile
                ? 'border-[#1E3878] bg-white'
                : 'cursor-pointer'
            }
            ${
              isDragging
                ? 'border-[#1E3878] bg-[#E8EEF9]'
                : 'border-[#8A8680] bg-white hover:bg-[#F5F2E8] hover:border-[#1A1A18]'
            }
          `}
        >

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileChange}
          />

          {selectedFile ? (

            <div className="flex flex-col items-center gap-3">

              <div className="flex items-center justify-center w-12 h-12 bg-[#1E3878] text-[#F5F2E8]">
                <FileText className="w-6 h-6" />
              </div>

              <div>

                <p className="text-sm font-black uppercase tracking-wider text-[#1A1A18]">
                  {selectedFile.name}
                </p>

                <p className="mt-1 text-xs uppercase tracking-wider text-[#8A8680]">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>

              </div>

              <div className="flex flex-wrap justify-center gap-2">

                <button
                  type="button"
                  disabled={isUploading}
                  onClick={(event) => {
                    event.stopPropagation()
                    uploadCSV()
                  }}
                  className="flex items-center gap-2 border-2 border-[#1A1A18] bg-[#1A1A18] text-[#F5F2E8] px-4 py-2 text-xs font-black uppercase tracking-wider hover:bg-[#1E3878] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Upload className="w-3 h-3" />

                  {isUploading
                    ? 'Analyzing...'
                    : 'Upload & Analyze'}
                </button>

                <button
                  type="button"
                  disabled={isUploading}
                  onClick={(event) => {
                    event.stopPropagation()
                    removeSelectedFile()
                  }}
                  className="flex items-center gap-1 border-2 border-[#1A1A18] bg-white px-3 py-2 text-xs font-black uppercase tracking-wider text-[#1A1A18] hover:bg-[#C8302A] hover:text-[#F5F2E8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <X className="w-3 h-3" />
                  Remove
                </button>

              </div>

            </div>

          ) : (

            <div className="flex flex-col items-center gap-3">

              <div className="flex items-center justify-center w-12 h-12 bg-[#F5F2E8] border-2 border-[#1A1A18]">
                <Upload className="w-6 h-6 text-[#1E3878]" />
              </div>

              <div>

                <p className="text-sm font-black uppercase tracking-wider text-[#1A1A18]">
                  Drag & Drop CSV File
                </p>

                <p className="mt-1 text-xs uppercase tracking-wider text-[#8A8680]">
                  or click to browse from your computer
                </p>

              </div>

              <span className="inline-flex items-center border-2 border-[#1A1A18] bg-[#1A1A18] text-[#F5F2E8] px-4 py-2 text-xs font-black uppercase tracking-wider">
                Choose CSV File
              </span>

              <p className="text-[10px] uppercase tracking-wider text-[#8A8680]">
                CSV files only
              </p>

            </div>

          )}

        </div>

        {/* Upload status */}

        {uploadMessage && (
          <div className="mt-3 border-2 border-[#1A1A18] bg-[#F5F2E8] px-4 py-3 text-xs font-black uppercase tracking-wider text-[#1A1A18]">
            {uploadMessage}
          </div>
        )}

        {uploadError && (
          <div className="mt-3 border-2 border-[#C8302A] bg-[#F5F2E8] px-4 py-3 text-xs font-black uppercase tracking-wider text-[#C8302A]">
            {uploadError}
          </div>
        )}

        {/* Backend analysis summary */}

        {uploadResult &&
          uploadResult.status === 'success' && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">

              <div className="border-2 border-[#1A1A18] bg-white p-3">
                <p className="text-[10px] uppercase tracking-wider text-[#8A8680]">
                  Total
                </p>

                <p className="mt-1 text-xl font-black text-[#1A1A18]">
                  {uploadResult.total_records ?? 0}
                </p>
              </div>

              <div className="border-2 border-[#1A1A18] bg-white p-3">
                <p className="text-[10px] uppercase tracking-wider text-[#8A8680]">
                  Anomalies
                </p>

                <p className="mt-1 text-xl font-black text-[#C8302A]">
                  {uploadResult.anomalies ?? 0}
                </p>
              </div>

              <div className="border-2 border-[#1A1A18] bg-white p-3">
                <p className="text-[10px] uppercase tracking-wider text-[#8A8680]">
                  Normal
                </p>

                <p className="mt-1 text-xl font-black text-[#1A1A18]">
                  {uploadResult.normal_records ?? 0}
                </p>
              </div>

              <div className="border-2 border-[#1A1A18] bg-white p-3">
                <p className="text-[10px] uppercase tracking-wider text-[#8A8680]">
                  Invalid
                </p>

                <p className="mt-1 text-xl font-black text-[#E8C018]">
                  {uploadResult.invalid_records ?? 0}
                </p>
              </div>

              <div className="border-2 border-[#1A1A18] bg-white p-3">
                <p className="text-[10px] uppercase tracking-wider text-[#8A8680]">
                  Errors
                </p>

                <p className="mt-1 text-xl font-black text-[#C8302A]">
                  {uploadResult.error_records ?? 0}
                </p>
              </div>

            </div>
          )}

        {/* Upload results table */}
        {uploadResult?.status === 'success' && mergedRows.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-black uppercase tracking-wider text-[#1A1A18] mb-3">
              Analysis Results
            </p>
            <div className="border-2 border-[#1A1A18] bg-white overflow-x-auto mb-6">
              <table className="w-full text-sm border-collapse min-w-[720px]">
                <thead>
                  <tr className="border-b-2 border-[#1A1A18] bg-[#F5F2E8]">
                    {mergedRows[0]?.state !== undefined ? (
                      <>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#8A8680] whitespace-nowrap">
                          Work ID
                        </th>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#8A8680] whitespace-nowrap">
                          Category
                        </th>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#8A8680] whitespace-nowrap">
                          State
                        </th>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#8A8680] whitespace-nowrap">
                          MP
                        </th>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#8A8680] whitespace-nowrap">
                          Status
                        </th>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#8A8680] whitespace-nowrap">
                          Cost
                        </th>
                        <th className="px-3 sm:px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[#8A8680] whitespace-nowrap">
                          Paid %
                        </th>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#8A8680] whitespace-nowrap">
                          Risk
                        </th>
                      </>
                    ) : (
                      <>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#8A8680] whitespace-nowrap">
                          Work ID
                        </th>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#8A8680] whitespace-nowrap">
                          Risk Score
                        </th>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#8A8680] whitespace-nowrap">
                          Risk Level
                        </th>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#8A8680] whitespace-nowrap">
                          Result
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-[#1A1A18]">
                  {uploadPagedRows.map((row, i) => {
                    const hasRawFields = row.state !== undefined
                    const riskStyle = RISK_BADGE[row.risk_level] ?? 'bg-white text-[#1A1A18] border border-[#1A1A18]'

                    if (hasRawFields) {
                      const statusStyle = STATUS_STYLES[row.status ?? ''] ?? 'bg-white text-[#1A1A18] border border-[#1A1A18]'
                      const paidPct = row.payment_released_pct !== undefined ? (Number(row.payment_released_pct) * 100).toFixed(1) : ''

                      return (
                        <tr
                          key={row.work_id || i}
                          className="hover:bg-[#F5F2E8] transition-colors cursor-default"
                        >
                          <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                            <span className="font-mono text-xs font-medium text-[#1A1A18]">
                              {row.work_id}
                            </span>
                          </td>
                          <td
                            className="px-3 sm:px-4 py-3 text-xs text-[#4A4845] max-w-[200px] truncate"
                            title={row.work_category}
                          >
                            {row.work_category && row.work_category.length > 30
                              ? `${row.work_category.slice(0, 30)}…`
                              : row.work_category}
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-xs text-[#4A4845] whitespace-nowrap">
                            {row.state}
                          </td>
                          <td
                            className="px-3 sm:px-4 py-3 text-xs text-[#4A4845] max-w-[160px] truncate"
                            title={row.mp_name}
                          >
                            {row.mp_name
                              ? row.mp_name.length > 24
                                ? `${row.mp_name.slice(0, 24)}…`
                                : row.mp_name
                              : '—'}
                          </td>
                          <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 text-xs font-black uppercase tracking-wider ${statusStyle}`}
                            >
                              {row.status}
                            </span>
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-xs font-medium text-[#1A1A18] whitespace-nowrap">
                            {formatCost(row.cost_estimate ?? '0')}
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-xs font-medium text-[#4A4845] text-right whitespace-nowrap">
                            {paidPct}%
                          </td>
                          <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 text-xs font-black uppercase tracking-wider ${riskStyle}`}
                            >
                              {row.risk_level.toUpperCase()}{' '}
                              {row.risk_score !== null ? row.risk_score.toFixed(1) : ''}
                            </span>
                          </td>
                        </tr>
                      )
                    }

                    return (
                      <tr
                        key={row.work_id || i}
                        className="hover:bg-[#F5F2E8] transition-colors cursor-default"
                      >
                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                          <span className="font-mono text-xs font-medium text-[#1A1A18]">
                            {row.work_id}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-xs text-[#4A4845] whitespace-nowrap">
                          {row.risk_score !== null ? row.risk_score.toFixed(1) : '—'}
                        </td>
                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 text-xs font-black uppercase tracking-wider ${riskStyle}`}
                          >
                            {row.risk_level.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-xs text-[#4A4845] whitespace-nowrap">
                          {row.is_anomaly === true
                            ? 'Anomaly'
                            : row.is_anomaly === false
                            ? 'Normal'
                            : row.error ?? '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <span className="text-xs font-medium uppercase tracking-wider text-[#8A8680]">
                SHOWING {mergedRows.length === 0 ? 0 : uploadStartIdx + 1}–
                {Math.min(uploadStartIdx + uploadPageSize, mergedRows.length)} OF {mergedRows.length} RESULTS
              </span>

              <div className="flex items-center gap-2 justify-between sm:justify-end">
                <span className="text-xs uppercase tracking-wider text-[#8A8680]">
                  ROWS:
                </span>
                <select
                  value={uploadPageSize}
                  onChange={(e) => {
                    setUploadPageSize(Number(e.target.value))
                    setUploadPage(1)
                  }}
                  className="bg-white border-2 border-[#1A1A18] rounded-none h-8 text-xs font-medium uppercase tracking-wider px-2 outline-none cursor-pointer text-[#1A1A18]"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>

                <button
                  onClick={() => setUploadPage((p) => Math.max(1, p - 1))}
                  disabled={uploadPage === 1}
                  className="border-2 border-[#1A1A18] bg-white rounded-none h-8 px-3 ml-2 text-xs font-medium uppercase tracking-wider hover:bg-[#E8C018] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← PREV
                </button>

                <span className="text-xs font-medium uppercase tracking-wider text-[#1A1A18]">
                  PAGE {uploadPage} OF {uploadTotalPages}
                </span>

                <button
                  onClick={() =>
                    setUploadPage((p) => Math.min(uploadTotalPages, p + 1))
                  }
                  disabled={uploadPage === uploadTotalPages}
                  className="border-2 border-[#1A1A18] bg-white rounded-none h-8 px-3 text-xs font-medium uppercase tracking-wider hover:bg-[#E8C018] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  NEXT →
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Filter bar */}
      {/* ------------------------------------------------------------------ */}

      <div className="flex flex-wrap items-center gap-3 mb-4">

        {/* Severity pills */}

        <div className="flex flex-wrap gap-2">

          {(
            ['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const
          ).map((sev) => (

            <button
              key={sev}
              onClick={() =>
                setSeverity(sev)
              }
              className={`
                px-3
                h-8
                text-xs
                font-medium
                uppercase
                tracking-wider
                transition-colors
                border-2
                border-[#1A1A18]
                ${
                  severity === sev
                    ? 'bg-[#1A1A18] text-[#F5F2E8]'
                    : 'bg-white text-[#1A1A18] hover:bg-[#F5F2E8]'
                }
              `}
            >
              {sev}
            </button>

          ))}

        </div>

        {/* Category dropdown */}

        <select
          value={category}
          onChange={(e) =>
            setCategory(e.target.value)
          }
          className="bg-white border-2 border-[#1A1A18] rounded-none h-8 text-xs font-medium uppercase tracking-wider px-2 outline-none cursor-pointer text-[#1A1A18]"
        >

          <option value="All Categories">
            All Categories
          </option>

          {ALL_CATEGORIES.map((c) => (
            <option
              key={c}
              value={c}
            >
              {c}
            </option>
          ))}

        </select>

        {/* State dropdown */}

        <select
          value={stateFilter}
          onChange={(e) =>
            setStateFilter(e.target.value)
          }
          className="bg-white border-2 border-[#1A1A18] rounded-none h-8 text-xs font-medium uppercase tracking-wider px-2 outline-none cursor-pointer text-[#1A1A18]"
        >

          <option value="All States">
            All States
          </option>

          {ALL_STATES.map((s) => (
            <option
              key={s}
              value={s}
            >
              {s}
            </option>
          ))}

        </select>

        {/* Search */}

        <input
          type="text"
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          placeholder="SEARCH WORK ID, MP, AGENCY..."
          className="min-w-[200px] flex-1 sm:flex-initial px-3 h-8 text-xs border-2 border-[#1A1A18] bg-white text-[#1A1A18] placeholder:text-[#8A8680] outline-none focus:bg-[#F5F2E8] transition-colors font-medium uppercase tracking-wide"
        />

        {/* Rows per page */}

        <div className="flex items-center gap-2 ml-auto">

          <span className="text-xs uppercase tracking-wider text-[#8A8680]">
            ROWS:
          </span>

          <select
            value={pageSize}
            onChange={(e) =>
              setPageSize(
                Number(e.target.value)
              )
            }
            className="bg-white border-2 border-[#1A1A18] rounded-none h-8 text-xs font-medium uppercase tracking-wider px-2 outline-none cursor-pointer text-[#1A1A18]"
          >

            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>

          </select>

        </div>

      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Table */}
      {/* ------------------------------------------------------------------ */}

      <div className="border-2 border-[#1A1A18] bg-white overflow-x-auto">

        <table className="w-full text-sm border-collapse min-w-[720px]">

          <thead>

            <tr className="border-b-2 border-[#1A1A18] bg-[#F5F2E8]">

              {COLS.map((col) => (

                <th
                  key={col.key}
                  onClick={() =>
                    toggleSort(col.key)
                  }
                  className="px-3 sm:px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#8A8680] whitespace-nowrap cursor-pointer select-none hover:text-[#1A1A18]"
                >

                  <span className="inline-flex items-center gap-1">

                    {col.label}

                    <SortIcon
                      active={
                        sortKey === col.key
                      }
                      dir={sortDir}
                    />

                  </span>

                </th>

              ))}

            </tr>

          </thead>

          <tbody className="divide-y-2 divide-[#1A1A18]">

            {pagedRows.length === 0 ? (

              <tr>

                <td
                  colSpan={COLS.length}
                  className="px-4 py-12 text-center text-sm uppercase tracking-wider text-[#8A8680]"
                >
                  NO RECORDS MATCH FILTERS
                </td>

              </tr>

            ) : (

              pagedRows.map((row) => {

                const statusStyle =
                  STATUS_STYLES[
                    row.status
                  ] ??
                  'bg-white text-[#1A1A18] border border-[#1A1A18]'

                const riskStyle =
                  RISK_BADGE[
                    row.risk_level
                  ] ??
                  'bg-white text-[#1A1A18] border border-[#1A1A18]'

                const paidPct = (
                  Number(
                    row.payment_released_pct
                  ) * 100
                ).toFixed(1)

                return (

                  <tr
                    key={row.work_id}
                    className="hover:bg-[#F5F2E8] transition-colors cursor-default"
                  >

                    {/* Work ID */}

                    <td className="px-3 sm:px-4 py-3 whitespace-nowrap">

                      <span className="font-mono text-xs font-medium text-[#1A1A18]">
                        {row.work_id}
                      </span>

                    </td>

                    {/* Category */}

                    <td
                      className="px-3 sm:px-4 py-3 text-xs text-[#4A4845] max-w-[200px] truncate"
                      title={
                        row.work_category
                      }
                    >
                      {row.work_category.length >
                      30
                        ? `${row.work_category.slice(
                            0,
                            30
                          )}…`
                        : row.work_category}
                    </td>

                    {/* State */}

                    <td className="px-3 sm:px-4 py-3 text-xs text-[#4A4845] whitespace-nowrap">
                      {row.state}
                    </td>

                    {/* MP */}

                    <td
                      className="px-3 sm:px-4 py-3 text-xs text-[#4A4845] max-w-[160px] truncate"
                      title={row.mp_name}
                    >
                      {row.mp_name
                        ? row.mp_name.length >
                          24
                          ? `${row.mp_name.slice(
                              0,
                              24
                            )}…`
                          : row.mp_name
                        : '—'}
                    </td>

                    {/* Status */}

                    <td className="px-3 sm:px-4 py-3 whitespace-nowrap">

                      <span
                        className={`px-2 py-0.5 text-xs font-black uppercase tracking-wider ${statusStyle}`}
                      >
                        {row.status}
                      </span>

                    </td>

                    {/* Cost */}

                    <td className="px-3 sm:px-4 py-3 text-xs font-medium text-[#1A1A18] whitespace-nowrap">
                      {formatCost(
                        row.cost_estimate
                      )}
                    </td>

                    {/* Paid % */}

                    <td className="px-3 sm:px-4 py-3 text-xs font-medium text-[#4A4845] text-right whitespace-nowrap">
                      {paidPct}%
                    </td>

                    {/* Risk */}

                    <td className="px-3 sm:px-4 py-3 whitespace-nowrap">

                      <span
                        className={`px-2 py-0.5 text-xs font-black uppercase tracking-wider ${riskStyle}`}
                      >
                        {row.risk_level.toUpperCase()}{' '}
                        {Number(
                          row.risk_score
                        ).toFixed(1)}
                      </span>

                    </td>

                  </tr>

                )
              })

            )}

          </tbody>

        </table>

      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Pagination footer */}
      {/* ------------------------------------------------------------------ */}

      <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

        <span className="text-xs font-medium uppercase tracking-wider text-[#8A8680]">

          SHOWING{' '}

          {totalFiltered === 0
            ? 0
            : startIdx + 1}

          –

          {Math.min(
            startIdx + pageSize,
            totalFiltered
          )}{' '}

          OF {totalFiltered} RECORDS

        </span>

        <div className="flex items-center gap-2 justify-between sm:justify-end">

          <button
            onClick={() =>
              setPage((p) =>
                Math.max(1, p - 1)
              )
            }
            disabled={page === 1}
            className="border-2 border-[#1A1A18] bg-white rounded-none h-8 px-3 text-xs font-medium uppercase tracking-wider hover:bg-[#E8C018] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← PREV
          </button>

          <span className="text-xs font-medium uppercase tracking-wider text-[#1A1A18]">
            PAGE {page} OF {totalPages}
          </span>

          <button
            onClick={() =>
              setPage((p) =>
                Math.min(
                  totalPages,
                  p + 1
                )
              )
            }
            disabled={
              page === totalPages
            }
            className="border-2 border-[#1A1A18] bg-white rounded-none h-8 px-3 text-xs font-medium uppercase tracking-wider hover:bg-[#E8C018] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            NEXT →
          </button>

        </div>

      </div>

    </div>
  )
}