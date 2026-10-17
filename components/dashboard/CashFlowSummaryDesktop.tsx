import { TrendingUp, TrendingDown, Wallet as WalletIcon, Eye, EyeOff } from 'lucide-react'

interface CashFlowSummaryDesktopProps {
  currentIncome: number
  totalUsed: number
  showCashFlow: boolean
  onToggle: () => void
  periodLabel: string
}

// Desktop "Ringkasan Arus Kas" card: income vs money used, remaining, and a usage bar.
export default function CashFlowSummaryDesktop({
  currentIncome,
  totalUsed,
  showCashFlow,
  onToggle,
  periodLabel,
}: CashFlowSummaryDesktopProps) {
  return (
    <div className="brutal-card bg-[var(--bg-card)] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-black uppercase tracking-tight text-[var(--text-primary)]">Ringkasan Arus Kas</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">Dari pemasukan, sudah berapa yang digunakan? — {periodLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onToggle} className="p-2 bg-[var(--bg-elevated)] rounded-[10px] border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] text-[var(--text-primary)] hover:-translate-y-px hover:shadow-[3px_3px_0_var(--neo-ink)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all" title={showCashFlow ? 'Sembunyikan angka' : 'Tampilkan angka'}>
            {showCashFlow ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <span className={`text-xs font-black px-3 py-1.5 rounded-[10px] border-2 border-[var(--neo-ink)] shadow-[3px_3px_0_var(--neo-ink)] ${
            (currentIncome - totalUsed) >= 0 ? 'bg-[var(--neo-mint)] text-[var(--neo-ink)]' : 'bg-[var(--neo-peach)] text-[var(--neo-ink)]'
          }`}>
            {(currentIncome - totalUsed) >= 0 ? '✅ Ada Sisa' : '⚠️ Melebihi Pemasukan'}
          </span>
        </div>
      </div>

      {/* 3 Info Boxes — neobrutalism style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Pemasukan */}
        <div className="flex flex-col p-5 bg-[var(--neo-mint)] rounded-[16px] border-[3px] border-[var(--neo-ink)] shadow-[4px_4px_0_var(--neo-ink)] gap-3">
          <div className="flex items-center gap-2">
            <div className="size-9 bg-white border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] rounded-[10px] flex items-center justify-center shrink-0">
              <TrendingUp className="size-5 text-[var(--neo-ink)]" strokeWidth={3} />
            </div>
            <p className="neo-label !text-[var(--neo-ink)]">Total Pemasukan</p>
          </div>
          <p className="neo-amount !text-[var(--neo-ink)] !text-[22px]">
            {showCashFlow ? `Rp ${currentIncome.toLocaleString('id-ID')}` : 'Rp ••••••••'}
          </p>
          <p className="text-[10px] font-bold text-[var(--neo-ink)]/60">Tidak termasuk piutang</p>
        </div>

        {/* Uang Digunakan */}
        <div className="flex flex-col p-5 bg-[var(--neo-peach)] rounded-[16px] border-[3px] border-[var(--neo-ink)] shadow-[4px_4px_0_var(--neo-ink)] gap-3">
          <div className="flex items-center gap-2">
            <div className="size-9 bg-white border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] rounded-[10px] flex items-center justify-center shrink-0">
              <TrendingDown className="size-5 text-[var(--neo-ink)]" strokeWidth={3} />
            </div>
            <p className="neo-label !text-[var(--neo-ink)]">Uang Digunakan</p>
          </div>
          <p className="neo-amount !text-[var(--neo-ink)] !text-[22px]">
            {showCashFlow ? `Rp ${totalUsed.toLocaleString('id-ID')}` : 'Rp ••••••••'}
          </p>
          <p className="text-[10px] font-bold text-[var(--neo-ink)]/60">Pengeluaran + Transfer/Tabungan</p>
        </div>

        {/* Sisa Belum Terpakai */}
        <div className={`flex flex-col p-5 rounded-[16px] border-[3px] border-[var(--neo-ink)] shadow-[4px_4px_0_var(--neo-ink)] gap-3 ${
          (currentIncome - totalUsed) >= 0 ? 'bg-[var(--neo-sky)]' : 'bg-[var(--neo-yellow)]'
        }`}>
          <div className="flex items-center gap-2">
            <div className="size-9 bg-white border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] rounded-[10px] flex items-center justify-center shrink-0">
              <WalletIcon className="size-5 text-[var(--neo-ink)]" strokeWidth={3} />
            </div>
            <p className="neo-label !text-[var(--neo-ink)]">
              {(currentIncome - totalUsed) >= 0 ? 'Sisa Belum Terpakai' : 'Kekurangan'}
            </p>
          </div>
          <p className="neo-amount !text-[var(--neo-ink)] !text-[22px]">
            {showCashFlow ? `Rp ${Math.abs(currentIncome - totalUsed).toLocaleString('id-ID')}` : 'Rp ••••••••'}
          </p>
          <p className="text-[10px] font-bold text-[var(--neo-ink)]/60">
            {(currentIncome - totalUsed) >= 0 ? 'Pemasukan − Uang Digunakan' : 'Outflow melebihi pemasukan'}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex justify-between text-xs font-bold text-[var(--text-secondary)] mb-2">
          <span>Persentase Uang Digunakan dari Pemasukan</span>
          <span className="font-black text-[var(--text-primary)]">
            {currentIncome > 0 ? `${Math.min((totalUsed / currentIncome) * 100, 100).toFixed(1)}%` : '0%'}
          </span>
        </div>
        <div className="h-5 bg-[var(--bg-elevated)] rounded-[8px] border-[3px] border-[var(--neo-ink)] overflow-hidden">
          <div
            className={`h-full transition-all duration-700 ease-out ${
              currentIncome === 0 ? 'bg-slate-300'
              : (totalUsed / currentIncome) > 1 ? 'bg-rose-500'
              : (totalUsed / currentIncome) > 0.8 ? 'bg-rose-400'
              : (totalUsed / currentIncome) > 0.5 ? 'bg-amber-400'
              : 'bg-emerald-400'
            }`}
            style={{ width: currentIncome > 0 ? `${Math.min((totalUsed / currentIncome) * 100, 100)}%` : '0%' }}
          />
        </div>
        <div className="flex justify-between text-[10px] mt-2">
          <span className="text-[var(--text-secondary)]">0%</span>
          <span className={`font-black uppercase tracking-wide ${
            currentIncome === 0 ? 'text-slate-400'
            : (totalUsed / currentIncome) > 0.8 ? 'text-rose-600'
            : (totalUsed / currentIncome) > 0.5 ? 'text-amber-600'
            : 'text-emerald-600'
          }`}>
            {currentIncome === 0 ? '— Belum ada pemasukan'
              : (totalUsed / currentIncome) > 1 ? '🔴 Outflow melebihi pemasukan!'
              : (totalUsed / currentIncome) > 0.8 ? '⚠️ Hampir habis — perhatikan!'
              : (totalUsed / currentIncome) > 0.5 ? '👀 Lebih dari 50% sudah digunakan'
              : '✅ Masih terkendali'}
          </span>
          <span className="text-[var(--text-secondary)]">100%</span>
        </div>
      </div>
    </div>
  )
}
