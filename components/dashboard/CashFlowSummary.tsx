import { TrendingUp, TrendingDown, Wallet as WalletIcon, Eye, EyeOff } from 'lucide-react'

interface CashFlowSummaryProps {
  currentIncome: number
  totalUsed: number
  showCashFlow: boolean
  onToggle: () => void
}

// Mobile "Ringkasan Arus Kas" card: income vs money used, remaining, and a usage bar.
export default function CashFlowSummary({ currentIncome, totalUsed, showCashFlow, onToggle }: CashFlowSummaryProps) {
  return (
    <div className="mx-4 mt-4 brutal-card bg-[var(--bg-card)] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="neo-label">Ringkasan Arus Kas</p>
          <p className="text-[10px] text-[var(--text-secondary)]">Dari pemasukan, sudah berapa yang digunakan?</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onToggle} className="p-1.5 bg-[var(--bg-card)] rounded-[10px] border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] text-[var(--text-primary)] hover:-translate-y-px hover:shadow-[3px_3px_0_var(--neo-ink)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all">
            {showCashFlow ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <span className={`text-[9px] font-black px-2 py-1 rounded-[8px] border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] ${(currentIncome - totalUsed) >= 0 ? 'bg-[var(--neo-mint)] text-[var(--neo-ink)]' : 'bg-[var(--neo-peach)] text-[var(--neo-ink)]'}`}>
            {(currentIncome - totalUsed) >= 0 ? '✅ Ada Sisa' : '⚠️ Melebihi'}
          </span>
        </div>
      </div>

      {/* 3 rows */}
      <div className="flex flex-col gap-2.5 mb-3">
        {/* Pemasukan row */}
        <div className="flex items-center justify-between p-3 bg-[var(--neo-mint)] rounded-[12px] border-[3px] border-[var(--neo-ink)] shadow-[3px_3px_0_var(--neo-ink)]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white rounded-[8px] border-2 border-[var(--neo-ink)] flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-[var(--neo-ink)]" strokeWidth={3} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--neo-ink)]">Pemasukan</p>
              <p className="text-[9px] text-[var(--neo-ink)]/60">Tidak incl. piutang</p>
            </div>
          </div>
          <p className="font-black text-base text-[var(--neo-ink)] tracking-tight">
            {showCashFlow ? `Rp ${currentIncome.toLocaleString('id-ID')}` : 'Rp ••••••'}
          </p>
        </div>

        {/* Uang Digunakan row */}
        <div className="flex items-center justify-between p-3 bg-[var(--neo-peach)] rounded-[12px] border-[3px] border-[var(--neo-ink)] shadow-[3px_3px_0_var(--neo-ink)]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white rounded-[8px] border-2 border-[var(--neo-ink)] flex items-center justify-center shrink-0">
              <TrendingDown className="w-4 h-4 text-[var(--neo-ink)]" strokeWidth={3} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--neo-ink)]">Uang Digunakan</p>
              <p className="text-[9px] text-[var(--neo-ink)]/60">Pengeluaran + Transfer</p>
            </div>
          </div>
          <p className="font-black text-base text-[var(--neo-ink)] tracking-tight">
            {showCashFlow ? `Rp ${totalUsed.toLocaleString('id-ID')}` : 'Rp ••••••'}
          </p>
        </div>

        {/* Sisa row */}
        <div className={`flex items-center justify-between p-3 rounded-[12px] border-[3px] border-[var(--neo-ink)] shadow-[3px_3px_0_var(--neo-ink)] ${
          (currentIncome - totalUsed) >= 0 ? 'bg-[var(--neo-sky)]' : 'bg-[var(--neo-yellow)]'
        }`}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white rounded-[8px] border-2 border-[var(--neo-ink)] flex items-center justify-center shrink-0">
              <WalletIcon className="w-4 h-4 text-[var(--neo-ink)]" strokeWidth={3} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--neo-ink)]">
                {(currentIncome - totalUsed) >= 0 ? 'Sisa Belum Terpakai' : 'Kekurangan'}
              </p>
              <p className="text-[9px] text-[var(--neo-ink)]/60">
                {(currentIncome - totalUsed) >= 0 ? 'Pemasukan − Digunakan' : 'Outflow > Pemasukan'}
              </p>
            </div>
          </div>
          <p className="font-black text-base text-[var(--neo-ink)] tracking-tight">
            {showCashFlow ? `Rp ${Math.abs(currentIncome - totalUsed).toLocaleString('id-ID')}` : 'Rp ••••••'}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex justify-between text-[10px] font-bold text-[var(--text-secondary)] mb-1.5">
          <span>Uang Digunakan dari Pemasukan</span>
          <span className="text-[var(--text-primary)] font-black">
            {currentIncome > 0 ? `${Math.min((totalUsed / currentIncome) * 100, 100).toFixed(1)}%` : '0%'}
          </span>
        </div>
        <div className="h-3.5 bg-[var(--bg-elevated)] rounded-[6px] border-[3px] border-[var(--neo-ink)] overflow-hidden">
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
        <p className={`text-[9px] font-black mt-1.5 text-center uppercase tracking-wide ${
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
        </p>
      </div>
    </div>
  )
}
