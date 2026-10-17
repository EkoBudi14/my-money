import { Transaction, Wallet, Debt } from '@/types'

interface TransactionRowMobileProps {
  t: Transaction
  icon: { Icon: any; color: string }
  wallets: Wallet[]
  debts: Debt[]
  deletingId: number | null
  isLast: boolean
  onEdit: (t: Transaction) => void
  onDelete: (id: number) => void
}

// One transaction row in the mobile dashboard history list.
export default function TransactionRowMobile({
  t,
  icon: { Icon, color },
  wallets,
  debts,
  deletingId,
  isLast,
  onEdit,
  onDelete,
}: TransactionRowMobileProps) {
  return (
    <div
      onClick={() => onEdit(t)}
      className={`flex items-center gap-3 px-4 py-4 active:bg-slate-50 dark:active:bg-[var(--bg-hover)] dark:bg-[var(--bg-page)] cursor-pointer transition-colors ${!isLast ? 'border-b border-[var(--border-default)]' : ''}`}
    >
      <div className={`w-11 h-11 rounded-[12px] border-[3px] border-[var(--neo-ink)] flex items-center justify-center shrink-0 bg-white ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <p className="font-semibold text-[var(--text-primary)] text-sm truncate max-w-[140px]">
            {t.type === 'topup' && t.source_wallet_id
              ? `${t.title} (${wallets.find(w => w.id === t.source_wallet_id)?.name || '?'} → ${wallets.find(w => w.id === t.wallet_id)?.name || '?'})`
              : t.title}
          </p>
          {t.is_piutang && (
            <span className="text-[9px] font-black bg-[var(--neo-yellow-vivid)] text-[var(--neo-ink)] px-1.5 py-0.5 rounded-[6px] border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] shrink-0 tracking-wider">💸 Piutang</span>
          )}
          {t.is_talangan && (
            <span className="text-[9px] font-black bg-[var(--neo-pink)] text-[var(--neo-ink)] px-1.5 py-0.5 rounded-[6px] border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] shrink-0 tracking-wider">🤝 Talangan</span>
          )}
          {debts.some(d => d.original_transaction_id === t.id) && (
            <span className="text-[9px] font-black bg-blue-300 text-[var(--neo-ink)] px-1.5 py-0.5 rounded-[6px] border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] shrink-0 tracking-wider">🧑‍🤝‍🧑 Split Bill</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-[#8C9AAA] mb-1">
          <span>{new Date(t.date || t.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
          <span>{new Date(t.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <span className="text-[9px] font-black px-2 py-0.5 rounded-[6px] bg-[var(--bg-elevated)] border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] text-[var(--neo-ink)] uppercase tracking-wider inline-block mt-0.5">
          {t.category}
        </span>
      </div>
      <div className="text-right flex flex-col items-end shrink-0 ml-2">
        <p className={`font-black tracking-tight text-sm mb-1.5 mt-1 ${t.type === 'topup' ? 'text-blue-600' :
          t.type === 'pemasukan' ? (t.is_piutang ? 'text-amber-500' : 'text-emerald-600') :
            (t.is_talangan ? 'text-purple-500' : 'text-rose-600')
          }`}>
          {t.type === 'pengeluaran' ? '-' : '+'} Rp {t.amount.toLocaleString('id-ID')}
        </p>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(t.id); }}
          disabled={deletingId === t.id}
          className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-[6px] border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] transition-all ${deletingId === t.id ? 'bg-slate-200 text-slate-500 cursor-not-allowed translate-y-[2px] shadow-none' : 'bg-rose-300 text-[var(--neo-ink)] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_var(--neo-ink)] active:translate-y-[2px] active:shadow-none'}`}
        >
          {deletingId === t.id ? (
            <span className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 border-[2px] border-[var(--neo-ink)] border-t-transparent rounded-full animate-spin" />
              Menghapus
            </span>
          ) : 'Hapus'}
        </button>
      </div>
    </div>
  )
}
