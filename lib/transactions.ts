import { supabase } from '@/lib/supabase'
import { getFreshWalletBalance } from '@/lib/queries'

// UI callback contracts (framework-agnostic so any page can supply its own).
type ConfirmFn = (opts: {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'A' | 'B'
  tone?: 'danger' | 'warn'
  details?: string[]
  checkLabel?: string
}) => Promise<boolean>
type ToastFn = (type: 'success' | 'error' | 'warning' | 'info', message: string) => void
type SuccessFn = (opts: { type: 'create' | 'edit' | 'delete' | 'general'; title?: string; message: string }) => void

export interface DeleteTransactionResult {
  deleted: boolean
  billsChanged: boolean
}

const rp = (n: number | null | undefined) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`

/**
 * Delete a transaction and roll back every side effect, exactly like the
 * original dashboard handler:
 *  - restore the wallet balance (fresh read from DB, not local state),
 *  - for a topup, refund the source wallet and remove the linked admin-fee row,
 *  - cascade-handle linked debts (revert a repayment, or delete debts created by
 *    a split bill together with their repayment transactions and balances),
 *  - reset any linked recurring-bill payment (direct link, else by name + month).
 *
 * The caller owns optimistic UI and refetching. This function only touches the
 * database and asks for confirmation through the supplied callbacks. The data
 * behaviour is unchanged from the original; only the dialog/toast copy differs
 * (DESIGN-TAMBAHAN.md §3, §4).
 */
export async function deleteTransactionWithRollback(
  id: number,
  { confirm, toast }: { confirm: ConfirmFn; toast: ToastFn; success?: SuccessFn }
): Promise<DeleteTransactionResult> {
  // Read the transaction up front so the dialog can name the entity and its
  // balance impact. Reads cause no mutation, so this reorder is safe.
  const { data: transaction } = await supabase.from('transactions').select('*').eq('id', id).single()
  if (!transaction) {
    toast('error', 'Transaksi tidak ditemukan.')
    return { deleted: false, billsChanged: false }
  }

  const walletName = transaction.wallet_id
    ? (await supabase.from('wallets').select('name').eq('id', transaction.wallet_id).single()).data?.name || 'dompet'
    : 'dompet'

  // Is this transaction a debt repayment? -> revert debt to pending on delete.
  const { data: linkedDebtPayment } = await supabase
    .from('debts').select('*').eq('payment_transaction_id', id).single()

  // Did this transaction create debts (split bill expense)?
  const { data: createdDebts } = await supabase
    .from('debts').select('*').eq('original_transaction_id', id)
  const paymentTransactionIds = (createdDebts || [])
    .map(d => d.payment_transaction_id)
    .filter(pid => pid !== null) as number[]
  const hasPayments = paymentTransactionIds.length > 0
  const hasCreatedDebts = !!(createdDebts && createdDebts.length > 0)

  // Detect a linked recurring-bill payment so the dialog/toast can name the bill.
  let billName: string | null = null
  if (!hasCreatedDebts && !linkedDebtPayment && transaction.type !== 'topup') {
    const { data: bp } = await supabase.from('bill_payments').select('bill_id').eq('transaction_id', id)
    if (bp && bp.length > 0) {
      const { data: b } = await supabase.from('recurring_bills').select('name').eq('id', bp[0].bill_id).single()
      if (b) billName = b.name
    } else if (transaction.title && transaction.date) {
      const txMonth = new Date(transaction.date).toISOString().slice(0, 7)
      const { data: foundBill } = await supabase.from('recurring_bills').select('id,name').eq('name', transaction.title.trim()).single()
      if (foundBill) {
        const { data: paidRows } = await supabase.from('bill_payments').select('id').eq('bill_id', foundBill.id).eq('month', txMonth)
        if (paidRows && paidRows.length > 0) billName = foundBill.name
      }
    }
  }

  // ── Build the entity-specific confirmation (DESIGN-TAMBAHAN.md §3) ──
  let confirmed: boolean
  if (hasCreatedDebts) {
    const names = createdDebts!.map(d => d.person_name).join(', ')
    const details = [`${createdDebts!.length} piutang (${names}) dihapus`]
    if (hasPayments) details.push(`${paymentTransactionIds.length} pelunasan dibatalkan`)
    details.push('Saldo disesuaikan otomatis')
    confirmed = await confirm({
      title: 'Hapus transaksi dan piutangnya?',
      message: `“${transaction.title}” punya data terkait.`,
      details,
      variant: 'B',
      confirmText: 'Hapus semua',
      cancelText: 'Batal',
    })
  } else if (linkedDebtPayment) {
    confirmed = await confirm({
      title: `Hapus pelunasan dari ${linkedDebtPayment.person_name}?`,
      message: `Piutang ${linkedDebtPayment.person_name} ${rp(transaction.amount)} kembali aktif. Saldo ${walletName} berkurang ${rp(transaction.amount)}.`,
      confirmText: 'Hapus pelunasan',
      cancelText: 'Batal',
    })
  } else if (transaction.type === 'topup') {
    let adminFee = 0
    let sourceName = 'dompet asal'
    if (transaction.source_wallet_id) {
      const srcRes = await supabase.from('wallets').select('name').eq('id', transaction.source_wallet_id).single()
      if (srcRes.data) sourceName = srcRes.data.name
      const { data: adminPreview } = await supabase
        .from('transactions').select('amount')
        .eq('wallet_id', transaction.source_wallet_id)
        .eq('title', 'Biaya Admin').eq('type', 'pengeluaran').eq('date', transaction.date)
        .order('created_at', { ascending: false }).limit(1)
      if (adminPreview && adminPreview.length > 0) adminFee = adminPreview[0].amount
    }
    confirmed = await confirm({
      title: `Hapus transfer “${sourceName} ke ${walletName}”?`,
      message: `Saldo ${sourceName} dan ${walletName} kembali seperti sebelum transfer${adminFee > 0 ? `, termasuk biaya admin ${rp(adminFee)}` : ''}.`,
      confirmText: 'Hapus transfer',
      cancelText: 'Batal',
    })
  } else if (billName) {
    confirmed = await confirm({
      title: `Hapus transaksi “${transaction.title}”?`,
      message: `Tagihan ${billName} kembali berstatus belum dibayar bulan ini. Saldo ${walletName} bertambah ${rp(transaction.amount)}.`,
      confirmText: 'Hapus transaksi',
      cancelText: 'Batal',
    })
  } else {
    const dir = transaction.type === 'pengeluaran' ? 'bertambah' : 'berkurang'
    confirmed = await confirm({
      title: `Hapus transaksi “${transaction.title}”?`,
      message: `Saldo ${walletName} ${dir} lagi ${rp(transaction.amount)}. Transaksi yang dihapus tidak bisa dikembalikan.`,
      confirmText: 'Hapus transaksi',
      cancelText: 'Batal',
    })
  }
  if (!confirmed) return { deleted: false, billsChanged: false }

  // Revert a debt repayment back to pending.
  if (linkedDebtPayment) {
    await supabase.from('debts').update({
      status: 'pending', payment_wallet_id: null, payment_transaction_id: null, paid_at: null,
    }).eq('id', linkedDebtPayment.id)
  }

  // Cascade-delete debts created by a split bill (and their repayments/balances).
  if (hasCreatedDebts) {
    // 1. Rollback balance for repayment transactions first
    if (hasPayments) {
      const { data: paymentTrx } = await supabase.from('transactions').select('*').in('id', paymentTransactionIds)
      if (paymentTrx && paymentTrx.length > 0) {
        for (const p of paymentTrx) {
          const freshBalance = await getFreshWalletBalance(p.wallet_id)
          if (freshBalance !== null) {
            await supabase.from('wallets').update({ balance: freshBalance - p.amount }).eq('id', p.wallet_id)
          }
        }
      }
    }

    // 2. Delete linked debts first (removes FK references)
    const { error: debtDelError } = await supabase.from('debts').delete().eq('original_transaction_id', id)
    if (debtDelError) {
      console.error('Error deleting debts:', debtDelError)
      toast('error', 'Sebagian piutang gagal dihapus. Coba lagi.')
      return { deleted: false, billsChanged: false }
    }

    // 3. Delete repayment transactions
    if (hasPayments) {
      const { error: delError } = await supabase.from('transactions').delete().in('id', paymentTransactionIds)
      if (delError) console.error('Error deleting payment trx:', delError)
    }
  }

  // Delete the transaction
  const { error } = await supabase.from('transactions').delete().eq('id', id)

  if (error) {
    console.error('Error deleting transaction:', error)
    toast('error', 'Transaksi ini masih dipakai data lain, jadi belum bisa dihapus.')
    return { deleted: false, billsChanged: false }
  }

  if (transaction.wallet_id) {
    const freshBalance = await getFreshWalletBalance(transaction.wallet_id)
    if (freshBalance !== null) {
      const restoredBalance = transaction.type === 'pemasukan' || transaction.type === 'topup'
        ? freshBalance - transaction.amount
        : freshBalance + transaction.amount
      await supabase.from('wallets').update({ balance: restoredBalance }).eq('id', transaction.wallet_id)
    }

    if (transaction.type === 'topup' && transaction.source_wallet_id) {
      let adminFeeRollback = 0
      const { data: adminFeeTrx } = await supabase
        .from('transactions').select('*')
        .eq('wallet_id', transaction.source_wallet_id)
        .eq('title', 'Biaya Admin')
        .eq('type', 'pengeluaran')
        .eq('date', transaction.date)
        .order('created_at', { ascending: false })
        .limit(1)
      if (adminFeeTrx && adminFeeTrx.length > 0) {
        adminFeeRollback = adminFeeTrx[0].amount
        await supabase.from('transactions').delete().eq('id', adminFeeTrx[0].id)
      }
      const freshSource = await getFreshWalletBalance(transaction.source_wallet_id)
      if (freshSource !== null) {
        await supabase.from('wallets').update({ balance: freshSource + transaction.amount + adminFeeRollback }).eq('id', transaction.source_wallet_id)
      }
    }
  }

  // Reset any linked recurring-bill payment so the bill status returns to unpaid
  const { data: deletedBills, error: billPayError } = await supabase
    .from('bill_payments').delete().eq('transaction_id', id).select()
  if (billPayError) console.error('Error deleting bill payment:', billPayError)

  // Fallback: match legacy payments by bill name + month
  let finalDeletedBills = deletedBills
  if (!billPayError && (!deletedBills || deletedBills.length === 0)) {
    if (transaction && transaction.title && transaction.date) {
      const txMonth = new Date(transaction.date).toISOString().slice(0, 7)
      const txTitle = transaction.title.trim()
      const { data: foundBill } = await supabase.from('recurring_bills').select('id').eq('name', txTitle).single()
      if (foundBill) {
        const { data: fallbackDeleted, error: fallbackError } = await supabase
          .from('bill_payments').delete().eq('bill_id', foundBill.id).eq('month', txMonth).select()
        if (!fallbackError && fallbackDeleted && fallbackDeleted.length > 0) {
          finalDeletedBills = fallbackDeleted
        }
      }
    }
  }
  const billReset = !!(finalDeletedBills && finalDeletedBills.length > 0)

  // Final success toast (DESIGN-TAMBAHAN.md §4), object + past verb, no emoji.
  let finalMsg = 'Transaksi dihapus'
  if (hasCreatedDebts) finalMsg = `Transaksi dan ${createdDebts!.length} piutang dihapus`
  else if (linkedDebtPayment) finalMsg = `Pelunasan dihapus. Piutang ${linkedDebtPayment.person_name} aktif lagi`
  else if (transaction.type === 'topup') finalMsg = 'Transfer dihapus'
  else if (billReset && billName) finalMsg = `Transaksi dihapus. Tagihan ${billName} belum dibayar lagi`
  toast('success', finalMsg)

  return { deleted: true, billsChanged: true }
}
