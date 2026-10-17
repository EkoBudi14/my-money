import { supabase } from '@/lib/supabase'
import { getFreshWalletBalance } from '@/lib/queries'

// UI callback contracts (framework-agnostic so any page can supply its own).
type ConfirmFn = (opts: { title: string; message: string; confirmText: string; cancelText: string }) => Promise<boolean>
type ToastFn = (type: 'success' | 'error' | 'warning' | 'info', message: string) => void
type SuccessFn = (opts: { type: 'create' | 'edit' | 'delete' | 'general'; title?: string; message: string }) => void

export interface DeleteTransactionResult {
  deleted: boolean
  billsChanged: boolean
}

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
 * database and asks for confirmation through the supplied callbacks.
 */
export async function deleteTransactionWithRollback(
  id: number,
  { confirm, toast, success }: { confirm: ConfirmFn; toast: ToastFn; success: SuccessFn }
): Promise<DeleteTransactionResult> {
  const confirmed = await confirm({
    title: 'Hapus Transaksi?',
    message: 'Saldo dompet akan dikembalikan otomatis. Tindakan ini tidak dapat dibatalkan.',
    confirmText: 'Ya, Hapus',
    cancelText: 'Batal',
  })
  if (!confirmed) return { deleted: false, billsChanged: false }

  // Get transaction before delete to rollback balance
  const { data: transaction } = await supabase.from('transactions').select('*').eq('id', id).single()
  if (!transaction) {
    toast('error', 'Transaksi tidak ditemukan')
    return { deleted: false, billsChanged: false }
  }

  // Check if this transaction is a Debt Payment (Income) -> revert debt to pending
  const { data: linkedDebtPayment } = await supabase
    .from('debts').select('*').eq('payment_transaction_id', id).single()
  if (linkedDebtPayment) {
    await supabase.from('debts').update({
      status: 'pending', payment_wallet_id: null, payment_transaction_id: null, paid_at: null,
    }).eq('id', linkedDebtPayment.id)
  }

  // Check if this transaction created debts (split bill expense)
  const { data: createdDebts } = await supabase
    .from('debts').select('*').eq('original_transaction_id', id)

  if (createdDebts && createdDebts.length > 0) {
    const paymentTransactionIds = createdDebts
      .map(d => d.payment_transaction_id)
      .filter(pid => pid !== null) as number[]
    const hasPayments = paymentTransactionIds.length > 0

    const confirmMessage = hasPayments
      ? `Transaksi ini memiliki ${createdDebts.length} data piutang dan ${paymentTransactionIds.length} pelunasan yang sudah tercatat. Menghapus ini akan membatalkan pelunasan, mengembalikan saldo dompet, dan menghapus piutang. Lanjutkan?`
      : `Transaksi ini memiliki ${createdDebts.length} data piutang terkait. Menghapus transaksi ini akan menghapus data piutang tersebut juga. Lanjutkan?`

    const confirmDelete = await confirm({
      title: 'Hapus Transaksi & Piutang?',
      message: confirmMessage,
      confirmText: 'Ya, Hapus Semua',
      cancelText: 'Batal',
    })
    if (!confirmDelete) return { deleted: false, billsChanged: false }

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
      toast('error', 'Gagal menghapus sebagian data piutang')
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

  if (!error) {
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
    success({ type: 'delete', message: 'Transaksi berhasil dihapus dan saldo dompet dikembalikan.' })
  } else {
    console.error('Error deleting transaction:', error)
    toast('error', 'Gagal menghapus transaksi (mungkin terikat data lain)')
    return { deleted: false, billsChanged: false }
  }

  // Reset any linked recurring-bill payment so the bill status returns to unpaid
  let billsChanged = false
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

  if (finalDeletedBills && finalDeletedBills.length > 0) {
    toast('success', 'Status tagihan terkait berhasil di-reset!')
  }
  // Mirror original: always signal a bills refresh after a successful delete.
  billsChanged = true

  return { deleted: true, billsChanged }
}
