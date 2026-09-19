import { AlertTriangle } from 'lucide-react'
import {
  createColumnHelper,
  flexRender,
  stockFeatures,
  useTable,
} from '@tanstack/react-table'

// ---------------------------------------------------------------------------
// F5 — Alerts table demo data
// Shape aligns with future AlertsResponse contract.
// ---------------------------------------------------------------------------
type Severity = 'Low' | 'Medium' | 'High' | 'Critical'
type Status   = 'Open' | 'Under Review' | 'Resolved'

interface AlertRow {
  alert_id:   string
  district:   string
  work:       string
  risk_score: number
  severity:   Severity
  date:       string
  status:     Status
}

const ALERT_DATA: AlertRow[] = [
  { alert_id: 'ALT-001', district: 'Varanasi',  work: 'Road resurfacing WK-4821',         risk_score: 9.1, severity: 'Critical',  date: '2025-03-14', status: 'Open'         },
  { alert_id: 'ALT-002', district: 'Patna',     work: 'School boundary wall WK-3910',      risk_score: 7.4, severity: 'High',      date: '2025-03-13', status: 'Under Review' },
  { alert_id: 'ALT-003', district: 'Jaipur',    work: 'Drainage canal WK-2201',            risk_score: 4.8, severity: 'Medium',    date: '2025-03-12', status: 'Open'         },
  { alert_id: 'ALT-004', district: 'Bhopal',    work: 'Community hall WK-5503',            risk_score: 8.6, severity: 'High',      date: '2025-03-11', status: 'Open'         },
  { alert_id: 'ALT-005', district: 'Lucknow',   work: 'Health sub-centre WK-6712',         risk_score: 6.2, severity: 'Medium',    date: '2025-03-10', status: 'Under Review' },
  { alert_id: 'ALT-006', district: 'Indore',    work: 'Anganwadi building WK-1108',        risk_score: 3.1, severity: 'Low',       date: '2025-03-09', status: 'Resolved'     },
  { alert_id: 'ALT-007', district: 'Agra',      work: 'Rural connectivity road WK-8830',   risk_score: 9.4, severity: 'Critical',  date: '2025-03-08', status: 'Open'         },
]

// ---------------------------------------------------------------------------
// Severity badge — sharp Bauhaus style, no pill/rounded classes
// ---------------------------------------------------------------------------
const SEVERITY_STYLE: Record<Severity, { bg: string; text: string; border?: string }> = {
  Low:      { bg: '#F5F2E8', text: '#1A1A18', border: '1px solid #1A1A18' },
  Medium:   { bg: '#E8C018', text: '#1A1A18' },
  High:     { bg: '#C8302A', text: '#F5F2E8' },
  Critical: { bg: '#C8302A', text: '#F5F2E8' },
}

function SeverityBadge({ severity }: { severity: Severity }) {
  const s = SEVERITY_STYLE[severity]
  return (
    <span
      style={{
        background:  s.bg,
        color:       s.text,
        border:      s.border ?? 'none',
        display:     'inline-block',
        padding:     '1px 6px',
        fontSize:    '11px',
        fontWeight:  900,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
      }}
    >
      {severity}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Status chip — plain text style to keep density low
// ---------------------------------------------------------------------------
const STATUS_COLOR: Record<Status, string> = {
  Open:           '#C8302A',
  'Under Review': '#E8C018',
  Resolved:       '#1E3878',
}

function StatusChip({ status }: { status: Status }) {
  return (
    <span
      style={{
        color:         STATUS_COLOR[status],
        fontSize:      '11px',
        fontWeight:    700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}
    >
      {status}
    </span>
  )
}

// ---------------------------------------------------------------------------
// TanStack Table v9 setup
// ---------------------------------------------------------------------------
const colHelper = createColumnHelper<AlertRow>()

const features = stockFeatures

const columns = [
  colHelper.accessor('alert_id', {
    header: 'Alert ID',
    cell: (info) => (
      <span className="font-medium text-[#1A1A18] text-xs tracking-wider">{info.getValue()}</span>
    ),
  }),
  colHelper.accessor('district', {
    header: 'District',
    cell: (info) => <span className="text-xs text-[#1A1A18]">{info.getValue()}</span>,
  }),
  colHelper.accessor('work', {
    header: 'Work',
    cell: (info) => (
      <span className="text-xs text-[#1A1A18] block max-w-[220px] truncate" title={info.getValue()}>
        {info.getValue()}
      </span>
    ),
  }),
  colHelper.accessor('risk_score', {
    header: 'Risk Score',
    cell: (info) => (
      <span className="text-xs font-black text-[#1A1A18]">{info.getValue().toFixed(1)} / 10</span>
    ),
  }),
  colHelper.accessor('severity', {
    header: 'Severity',
    cell: (info) => <SeverityBadge severity={info.getValue()} />,
  }),
  colHelper.accessor('date', {
    header: 'Date',
    cell: (info) => <span className="text-xs text-[#4A4845]">{info.getValue()}</span>,
  }),
  colHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <StatusChip status={info.getValue()} />,
  }),
]

export function Alerts() {
  const table = useTable({ features, columns, data: ALERT_DATA })

  return (
    <div className="p-8">
      {/* Page header — preserved from original */}
      <div className="flex items-center gap-3 mb-8 border-b-2 border-[#1A1A18] pb-4">
        <AlertTriangle className="w-5 h-5 text-[#C8302A]" strokeWidth={2} />
        <h1 className="text-xl font-black uppercase tracking-tight text-[#1A1A18]">Alerts</h1>
        <span className="ml-auto text-xs font-medium uppercase tracking-wider text-[#8A8680]">
          {ALERT_DATA.length} active
        </span>
      </div>

      {/* F5 — TanStack Table v9 alerts table */}
      <div className="border-2 border-[#1A1A18] bg-[#FFFFFF] overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b-2 border-[#1A1A18] bg-[#F5F2E8]">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-xs font-black uppercase tracking-wider text-[#1A1A18]"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y-2 divide-[#1A1A18]">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-[#F5F2E8] transition-colors duration-100"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
