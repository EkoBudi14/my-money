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
 * Build and download a multi-sheet Excel report. Sheets:
 * Ringkasan (KPI + perbandingan + komposisi), Transaksi, Per Kategori,
 * Per Dompet & Top, Piutang, Rekap per Rentang, Dompet.
 * The caller passes the active period label/scope; everything else is derived
 * from the transactions and wallets.
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

    // ---- Palette ----
    const INK = 'FF1A2430', SOFT = 'FF5A6878', LINE = 'FFD1D5DB'
    const HEAD = 'FF0E8F84', HEAD_TX = 'FFFFFFFF'
    const POS = 'FF059669', NEG = 'FFDC2626', TRF = 'FF64748B'
    const PIUTANG = 'FF9333EA', TALANGAN = 'FFEA580C'
    const WARN = 'FF8A5B00', WARN_BG = 'FFF6ECD4'
    const ZEBRA = 'FFF4F6F8', KPI_BG = 'FFEAF6F4'

    const BORDER_STYLE: any = { style: 'thin', color: { argb: LINE } }
    const THICK_BORDER: any = { style: 'medium', color: { argb: HEAD } }
    const CELL_BORDER = { top: BORDER_STYLE, left: BORDER_STYLE, bottom: BORDER_STYLE, right: BORDER_STYLE }
    const BOTTOM_THICK = { top: BORDER_STYLE, left: BORDER_STYLE, bottom: THICK_BORDER, right: BORDER_STYLE }
    const TOP_THICK = { top: THICK_BORDER, left: BORDER_STYLE, bottom: BORDER_STYLE, right: BORDER_STYLE }

    const RP_FMT = '"Rp "#,##0'
    const RP_NEG = '"Rp "#,##0;[Red]-"Rp "#,##0'
    const PCT = '0.0%'
    const DELTA = '+0.0%;-0.0%;0.0%'

    const applyBorderToRow = (row: any, colCount: number, borderStyle = CELL_BORDER) => {
      for (let c = 1; c <= colCount; c++) row.getCell(c).border = borderStyle
    }

    const addTitleRow = (ws: any, title: string, colCount: number, subtitle?: string) => {
      const colLetter = String.fromCharCode(64 + colCount)
      ws.mergeCells(`A1:${colLetter}1`)
      const cell = ws.getCell('A1')
      cell.value = title
      cell.font = { bold: true, size: 13, color: { argb: INK } }
      cell.alignment = { horizontal: 'left', vertical: 'middle' }
      ws.getRow(1).height = 24
      if (subtitle) {
        ws.mergeCells(`A2:${colLetter}2`)
        const s = ws.getCell('A2')
        s.value = subtitle
        s.font = { size: 10, color: { argb: SOFT } }
        ws.getRow(2).height = 16
      }
    }

    const addColHeaderRow = (ws: any, headers: string[], rowIdx: number, rights: number[] = []) => {
      const hRow = ws.getRow(rowIdx)
      headers.forEach((h, i) => {
        const c = hRow.getCell(i + 1)
        c.value = h
        c.font = { bold: true, color: { argb: HEAD_TX }, size: 10 }
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEAD } }
        c.alignment = { vertical: 'middle', horizontal: rights.includes(i) ? 'right' : 'left' }
        c.border = BOTTOM_THICK
      })
      hRow.height = 22
      return hRow
    }

    // Jenis label + warna arah dana untuk satu transaksi
    const classify = (t: Transaction) => {
      const isPiutang = t.type === 'pemasukan' && t.is_piutang
      const isTalangan = t.type === 'pengeluaran' && t.is_talangan
      if (isPiutang) return { label: 'Piutang', color: PIUTANG, sign: 1 }
      if (isTalangan) return { label: 'Talangan/Split', color: TALANGAN, sign: -1 }
      if (t.type === 'pemasukan') return { label: 'Pemasukan', color: POS, sign: 1 }
      if (t.type === 'pengeluaran') return { label: 'Pengeluaran', color: NEG, sign: -1 }
      return { label: 'Transfer', color: TRF, sign: 1 }
    }

    // ---- Agregat periode aktif ----
    const totalIn = filteredTransactions.filter(t => t.type === 'pemasukan' && !t.is_piutang).reduce((s, t) => s + t.amount, 0)
    const totalOut = filteredTransactions.filter(t => t.type === 'pengeluaran' && !t.is_talangan).reduce((s, t) => s + t.amount, 0)
    const totalTrf = filteredTransactions.filter(t => t.type === 'topup').reduce((s, t) => s + t.amount, 0)
    const totalPiutangAmt = filteredTransactions.filter(t => t.is_piutang).reduce((s, t) => s + t.amount, 0)
    const bersih = totalIn - totalOut
    const rasio = totalIn > 0 ? bersih / totalIn : 0

    // tanggal span (untuk rata-rata harian)
    const msList = filteredTransactions.map(t => new Date(t.date || t.created_at).getTime()).filter(n => !isNaN(n))
    let periodDays = 30
    if (msList.length >= 2) periodDays = Math.max(1, Math.round((Math.max(...msList) - Math.min(...msList)) / 86400000) + 1)
    const perDay = periodDays > 0 ? totalOut / periodDays : 0
    const expenseTx = filteredTransactions.filter(t => t.type === 'pengeluaran')
    const expenseExclTalangan = filteredTransactions.filter(t => t.type === 'pengeluaran' && !t.is_talangan)
    const avgPerTx = expenseExclTalangan.length ? totalOut / expenseExclTalangan.length : 0
    const top5 = [...expenseTx].sort((a, b) => b.amount - a.amount).slice(0, 5)
    const largestExpense = top5[0]?.amount || 0

    // ======================================================
    // SHEET 1: RINGKASAN (tab pertama; diisi di akhir)
    // ======================================================
    const wsSum = wb.addWorksheet('Ringkasan', { views: [{ showGridLines: false }] })
    wsSum.properties.tabColor = { argb: HEAD }
    wsSum.getColumn(1).width = 3
    wsSum.getColumn(2).width = 32
    wsSum.getColumn(3).width = 18
    wsSum.getColumn(4).width = 16

    // ======================================================
    // SHEET 2: TRANSAKSI (1 kolom Nominal berwarna)
    // ======================================================
    const wsTx = wb.addWorksheet('Transaksi', { views: [{ state: 'frozen', ySplit: 3, showGridLines: false }] })
    wsTx.properties.tabColor = { argb: 'FF165DFF' }
    wsTx.columns = [
      { key: 'date', width: 15 },
      { key: 'type', width: 16 },
      { key: 'category', width: 20 },
      { key: 'account', width: 18 },
      { key: 'amount', width: 18 },
      { key: 'note', width: 30 },
    ]
    addTitleRow(wsTx, 'Transaksi', 6, periodLabel)
    addColHeaderRow(wsTx, ['Tanggal', 'Jenis', 'Kategori', 'Dompet', 'Nominal', 'Catatan'], 3, [4])

    const filteredSorted = [...filteredTransactions].sort(
      (a, b) => new Date(a.date || a.created_at).getTime() - new Date(b.date || b.created_at).getTime()
    )

    filteredSorted.forEach((t, idx) => {
      const walletName = wallets.find(w => w.id === t.wallet_id)?.name || '-'
      const info = classify(t)
      const signed = info.sign < 0 ? -t.amount : t.amount
      const row = wsTx.addRow({
        date: new Date(t.date || t.created_at),
        type: info.label,
        category: t.category || '-',
        account: walletName,
        amount: signed,
        note: t.title || '',
      })
      row.height = 18
      row.getCell('date').numFmt = 'dd mmm yyyy'
      const jc = row.getCell('type')
      jc.font = { bold: true, color: { argb: info.color }, size: 10 }
      jc.alignment = { horizontal: 'center' }
      const nc = row.getCell('amount')
      nc.numFmt = RP_NEG
      // keluar/talangan merah; masuk hijau; piutang/transfer netral
      nc.font = { bold: true, color: { argb: info.sign < 0 ? NEG : (info.label === 'Pemasukan' ? POS : SOFT) } }
      row.getCell('note').font = { italic: true, color: { argb: SOFT } }
      if (idx % 2 === 1) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } }
      applyBorderToRow(row, 6)
    })

    const txTotalRow = wsTx.addRow({ date: 'TOTAL PERIODE', amount: bersih })
    txTotalRow.font = { bold: true }
    txTotalRow.getCell('date').font = { bold: true, color: { argb: INK } }
    txTotalRow.getCell('amount').numFmt = RP_NEG
    txTotalRow.getCell('amount').font = { bold: true, color: { argb: bersih >= 0 ? POS : NEG } }
    applyBorderToRow(txTotalRow, 6, TOP_THICK)
    wsTx.autoFilter = { from: 'A3', to: 'F3' }

    // ======================================================
    // SHEET 3: PER KATEGORI
    // ======================================================
    const wsCat = wb.addWorksheet('Per Kategori', { views: [{ showGridLines: false }] })
    wsCat.properties.tabColor = { argb: 'FFEF4444' }
    wsCat.columns = [
      { key: 'category', width: 24 },
      { key: 'total', width: 20 },
      { key: 'percent', width: 14 },
      { key: 'bar', width: 24 },
    ]
    addTitleRow(wsCat, 'Pengeluaran per Kategori', 4, periodLabel)
    addColHeaderRow(wsCat, ['Kategori', 'Total', '% dari Total', 'Proporsi'], 3, [1, 2])

    const totalExpenseCat = expenseTx.reduce((s, t) => s + t.amount, 0)
    const expByCat: Record<string, number> = {}
    expenseTx.forEach(t => {
      const cat = t.category || 'Lainnya'
      expByCat[cat] = (expByCat[cat] || 0) + t.amount
    })
    const catEntries = Object.entries(expByCat).sort((a, b) => b[1] - a[1])
    catEntries.forEach(([cat, total]) => {
      const pct = totalExpenseCat > 0 ? total / totalExpenseCat : 0
      const row = wsCat.addRow({ category: cat, total, percent: pct, bar: pct })
      row.height = 18
      row.getCell('total').numFmt = RP_FMT
      row.getCell('total').font = { bold: true, color: { argb: NEG } }
      row.getCell('percent').numFmt = PCT
      row.getCell('percent').alignment = { horizontal: 'right' }
      row.getCell('bar').numFmt = PCT
      applyBorderToRow(row, 4)
    })
    if (catEntries.length > 0) {
      wsCat.addConditionalFormatting({
        ref: `D4:D${3 + catEntries.length}`,
        rules: [{ type: 'dataBar', gradient: false, minLength: 0, maxLength: 100, cfvo: [{ type: 'num', value: 0 }, { type: 'num', value: 1 }], color: { argb: HEAD } } as any],
      })
    }

    // ======================================================
    // SHEET 4: PER DOMPET & TOP 5
    // ======================================================
    const wsDompetExp = wb.addWorksheet('Per Dompet & Top', { views: [{ showGridLines: false }] })
    wsDompetExp.properties.tabColor = { argb: 'FF0EA5E9' }
    wsDompetExp.columns = [
      { key: 'c1', width: 20 },
      { key: 'c2', width: 20 },
      { key: 'c3', width: 14 },
      { key: 'c4', width: 24 },
    ]
    addTitleRow(wsDompetExp, 'Pengeluaran per Dompet', 4, periodLabel)
    addColHeaderRow(wsDompetExp, ['Dompet', 'Total Keluar', '% Keluar', 'Proporsi'], 3, [1, 2])

    const expByWallet: Record<string, number> = {}
    expenseTx.forEach(t => {
      const name = wallets.find(w => w.id === t.wallet_id)?.name || '-'
      expByWallet[name] = (expByWallet[name] || 0) + t.amount
    })
    const walletEntries = Object.entries(expByWallet).sort((a, b) => b[1] - a[1])
    walletEntries.forEach(([name, total]) => {
      const pct = totalExpenseCat > 0 ? total / totalExpenseCat : 0
      const row = wsDompetExp.getRow(wsDompetExp.rowCount + 1)
      row.getCell(1).value = name
      row.getCell(2).value = total; row.getCell(2).numFmt = RP_FMT; row.getCell(2).font = { bold: true, color: { argb: NEG } }
      row.getCell(3).value = pct; row.getCell(3).numFmt = PCT; row.getCell(3).alignment = { horizontal: 'right' }
      row.getCell(4).value = pct; row.getCell(4).numFmt = PCT
      row.height = 18
      applyBorderToRow(row, 4)
    })
    if (walletEntries.length > 0) {
      wsDompetExp.addConditionalFormatting({
        ref: `D4:D${3 + walletEntries.length}`,
        rules: [{ type: 'dataBar', gradient: false, minLength: 0, maxLength: 100, cfvo: [{ type: 'num', value: 0 }, { type: 'num', value: 1 }], color: { argb: 'FF0EA5E9' } } as any],
      })
    }

    // Top 5
    const top5HeaderRow = wsDompetExp.rowCount + 2
    const th = wsDompetExp.getRow(top5HeaderRow)
    th.getCell(1).value = 'Top 5 Pengeluaran Terbesar'
    th.getCell(1).font = { bold: true, size: 12, color: { argb: INK } }
    addColHeaderRow(wsDompetExp, ['Tanggal', 'Kategori', 'Nominal', 'Catatan'], top5HeaderRow + 1, [2])
    top5.forEach(t => {
      const row = wsDompetExp.getRow(wsDompetExp.rowCount + 1)
      row.getCell(1).value = new Date(t.date || t.created_at); row.getCell(1).numFmt = 'dd mmm yyyy'
      row.getCell(2).value = t.category || '-'
      row.getCell(3).value = t.amount; row.getCell(3).numFmt = RP_FMT; row.getCell(3).font = { bold: true, color: { argb: NEG } }
      row.getCell(4).value = t.title || '-'; row.getCell(4).font = { italic: true, color: { argb: SOFT } }
      row.height = 18
      applyBorderToRow(row, 4)
    })

    // ======================================================
    // SHEET 5: PIUTANG
    // ======================================================
    const wsPiutang = wb.addWorksheet('Piutang', { views: [{ state: 'frozen', ySplit: 3, showGridLines: false }] })
    wsPiutang.properties.tabColor = { argb: 'FF9333EA' }
    wsPiutang.columns = [
      { key: 'date', width: 15 },
      { key: 'person', width: 20 },
      { key: 'account', width: 18 },
      { key: 'amount', width: 16 },
      { key: 'note', width: 28 },
    ]
    addTitleRow(wsPiutang, 'Piutang', 5, `Belum tertagih · ${periodLabel}`)
    addColHeaderRow(wsPiutang, ['Tanggal', 'Orang', 'Dompet', 'Nominal', 'Catatan'], 3, [3])
    const piutangTx = filteredTransactions.filter(t => t.is_piutang)
      .sort((a, b) => new Date(a.date || a.created_at).getTime() - new Date(b.date || b.created_at).getTime())
    if (piutangTx.length === 0) {
      const noteRow = wsPiutang.getRow(4)
      wsPiutang.mergeCells('A4:E4')
      noteRow.getCell(1).value = 'Tidak ada piutang pada periode ini.'
      noteRow.getCell(1).font = { italic: true, color: { argb: SOFT } }
    } else {
      piutangTx.forEach((t, idx) => {
        const walletName = wallets.find(w => w.id === t.wallet_id)?.name || '-'
        const row = wsPiutang.addRow({
          date: new Date(t.date || t.created_at),
          person: t.piutang_person || '-',
          account: walletName,
          amount: t.amount,
          note: t.title || '-',
        })
        row.height = 18
        row.getCell('date').numFmt = 'dd mmm yyyy'
        row.getCell('amount').numFmt = RP_FMT
        row.getCell('amount').font = { bold: true, color: { argb: PIUTANG } }
        row.getCell('note').font = { italic: true, color: { argb: SOFT } }
        if (idx % 2 === 1) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } }
        applyBorderToRow(row, 5)
      })
      const ptot = wsPiutang.addRow({ date: 'TOTAL PIUTANG', amount: totalPiutangAmt })
      ptot.getCell('date').font = { bold: true, color: { argb: INK } }
      ptot.getCell('amount').numFmt = RP_FMT
      ptot.getCell('amount').font = { bold: true, color: { argb: PIUTANG } }
      applyBorderToRow(ptot, 5, TOP_THICK)
    }

    // ======================================================
    // SHEET 6: REKAP PER RENTANG (dari filter_history)
    // ======================================================
    const wsSummary = wb.addWorksheet('Rekap per Rentang', { views: [{ state: 'frozen', ySplit: 2, showGridLines: false }] })
    wsSummary.properties.tabColor = { argb: 'FF059669' }
    wsSummary.columns = [
      { key: 'range', width: 32 },
      { key: 'income', width: 20 },
      { key: 'expense', width: 20 },
      { key: 'piutang', width: 18 },
      { key: 'talangan', width: 18 },
      { key: 'tabungan', width: 20 },
      { key: 'diff', width: 20 },
    ]
    wsSummary.mergeCells('A1:G1')
    wsSummary.getCell('A1').value = 'Rekap per Rentang Tanggal — Semua Riwayat'
    wsSummary.getCell('A1').font = { bold: true, size: 13, color: { argb: INK } }
    wsSummary.getRow(1).height = 24
    addColHeaderRow(wsSummary, ['Rentang Tanggal', 'Pemasukan', 'Pengeluaran', 'Piutang', 'Talangan', 'Tabungan', 'Selisih'], 2, [1, 2, 3, 4, 5, 6])

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

    const rangeStats: { label: string; income: number; expense: number; diff: number }[] = []

    if (cleanHistory.length === 0) {
      const noteRow = wsSummary.addRow({ range: 'Belum ada history rentang tanggal. Gunakan filter custom minimal 3 hari dan data akan tercatat otomatis.' })
      noteRow.getCell('range').font = { italic: true, color: { argb: SOFT } }
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
        rangeStats.push({ label: rangeLabel, income, expense, diff })

        const anomali = income > 0 && expense > income * 1.4
        const row = wsSummary.addRow({ range: (anomali ? '⚠ ' : '') + rangeLabel, income, expense, piutang, talangan, tabungan, diff })
        row.height = 18
        row.getCell('income').numFmt = RP_FMT
        row.getCell('income').font = { color: { argb: POS } }
        row.getCell('expense').numFmt = RP_FMT
        row.getCell('expense').font = { color: { argb: NEG } }
        row.getCell('piutang').numFmt = RP_FMT
        row.getCell('piutang').font = { color: { argb: PIUTANG } }
        row.getCell('talangan').numFmt = RP_FMT
        row.getCell('talangan').font = { color: { argb: TALANGAN } }
        row.getCell('tabungan').numFmt = RP_NEG
        row.getCell('tabungan').font = { bold: true, color: { argb: POS } }
        row.getCell('diff').numFmt = RP_NEG
        row.getCell('diff').font = { bold: true, color: { argb: diff >= 0 ? HEAD : NEG } }
        if (anomali) {
          for (let c = 1; c <= 7; c++) row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: WARN_BG } }
          row.getCell('range').font = { bold: true, color: { argb: WARN } }
        } else if (idx % 2 === 0) {
          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } }
        }
        applyBorderToRow(row, 7)
      })

      if (cleanHistory.length > 1) {
        const grandDiff = grandIn - grandOut
        const grandRow = wsSummary.addRow({ range: 'TOTAL SEMUA RENTANG', income: grandIn, expense: grandOut, tabungan: grandTabungan, diff: grandDiff })
        grandRow.font = { bold: true }
        grandRow.getCell('range').font = { bold: true, color: { argb: INK } }
        grandRow.getCell('income').numFmt = RP_FMT
        grandRow.getCell('income').font = { bold: true, color: { argb: POS } }
        grandRow.getCell('expense').numFmt = RP_FMT
        grandRow.getCell('expense').font = { bold: true, color: { argb: NEG } }
        grandRow.getCell('tabungan').numFmt = RP_NEG
        grandRow.getCell('tabungan').font = { bold: true, color: { argb: POS } }
        grandRow.getCell('diff').numFmt = RP_NEG
        grandRow.getCell('diff').font = { bold: true, color: { argb: grandDiff >= 0 ? HEAD : NEG } }
        applyBorderToRow(grandRow, 7, TOP_THICK)
      }
    }

    // ======================================================
    // SHEET 7: DOMPET (Grup likuid/tabungan)
    // ======================================================
    const wsWallets = wb.addWorksheet('Dompet', { views: [{ state: 'frozen', ySplit: 3, showGridLines: false }] })
    wsWallets.properties.tabColor = { argb: 'FFF59E0B' }
    wsWallets.columns = [
      { key: 'name', width: 24 },
      { key: 'group', width: 16 },
      { key: 'balance', width: 20 },
    ]
    addTitleRow(wsWallets, 'Saldo Dompet Saat Ini', 3, 'Saldo terkini semua dompet')
    addColHeaderRow(wsWallets, ['Nama Dompet', 'Grup', 'Saldo'], 3, [2])
    const groupOf = (w: Wallet) => (w.category === 'savings' ? 'Tabungan' : 'Likuid')
    const orderedWallets = [...wallets].sort((a, b) => {
      const ga = groupOf(a) === 'Tabungan' ? 0 : 1
      const gb = groupOf(b) === 'Tabungan' ? 0 : 1
      return ga - gb || b.balance - a.balance
    })
    orderedWallets.forEach((w, idx) => {
      const grp = groupOf(w)
      const row = wsWallets.addRow({ name: w.name, group: grp, balance: w.balance })
      row.height = 18
      row.getCell('group').font = { bold: true, size: 10, color: { argb: grp === 'Tabungan' ? HEAD : WARN } }
      row.getCell('balance').numFmt = RP_FMT
      row.getCell('balance').font = { bold: true, color: { argb: INK } }
      if (idx % 2 === 1) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } }
      applyBorderToRow(row, 3)
    })
    const totalBalance = wallets.reduce((s, w) => s + w.balance, 0)
    const likuid = wallets.filter(w => w.category !== 'savings').reduce((s, w) => s + w.balance, 0)
    const tabungan = wallets.filter(w => w.category === 'savings').reduce((s, w) => s + w.balance, 0)
    const walletTotalRow = wsWallets.addRow({ name: 'TOTAL', balance: totalBalance })
    walletTotalRow.getCell('name').font = { bold: true, color: { argb: INK } }
    walletTotalRow.getCell('balance').numFmt = RP_FMT
    walletTotalRow.getCell('balance').font = { bold: true, color: { argb: INK } }
    applyBorderToRow(walletTotalRow, 3, TOP_THICK)

    // ======================================================
    // ISI SHEET RINGKASAN
    // ======================================================
    {
      const ws = wsSum
      ws.mergeCells('B2:D2')
      ws.getCell('B2').value = 'Ringkasan Keuangan'
      ws.getCell('B2').font = { bold: true, size: 18, color: { argb: INK } }
      ws.mergeCells('B3:D3')
      ws.getCell('B3').value = periodLabel
      ws.getCell('B3').font = { size: 11, color: { argb: SOFT } }

      // pembanding: rentang terakhir di riwayat yang bukan periode aktif
      const curKey = periodLabel.toLowerCase()
      let prevStat: typeof rangeStats[number] | null = null
      for (let i = rangeStats.length - 1; i >= 0; i--) {
        const l = rangeStats[i].label.toLowerCase()
        if (!curKey.includes(l) && !l.includes(curKey)) { prevStat = rangeStats[i]; break }
      }
      if (!prevStat && rangeStats.length) prevStat = rangeStats[rangeStats.length - 1]

      const dMasuk = prevStat && prevStat.income ? (totalIn - prevStat.income) / prevStat.income : null
      const dKeluar = prevStat && prevStat.expense ? (totalOut - prevStat.expense) / prevStat.expense : null
      const dBersih = prevStat && prevStat.diff ? (bersih - prevStat.diff) / Math.abs(prevStat.diff) : null

      const boxCell = (c: any, align?: string) => { c.border = CELL_BORDER; c.alignment = { vertical: 'middle', horizontal: align || 'left' } }
      const section = (rowIdx: number, text: string) => {
        const c = ws.getCell(`B${rowIdx}`)
        c.value = text; c.font = { bold: true, size: 10, color: { argb: HEAD } }
      }

      // ARUS KAS
      section(5, 'ARUS KAS')
      const headKpi = ws.getRow(6)
      ;['Metrik', 'Nilai', 'vs Rentang Lalu'].forEach((h, i) => {
        const c = headKpi.getCell(2 + i)
        c.value = h
        c.font = { bold: true, color: { argb: HEAD_TX }, size: 10 }
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEAD } }
        c.alignment = { vertical: 'middle', horizontal: i === 0 ? 'left' : 'right' }
        c.border = BOTTOM_THICK
      })
      headKpi.height = 20
      const kpiRows: [string, number, string, string, number | null][] = [
        ['Pemasukan', totalIn, RP_FMT, POS, dMasuk],
        ['Pengeluaran', totalOut, RP_FMT, NEG, dKeluar],
        ['Arus Kas Bersih', bersih, RP_NEG, INK, dBersih],
        ['Rasio Menabung', rasio, PCT, INK, null],
      ]
      kpiRows.forEach(([lab, v, fmt, col, d], i) => {
        const row = ws.getRow(7 + i)
        row.getCell(2).value = lab; row.getCell(2).font = { bold: true, color: { argb: SOFT } }
        const vc = row.getCell(3); vc.value = v; vc.numFmt = fmt; vc.font = { bold: true, color: { argb: col } }
        if (d !== null && d !== undefined) {
          const dc = row.getCell(4)
          const better = lab === 'Pengeluaran' ? d < 0 : d > 0
          dc.value = d; dc.numFmt = DELTA; dc.font = { bold: true, color: { argb: better ? POS : NEG } }
        } else {
          row.getCell(4).value = '—'; row.getCell(4).font = { color: { argb: SOFT } }
        }
        boxCell(row.getCell(2)); boxCell(row.getCell(3), 'right'); boxCell(row.getCell(4), 'right')
      })
      ws.mergeCells('B11:D11')
      ws.getCell('B11').value = prevStat
        ? `Pembanding: rentang "${prevStat.label}" di riwayat.`
        : 'Pembanding belum ada (butuh minimal 1 rentang di riwayat).'
      ws.getCell('B11').font = { italic: true, size: 9, color: { argb: SOFT } }

      // KECEPATAN BELANJA
      section(13, 'KECEPATAN BELANJA')
      const burnRows: [string, number, string][] = [
        [`Rata-rata Pengeluaran / Hari (±${periodDays} hari)`, perDay, RP_FMT],
        ['Rata-rata per Transaksi', avgPerTx, RP_FMT],
        ['Pengeluaran Terbesar (1 transaksi)', largestExpense, RP_FMT],
      ]
      burnRows.forEach(([lab, v, fmt], i) => {
        const row = ws.getRow(14 + i)
        row.getCell(2).value = lab; row.getCell(2).font = { bold: true, color: { argb: SOFT } }
        const vc = row.getCell(3); vc.value = v; vc.numFmt = fmt; vc.font = { bold: true, color: { argb: INK } }
        ws.mergeCells(`C${14 + i}:D${14 + i}`)
        boxCell(row.getCell(2)); boxCell(row.getCell(3), 'right'); row.getCell(4).border = CELL_BORDER
      })

      // KOMPOSISI KEKAYAAN
      section(18, 'KOMPOSISI KEKAYAAN')
      const headNw = ws.getRow(19)
      ;['Grup', 'Nilai', '% Total'].forEach((h, i) => {
        const c = headNw.getCell(2 + i)
        c.value = h
        c.font = { bold: true, color: { argb: HEAD_TX }, size: 10 }
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEAD } }
        c.alignment = { vertical: 'middle', horizontal: i === 0 ? 'left' : 'right' }
        c.border = BOTTOM_THICK
      })
      const nwRows: [string, number, string][] = [
        ['Likuid (siap pakai)', likuid, WARN],
        ['Tabungan', tabungan, HEAD],
      ]
      nwRows.forEach(([lab, v, col], i) => {
        const row = ws.getRow(20 + i)
        row.getCell(2).value = lab; row.getCell(2).font = { bold: true, color: { argb: col } }
        const vc = row.getCell(3); vc.value = v; vc.numFmt = RP_FMT; vc.font = { bold: true, color: { argb: INK } }
        const pc = row.getCell(4); pc.value = totalBalance ? v / totalBalance : 0; pc.numFmt = PCT
        boxCell(row.getCell(2)); boxCell(row.getCell(3), 'right'); boxCell(row.getCell(4), 'right')
      })
      const nwTot = ws.getRow(22)
      nwTot.getCell(2).value = 'Total Net Worth'; nwTot.getCell(2).font = { bold: true, color: { argb: INK } }
      nwTot.getCell(3).value = totalBalance; nwTot.getCell(3).numFmt = RP_FMT; nwTot.getCell(3).font = { bold: true, color: { argb: INK } }
      nwTot.getCell(4).value = 1; nwTot.getCell(4).numFmt = PCT
      boxCell(nwTot.getCell(2)); boxCell(nwTot.getCell(3), 'right'); boxCell(nwTot.getCell(4), 'right')
      ;[2, 3, 4].forEach(c => { nwTot.getCell(c).border = TOP_THICK })
      if (totalBalance > 0 && likuid / totalBalance < 0.1) {
        ws.mergeCells('B24:D24')
        ws.getCell('B24').value = `⚠ Dana likuid hanya ${(likuid / totalBalance * 100).toFixed(1)}% dari total — tipis untuk kebutuhan mendadak.`
        ws.getCell('B24').font = { bold: true, size: 10, color: { argb: WARN } }
      }

      // GLOSARIUM
      section(26, 'GLOSARIUM')
      const glos: [string, string][] = [
        ['Arus Kas Bersih', 'Pemasukan dikurangi pengeluaran. Transfer antar dompet tidak dihitung.'],
        ['Piutang', 'Uang yang kamu pinjamkan/talangi, belum kembali.'],
        ['Transfer Internal', 'Pindah dana antar dompet sendiri (mis. topup). Bukan belanja.'],
        ['Likuid', 'Saldo siap pakai (dompet non-tabungan).'],
      ]
      glos.forEach(([k, v], i) => {
        const row = ws.getRow(27 + i)
        row.getCell(2).value = k; row.getCell(2).font = { bold: true, size: 10, color: { argb: INK } }
        ws.mergeCells(`C${27 + i}:D${27 + i}`)
        row.getCell(3).value = v; row.getCell(3).font = { size: 9, color: { argb: SOFT } }
        row.getCell(3).alignment = { wrapText: true, vertical: 'middle' }
        row.height = 26
      })
    }

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
