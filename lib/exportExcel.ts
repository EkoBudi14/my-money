import { Transaction, Wallet } from '@/types'

export interface FilterHistoryEntry {
  start_date: string
  end_date: string
  label?: string
}

interface ExportOptions {
  periodLabel: string
  fileNamePeriod: string
  /** Transactions shown on the "Transaksi" sheet (already period/type filtered). */
  filteredTransactions: Transaction[]
  /** All transactions, used for the per-range recap sheet. */
  transactions: Transaction[]
  wallets: Wallet[]
  filterHistory: FilterHistoryEntry[]
  showToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void
}

/**
 * Build and download a multi-sheet Excel report (Transaksi, Per Kategori,
 * Rekap per Rentang, Dompet). Extracted verbatim from the dashboard's
 * handleExportExcel so the output is unchanged; only the period label and the
 * transaction scope are passed in by the caller.
 */
export async function exportTransactionsExcel({
  periodLabel,
  fileNamePeriod,
  filteredTransactions,
  transactions,
  wallets,
  filterHistory,
  showToast,
}: ExportOptions) {
  try {
    showToast('info', 'Menyiapkan file Excel…')
    const ExcelJS = (await import('exceljs')).default
    const fileSaverModule = await import('file-saver')
    const saveAs = fileSaverModule.saveAs || (fileSaverModule as any).default?.saveAs

    const wb = new ExcelJS.Workbook()
    wb.creator = 'CatatDuit'
    wb.created = new Date()

    // Helpers
    const BORDER_STYLE: any = { style: 'thin', color: { argb: 'FFD1D5DB' } }
    const THICK_BORDER: any = { style: 'medium', color: { argb: 'FF9CA3AF' } }
    const CELL_BORDER = { top: BORDER_STYLE, left: BORDER_STYLE, bottom: BORDER_STYLE, right: BORDER_STYLE }
    const BOTTOM_THICK = { top: BORDER_STYLE, left: BORDER_STYLE, bottom: THICK_BORDER, right: BORDER_STYLE }
    const RP_FMT = '"Rp "#,##0'
    const RP_FMT_NEG = '"Rp "#,##0;[Red]-"Rp "#,##0'

    const applyBorderToRow = (row: any, colCount: number, borderStyle = CELL_BORDER) => {
      for (let c = 1; c <= colCount; c++) {
        row.getCell(c).border = borderStyle
      }
    }

    const addTitleRow = (ws: any, title: string, colCount: number, color: string) => {
      const colLetter = String.fromCharCode(64 + colCount)
      ws.addRow([title])
      ws.mergeCells(`A1:${colLetter}1`)
      const cell = ws.getCell('A1')
      cell.value = title
      cell.font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      ws.getRow(1).height = 30
    }

    const addColHeaderRow = (ws: any, headers: string[], colCount: number, color = 'FF374151') => {
      const hRow = ws.addRow(headers)
      hRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
      hRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }
      hRow.height = 22
      hRow.alignment = { vertical: 'middle' }
      applyBorderToRow(hRow, colCount, BOTTOM_THICK)
      return hRow
    }

    // ==========================================
    // SHEET 1: TRANSAKSI (sesuai filter aktif)
    // ==========================================
    const wsTx = wb.addWorksheet('Transaksi')
    wsTx.properties.tabColor = { argb: 'FF165DFF' }
    wsTx.columns = [
      { key: 'date', width: 16 },
      { key: 'type', width: 16 },
      { key: 'category', width: 22 },
      { key: 'account', width: 18 },
      { key: 'inflow', width: 18 },
      { key: 'outflow', width: 18 },
      { key: 'transfer', width: 16 },
      { key: 'piutang', width: 18 },
      { key: 'talangan', width: 18 },
      { key: 'note', width: 30 },
    ]

    addTitleRow(wsTx, `Transaksi Periode: ${periodLabel}`, 10, 'FF165DFF')
    addColHeaderRow(wsTx, ['Tanggal', 'Tipe', 'Kategori', 'Dompet', 'Pemasukan', 'Pengeluaran', 'Transfer', 'Piutang', 'Talangan', 'Catatan'], 10)

    const filteredSorted = [...filteredTransactions].sort(
      (a, b) => new Date(a.date || a.created_at).getTime() - new Date(b.date || b.created_at).getTime()
    )

    filteredSorted.forEach(t => {
      const walletName = wallets.find(w => w.id === t.wallet_id)?.name || '-'
      const isPiutangTx = t.type === 'pemasukan' && t.is_piutang
      const isTalaganTx = t.type === 'pengeluaran' && t.is_talangan

      let typeLabel = 'Transfer'
      if (isPiutangTx) typeLabel = 'Piutang'
      else if (t.type === 'pemasukan') typeLabel = 'Pemasukan'
      if (isTalaganTx) typeLabel = 'Talangan/Split'
      else if (t.type === 'pengeluaran') typeLabel = 'Pengeluaran'

      const isOdd = (wsTx.rowCount % 2 === 0)
      const row = wsTx.addRow({
        date: new Date(t.date || t.created_at),
        type: typeLabel,
        category: t.category || '-',
        account: walletName,
        inflow: (t.type === 'pemasukan' && !isPiutangTx) ? t.amount : null,
        outflow: (t.type === 'pengeluaran' && !isTalaganTx) ? t.amount : null,
        transfer: t.type === 'topup' ? t.amount : null,
        piutang: isPiutangTx ? t.amount : null,
        talangan: isTalaganTx ? t.amount : null,
        note: t.title || '',
      })
      row.height = 18
      row.getCell('date').numFmt = 'dd mmm yyyy'
      row.getCell('inflow').numFmt = RP_FMT
      row.getCell('outflow').numFmt = RP_FMT
      row.getCell('transfer').numFmt = RP_FMT
      row.getCell('piutang').numFmt = RP_FMT
      row.getCell('talangan').numFmt = RP_FMT
      if (!isPiutangTx && t.type === 'pemasukan') row.getCell('inflow').font = { color: { argb: 'FF059669' }, bold: true }
      if (!isTalaganTx && t.type === 'pengeluaran') row.getCell('outflow').font = { color: { argb: 'FFDC2626' }, bold: true }
      if (isPiutangTx) row.getCell('piutang').font = { color: { argb: 'FF9333EA' }, bold: true }
      if (isTalaganTx) row.getCell('talangan').font = { color: { argb: 'FFEA580C' }, bold: true }
      if (isOdd) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFF' } }
      applyBorderToRow(row, 10)
    })

    const totalIn = filteredTransactions.filter(t => t.type === 'pemasukan' && !t.is_piutang).reduce((s, t) => s + t.amount, 0)
    const totalOut = filteredTransactions.filter(t => t.type === 'pengeluaran' && !t.is_talangan).reduce((s, t) => s + t.amount, 0)
    const totalTrf = filteredTransactions.filter(t => t.type === 'topup').reduce((s, t) => s + t.amount, 0)
    const totalPiutangAmt = filteredTransactions.filter(t => t.is_piutang).reduce((s, t) => s + t.amount, 0)
    const totalTalaganAmt = filteredTransactions.filter(t => t.is_talangan).reduce((s, t) => s + t.amount, 0)
    const txTotalRow = wsTx.addRow({
      date: 'TOTAL PERIODE',
      inflow: totalIn || null,
      outflow: totalOut || null,
      transfer: totalTrf || null,
      piutang: totalPiutangAmt || null,
      talangan: totalTalaganAmt || null,
    })
    txTotalRow.font = { bold: true }
    txTotalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } }
    txTotalRow.getCell('inflow').numFmt = RP_FMT
    txTotalRow.getCell('inflow').font = { bold: true, color: { argb: 'FF059669' } }
    txTotalRow.getCell('outflow').numFmt = RP_FMT
    txTotalRow.getCell('outflow').font = { bold: true, color: { argb: 'FFDC2626' } }
    txTotalRow.getCell('transfer').numFmt = RP_FMT
    txTotalRow.getCell('piutang').numFmt = RP_FMT
    txTotalRow.getCell('piutang').font = { bold: true, color: { argb: 'FF9333EA' } }
    txTotalRow.getCell('talangan').numFmt = RP_FMT
    txTotalRow.getCell('talangan').font = { bold: true, color: { argb: 'FFEA580C' } }
    applyBorderToRow(txTotalRow, 10, BOTTOM_THICK)
    wsTx.autoFilter = { from: 'A2', to: 'J2' }

    // ==========================================
    // SHEET 2: PER KATEGORI (filter aktif)
    // ==========================================
    const wsCat = wb.addWorksheet('Per Kategori')
    wsCat.properties.tabColor = { argb: 'FFEF4444' }
    wsCat.columns = [
      { key: 'category', width: 28 },
      { key: 'total', width: 22 },
      { key: 'percent', width: 16 },
    ]
    addTitleRow(wsCat, `Pengeluaran per Kategori — ${periodLabel}`, 3, 'FFEF4444')
    addColHeaderRow(wsCat, ['Kategori', 'Total Pengeluaran', '% dari Total'], 3)

    const totalExpensePeriod = filteredTransactions.filter(t => t.type === 'pengeluaran').reduce((s, t) => s + t.amount, 0)
    const expByCat: Record<string, number> = {}
    filteredTransactions.filter(t => t.type === 'pengeluaran').forEach(t => {
      const cat = t.category || 'Lainnya'
      expByCat[cat] = (expByCat[cat] || 0) + t.amount
    })
    Object.entries(expByCat).sort((a, b) => b[1] - a[1]).forEach(([cat, total]) => {
      const row = wsCat.addRow({ category: cat, total, percent: totalExpensePeriod > 0 ? total / totalExpensePeriod : 0 })
      row.height = 18
      row.getCell('total').numFmt = RP_FMT
      row.getCell('total').font = { bold: true, color: { argb: 'FF7F1D1D' } }
      row.getCell('percent').numFmt = '0.0%'
      row.getCell('percent').font = { color: { argb: 'FF374151' } }
      applyBorderToRow(row, 3)
    })
    if (Object.keys(expByCat).length > 0) {
      wsCat.addConditionalFormatting({
        ref: `B3:B${2 + Object.keys(expByCat).length}`,
        rules: [{ type: 'colorScale', cfvo: [{ type: 'min' }, { type: 'max' }], color: [{ argb: 'FFFFFFFF' }, { argb: 'FFFCA5A5' }] } as any]
      })
    }

    // ==========================================
    // SHEET 3: REKAP PER RENTANG (dari filter_history)
    // ==========================================
    const wsSummary = wb.addWorksheet('Rekap per Rentang')
    wsSummary.properties.tabColor = { argb: 'FF059669' }
    wsSummary.columns = [
      { key: 'range', width: 32 },
      { key: 'income', width: 22 },
      { key: 'expense', width: 22 },
      { key: 'piutang', width: 20 },
      { key: 'talangan', width: 20 },
      { key: 'tabungan', width: 22 },
      { key: 'diff', width: 22 },
    ]
    addTitleRow(wsSummary, 'Rekap per Rentang Tanggal — Semua Riwayat', 7, 'FF059669')
    addColHeaderRow(wsSummary, ['Rentang Tanggal', 'Pemasukan', 'Pengeluaran', 'Piutang', 'Talangan', 'Tabungan', 'Selisih'], 7)

    const normDate = (d: string) => d.split('T')[0]
    const getMs = (d: string) => new Date(normDate(d)).getTime()

    const MIN_DURATION_MS = 2 * 24 * 60 * 60 * 1000
    const seenKeys = new Set<string>()
    const deduped = filterHistory.filter(entry => {
      const nStart = normDate(entry.start_date)
      const nEnd = normDate(entry.end_date)
      const durationMs = new Date(nEnd).getTime() - new Date(nStart).getTime()
      if (durationMs < MIN_DURATION_MS) return false
      const key = `${nStart}|${nEnd}`
      if (seenKeys.has(key)) return false
      seenKeys.add(key)
      return true
    })

    deduped.sort((a, b) => getMs(a.start_date) - getMs(b.start_date))

    const cleanHistory = deduped.filter((entry) => {
      const eStart = getMs(entry.start_date)
      const eEnd = getMs(entry.end_date)
      const sameStartOthers = deduped.filter(o => o !== entry && getMs(o.start_date) === eStart)
      if (sameStartOthers.length === 0) return true
      const hasShorterSameStart = sameStartOthers.some(o => getMs(o.end_date) < eEnd)
      if (hasShorterSameStart) {
        const shorterVersions = sameStartOthers.filter(o => getMs(o.end_date) < eEnd)
        const isSplit = shorterVersions.some(small =>
          deduped.some(c => c !== entry && c !== small && getMs(c.start_date) >= getMs(small.end_date))
        )
        if (isSplit) return false
      }
      const hasLongerSameStart = sameStartOthers.some(o => getMs(o.end_date) > eEnd)
      if (hasLongerSameStart) {
        const hasContinuation = deduped.some(c => c !== entry && getMs(c.start_date) >= eEnd)
        if (!hasContinuation) return false
      }
      return true
    })

    cleanHistory.sort((a, b) => getMs(a.start_date) - getMs(b.start_date))

    if (cleanHistory.length === 0) {
      const noteRow = wsSummary.addRow({ range: 'Belum ada history rentang tanggal. Gunakan filter custom minimal 3 hari dan data akan tercatat otomatis.' })
      noteRow.getCell('range').font = { italic: true, color: { argb: 'FF6B7280' } }
    } else {
      let grandIn = 0, grandOut = 0, grandTabungan = 0
      const savingsWalletIds = wallets.filter(w => w.category === 'savings').map(w => w.id)

      cleanHistory.forEach((entry, idx) => {
        const start = new Date(normDate(entry.start_date))
        start.setHours(0, 0, 0, 0)
        let end = new Date(normDate(entry.end_date))
        end.setHours(0, 0, 0, 0)

        const nextEntry = cleanHistory[idx + 1]
        if (nextEntry) {
          const nextStart = new Date(normDate(nextEntry.start_date))
          nextStart.setHours(0, 0, 0, 0)
          if (nextStart < end) end = nextStart
        }

        const rangeTransactions = transactions.filter(t => {
          const d = new Date(t.date || t.created_at)
          d.setHours(0, 0, 0, 0)
          return d >= start && d < end
        })

        const income = rangeTransactions.filter(t => t.type === 'pemasukan' && !t.is_piutang).reduce((s, t) => s + t.amount, 0)
        const expense = rangeTransactions.filter(t => t.type === 'pengeluaran' && !t.is_talangan).reduce((s, t) => s + t.amount, 0)
        const piutang = rangeTransactions.filter(t => t.is_piutang).reduce((s, t) => s + t.amount, 0)
        const talangan = rangeTransactions.filter(t => t.is_talangan).reduce((s, t) => s + t.amount, 0)

        const tabunganIn = rangeTransactions.filter(t =>
          (t.type === 'pemasukan' && t.wallet_id && savingsWalletIds.includes(t.wallet_id)) ||
          (t.type === 'topup' && t.wallet_id && savingsWalletIds.includes(t.wallet_id) && (!t.source_wallet_id || !savingsWalletIds.includes(t.source_wallet_id)))
        ).reduce((s, t) => s + t.amount, 0)

        const tabunganOut = rangeTransactions.filter(t =>
          (t.type === 'pengeluaran' && t.wallet_id && savingsWalletIds.includes(t.wallet_id)) ||
          (t.type === 'topup' && t.source_wallet_id && savingsWalletIds.includes(t.source_wallet_id) && (!t.wallet_id || !savingsWalletIds.includes(t.wallet_id)))
        ).reduce((s, t) => s + t.amount, 0)

        const tabungan = tabunganIn - tabunganOut
        const diff = income - expense

        grandIn += income
        grandOut += expense
        grandTabungan += tabungan

        const rangeLabel = entry.label || `${entry.start_date} – ${entry.end_date}`
        const row = wsSummary.addRow({ range: rangeLabel, income, expense, piutang, talangan, tabungan, diff })
        row.height = 18
        row.getCell('income').numFmt = RP_FMT
        row.getCell('income').font = { color: { argb: 'FF059669' } }
        row.getCell('expense').numFmt = RP_FMT
        row.getCell('expense').font = { color: { argb: 'FFDC2626' } }
        row.getCell('piutang').numFmt = RP_FMT
        row.getCell('piutang').font = { color: { argb: 'FF9333EA' } }
        row.getCell('talangan').numFmt = RP_FMT
        row.getCell('talangan').font = { color: { argb: 'FFEA580C' } }
        row.getCell('tabungan').numFmt = RP_FMT_NEG
        row.getCell('tabungan').font = { bold: true, color: { argb: 'FF059669' } }
        row.getCell('diff').numFmt = RP_FMT_NEG
        row.getCell('diff').font = { bold: true, color: { argb: diff >= 0 ? 'FF165DFF' : 'FFDC2626' } }
        if (idx % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } }
        applyBorderToRow(row, 7)
      })

      if (cleanHistory.length > 1) {
        const grandDiff = grandIn - grandOut
        const grandRow = wsSummary.addRow({ range: 'TOTAL SEMUA RENTANG', income: grandIn, expense: grandOut, tabungan: grandTabungan, diff: grandDiff })
        grandRow.font = { bold: true }
        grandRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } }
        grandRow.getCell('income').numFmt = RP_FMT
        grandRow.getCell('income').font = { bold: true, color: { argb: 'FF059669' } }
        grandRow.getCell('expense').numFmt = RP_FMT
        grandRow.getCell('expense').font = { bold: true, color: { argb: 'FFDC2626' } }
        grandRow.getCell('tabungan').numFmt = RP_FMT_NEG
        grandRow.getCell('tabungan').font = { bold: true, color: { argb: 'FF059669' } }
        grandRow.getCell('diff').numFmt = RP_FMT_NEG
        grandRow.getCell('diff').font = { bold: true, color: { argb: grandDiff >= 0 ? 'FF165DFF' : 'FFDC2626' } }
        applyBorderToRow(grandRow, 7, BOTTOM_THICK)
      }
    }

    // ==========================================
    // SHEET 4: DOMPET
    // ==========================================
    const wsWallets = wb.addWorksheet('Dompet')
    wsWallets.properties.tabColor = { argb: 'FFF59E0B' }
    wsWallets.columns = [
      { key: 'name', width: 24 },
      { key: 'type', width: 16 },
      { key: 'category', width: 16 },
      { key: 'balance', width: 22 },
    ]
    addTitleRow(wsWallets, 'Saldo Dompet Saat Ini', 4, 'FFF59E0B')
    addColHeaderRow(wsWallets, ['Nama Dompet', 'Tipe', 'Kategori', 'Saldo'], 4)
    wallets.forEach((w, idx) => {
      const row = wsWallets.addRow({
        name: w.name,
        type: w.type === 'cash' ? 'Tunai' : 'Bank/E-Wallet',
        category: w.category === 'active' ? 'Saldo Aktif' : 'Tabungan',
        balance: w.balance,
      })
      row.height = 18
      row.getCell('balance').numFmt = RP_FMT
      row.getCell('balance').font = { bold: true, color: { argb: 'FF165DFF' } }
      if (idx % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } }
      applyBorderToRow(row, 4)
    })
    const totalBalance = wallets.reduce((s, w) => s + w.balance, 0)
    const walletTotalRow = wsWallets.addRow({ name: 'TOTAL', balance: totalBalance })
    walletTotalRow.font = { bold: true }
    walletTotalRow.getCell('balance').numFmt = RP_FMT
    walletTotalRow.getCell('balance').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } }
    applyBorderToRow(walletTotalRow, 4, BOTTOM_THICK)

    wb.views = [{ x: 0, y: 0, width: 10000, height: 20000, firstSheet: 0, activeTab: 0, visibility: 'visible' }]

    const buffer = await wb.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    saveAs(blob, `CatatDuit_${fileNamePeriod}.xlsx`)
    showToast('success', `${filteredTransactions.length.toLocaleString('id-ID')} transaksi diekspor`)
  } catch (error) {
    console.error('Export Excel error:', error)
    showToast('error', 'File Excel gagal dibuat. Coba lagi.')
  }
}
