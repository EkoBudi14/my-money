import { Transaction, Wallet, Debt } from '@/types'

interface TransactionRowDesktopProps {
  t: Transaction
  icon: { Icon: any; color: string }
  wallets: Wallet[]
  debts: Debt[]
  deletingId: number | null
  onEdit: (t: Transaction) => void
  onDelete: (id: number) => void
}

// One transaction row in the desktop dashboard history list.
export default function TransactionRowDesktop({
  t,
  icon: { Icon, color },
  wallets,
  debts,
  deletingId,
  onEdit,
  onDelete,
}: TransactionRowDesktopProps) {
  return (
    <div className="flex items-center gap-4 py-[14px] px-6 border-t-2 border-dashed border-[#141414]/20 hover:bg-slate-50 dark:hover:bg-[var(--bg-hover)] transition-all group cursor-pointer" onClick={() => onEdit(t)}>
      <div className={`w-[48px] h-[48px] rounded-[16px] border-[3px] border-[var(--neo-ink)] flex items-center justify-center shrink-0 bg-white ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold text-[var(--text-primary)] truncate">
            {t.type === 'topup' && t.source_wallet_id
              ? `${t.title} (${wallets.find(w => w.id === t.source_wallet_id)?.name || '?'} → ${wallets.find(w => w.id === t.wallet_id)?.name || '?'})`
              : t.title}
          </span>
          {t.is_piutang && (
            <span className="shrink-0 text-[10px] font-black bg-[var(--neo-yellow-vivid)] text-[var(--neo-ink)] px-2 py-0.5 rounded-[6px] border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] tracking-wider">
              💸 Piutang{t.piutang_person ? ` • ${t.piutang_person}` : ''}
            </span>
          )}
          {t.is_talangan && (
            <span className="shrink-0 text-[10px] font-black bg-[var(--neo-pink)] text-[var(--neo-ink)] px-2 py-0.5 rounded-[6px] border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] tracking-wider">
              🤝 Talangan{t.talangan_person ? ` • ${t.talangan_person}` : ''}
            </span>
          )}
          {debts.some(d => d.original_transaction_id === t.id) && (
            <span className="shrink-0 text-[10px] font-black bg-blue-300 text-[var(--neo-ink)] px-2 py-0.5 rounded-[6px] border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] tracking-wider">
              🧑‍🤝‍🧑 Split Bill
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1.5 mt-1">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8C9AAA]">
            <span>{new Date(t.date || t.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
            <span>{new Date(t.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-[6px] bg-[var(--bg-elevated)] border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] text-[var(--neo-ink)] inline-block uppercase tracking-wider">
              {t.category}
            </span>
          </div>
        </div>
      </div>
      <div className="text-right flex flex-col items-end gap-1.5">
        <p className={`text-base font-black tracking-tight ${t.type === 'topup' ? 'text-blue-600' :
          t.type === 'pemasukan'
            ? (t.is_piutang ? 'text-amber-500' : 'text-emerald-600')
            : (t.is_talangan ? 'text-purple-500' : 'text-rose-600')
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
              <div className="w-2.5 h-2.5 border-[2px] border-[var(--neo-ink)] border-t-transparent rounded-full animate-spin"></div>
              Menghapus
            </span>
          ) : 'Hapus'}
        </button>
      </div>
    </div>
  )
}
