'use client'
import React, { useState, useMemo, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, Trash2, Pencil, CheckCircle2, X } from 'lucide-react'
import { getRecurringBills } from '@/lib/recurring-bills'
import { RecurringBill, CalendarEvent, Wallet } from '@/types'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/hooks/useConfirm'
import AddEventModal from './AddEventModal'
import MoneyInput from './MoneyInput'
import NeoSelect from './NeoSelect'
import DatePickerNeo from './DatePickerNeo'

interface Holiday {
    date: string
    name: string
    type: string
}

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const MONTHS = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

interface CalendarCardProps {
    refreshTrigger?: number
    onUpdate?: () => void
}

export default function CalendarCard({ refreshTrigger = 0, onUpdate }: CalendarCardProps) {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [holidays, setHolidays] = useState<Holiday[]>([])
    const [recurringBills, setRecurringBills] = useState<RecurringBill[]>([])
    const [loading, setLoading] = useState(false)
    const [currentTime, setCurrentTime] = useState(new Date())
    const [isMounted, setIsMounted] = useState(false)

    const [events, setEvents] = useState<CalendarEvent[]>([])
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
    const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false)
    const [billPayments, setBillPayments] = useState<Record<number, boolean>>({})
    
    // Payment Modal State
    const [wallets, setWallets] = useState<Wallet[]>([])
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [selectedPaymentBill, setSelectedPaymentBill] = useState<RecurringBill | null>(null)
    const [selectedWalletId, setSelectedWalletId] = useState<number | null>(null)
    const [paymentAmount, setPaymentAmount] = useState<string>('')
    const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0])
    const [payingBillId, setPayingBillId] = useState<number | null>(null)
    
    const { showToast } = useToast()
    const { showConfirm } = useConfirm()

    // Prevent hydration mismatch
    useEffect(() => {
        setIsMounted(true)
    }, [])

    // Update time
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date())
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    const fetchEvents = async () => {
        const { data } = await supabase
            .from('calendar_events')
            .select('*')
        if (data) setEvents(data)
    }

    const checkBillPayments = async () => {
        const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}` // YYYY-MM
        const { data } = await supabase
            .from('bill_payments')
            .select('bill_id')
            .eq('month', currentMonth)
        
        const paymentsMap: Record<number, boolean> = {}
        data?.forEach(p => paymentsMap[p.bill_id] = true)
        setBillPayments(paymentsMap)
    }

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                const year = currentDate.getFullYear()
                
                // Fetch Holidays
                const holidaysRes = await fetch(`/api/holidays?year=${year}`)
                const holidaysData = await holidaysRes.json()
                setHolidays(holidaysData.holidays || [])

                // Fetch Recurring Bills
                const billsData = await getRecurringBills()
                setRecurringBills(billsData)

                // Fetch Events
                await fetchEvents()

                // Check Bill Payments
                await checkBillPayments()

                // Fetch Wallets
                const { data: walletsData } = await supabase.from('wallets').select('*')
                setWallets(walletsData || [])

            } catch (error) {
                console.error('Error fetching calendar data:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [currentDate.getFullYear(), currentDate.getMonth(), refreshTrigger])

    const handleCalendarPayBill = (bill: RecurringBill) => {
        setSelectedPaymentBill(bill)
        setPaymentAmount(bill.amount.toString())
        setPaymentDate(new Date().toISOString().split('T')[0])
        setSelectedWalletId(null)
        setShowPaymentModal(true)
    }

    const isPemasukan = (bill: RecurringBill) => bill.type === 'pemasukan'

    const handleConfirmCalendarPayment = async () => {
        if (!selectedPaymentBill || !selectedWalletId || !paymentAmount || !paymentDate) return
        
        const amountNum = parseFloat(paymentAmount)
        if (isNaN(amountNum) || amountNum <= 0) {
            showToast('error', 'Jumlah tidak valid')
            return
        }
        
        const isIncome = isPemasukan(selectedPaymentBill)

        // Fetch saldo terbaru dari DB (anti race condition)
        const { data: freshWalletData, error: walletFetchError } = await supabase
            .from('wallets')
            .select('balance')
            .eq('id', selectedWalletId)
            .single()

        if (walletFetchError || !freshWalletData) {
            showToast('error', 'Gagal memverifikasi saldo dompet')
            return
        }

        const freshBalance = freshWalletData.balance

        // Cek saldo hanya untuk pengeluaran
        if (!isIncome && freshBalance < amountNum) {
            const walletName = wallets.find(w => w.id === selectedWalletId)?.name || 'Dompet'
            showToast('error', `Saldo tidak mencukupi! Saldo ${walletName}: Rp ${freshBalance.toLocaleString('id-ID')}`)
            return
        }
        
        setPayingBillId(selectedPaymentBill.id)
        try {
            const safePaymentDate = new Date(`${paymentDate}T12:00:00`).toISOString()
            const paymentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
            
            // Buat transaksi sesuai tipe bill (pemasukan atau pengeluaran)
            const { data: txData, error: txError } = await supabase.from('transactions').insert({
                title: selectedPaymentBill.name,
                amount: amountNum,
                type: isIncome ? 'pemasukan' : 'pengeluaran',
                category: selectedPaymentBill.category,
                wallet_id: selectedWalletId,
                date: safePaymentDate,
                created_at: new Date().toISOString()
            }).select().single()
            
            if (txError) throw txError
            if (!txData) throw new Error('Transaction created but no data returned')

            // Update saldo: pemasukan tambah, pengeluaran kurang
            const newBalance = isIncome
                ? freshBalance + amountNum
                : freshBalance - amountNum
            
            await supabase.from('wallets').update({
                balance: newBalance
            }).eq('id', selectedWalletId)
            
            await supabase.from('bill_payments').insert({
                bill_id: selectedPaymentBill.id,
                month: paymentMonth,
                paid_at: new Date().toISOString(),
                transaction_id: txData.id
            })
            
            showToast('success', isIncome ? `Pemasukan ${selectedPaymentBill.name} dicatat` : `Tagihan ${selectedPaymentBill.name} dibayar`)

            // Refresh data
            const { data: walletsData } = await supabase.from('wallets').select('*')
            setWallets(walletsData || [])
            await checkBillPayments()
            if (onUpdate) onUpdate()
            
            setShowPaymentModal(false)
        } catch (error) {
            console.error(error)
            showToast('error', isIncome ? 'Pemasukan gagal dicatat. Coba lagi.' : 'Tagihan gagal dibayar. Coba lagi.')
        } finally {
            setPayingBillId(null)
        }
    }

    const handleDeleteBillPayment = async (billId: number) => {
        const billRef = recurringBills.find(b => b.id === billId)
        const billLabel = billRef?.name ?? 'tagihan'
        const confirmed = await showConfirm({
            title: `Batalkan pembayaran ${billLabel}?`,
            message: 'Transaksi pembayaran dihapus dan saldonya dikembalikan ke dompet. Tagihan kembali berstatus belum dibayar.',
            confirmText: 'Batalkan bayar',
            cancelText: 'Kembali',
            tone: 'warn',
        })

        if (!confirmed) return

        try {
            const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
            
            // 1. Get the payment record to find transaction_id
            const { data: existingPayment } = await supabase
                .from('bill_payments')
                .select('*')
                .eq('bill_id', billId)
                .eq('month', currentMonth)
                .single()
            
            if (existingPayment?.transaction_id) {
                // 2. Fetch transaction to get amount and wallet
                const { data: transaction } = await supabase
                    .from('transactions')
                    .select('*')
                    .eq('id', existingPayment.transaction_id)
                    .single()
                
                if (transaction) {
                    // 3. Refund wallet
                    const { data: wallet } = await supabase
                        .from('wallets')
                        .select('balance')
                        .eq('id', transaction.wallet_id)
                        .single()
                        
                    if (wallet) {
                        await supabase.from('wallets').update({
                            balance: wallet.balance + transaction.amount
                        }).eq('id', transaction.wallet_id)
                    }

                    // 4. Delete transaction
                    await supabase.from('transactions').delete().eq('id', transaction.id)
                }
            }

            // 5. Delete bill payment record
            const { error } = await supabase
                .from('bill_payments')
                .delete()
                .eq('bill_id', billId)
                .eq('month', currentMonth)

            if (error) throw error
            
            showToast('success', `Pembayaran ${billLabel} dibatalkan`)

            // Refresh data
            const { data: walletsData } = await supabase.from('wallets').select('*')
            setWallets(walletsData || [])
            await checkBillPayments()
            if (onUpdate) onUpdate()

        } catch (error) {
            console.error('Error deleting bill payment:', error)
            showToast('error', 'Pembayaran gagal dibatalkan. Coba lagi.')
        }
    }

    const { daysInMonth, firstDayOfMonth, monthName, year, holidaysInMonth, billsInMonth } = useMemo(() => {
        const year = currentDate.getFullYear()
        const month = currentDate.getMonth()
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)

        // Holidays
        const monthHolidays = holidays.filter((h) => {
            const d = new Date(h.date)
            return d.getMonth() === month && d.getFullYear() === year
        })

        // Bills (Recurring every month)
        // We just need to map the bills to the days in this month
        // But we should check if the day exists in this month (e.g. 30th in Feb)
        const daysInThisMonth = lastDay.getDate()
        
        return {
            daysInMonth: daysInThisMonth,
            firstDayOfMonth: firstDay.getDay(),
            monthName: MONTHS[month],
            year,
            holidaysInMonth: monthHolidays,
            billsInMonth: recurringBills
        }
    }, [currentDate, holidays, recurringBills])

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    }

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    }

    const handleDateClick = (day: number) => {
        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
        setSelectedDate(newDate)
    }

    const handleEditEvent = (event: CalendarEvent) => {
        setSelectedEvent(event)
        setIsAddEventModalOpen(true)
    }

    const handleDeleteEvent = async (id: number) => {
        const event = events.find(e => e.id === id)
        const tgl = event ? new Date(`${event.date}T12:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : ''
        const confirmed = await showConfirm({
            title: `Hapus agenda “${event?.title ?? ''}”?`,
            message: `Agenda tanggal ${tgl} dihapus permanen.`,
            confirmText: 'Hapus agenda',
            cancelText: 'Batal'
        })

        if (!confirmed) return

        const { error } = await supabase
            .from('calendar_events')
            .delete()
            .eq('id', id)

        if (!error) {
            showToast('success', 'Agenda dihapus')
            fetchEvents()
        } else {
            showToast('error', 'Agenda gagal dihapus. Coba lagi.')
        }
    }

    // Grid Generation
    const grid = []
    for (let i = 0; i < firstDayOfMonth; i++) grid.push(null)
    for (let i = 1; i <= daysInMonth; i++) grid.push(i)

    // Helpers to get data for a specific day
    const getDayData = (day: number) => {
        const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        const holiday = holidaysInMonth.find(h => h.date === dateStr)
        const bills = recurringBills.filter(b => b.due_date === day)
        const dayEvents = events.filter(e => e.date === dateStr)
        
        return { holiday, bills, dayEvents }
    }

    // Selected Date Info
    const selectedDayData = selectedDate ? getDayData(selectedDate.getDate()) : null
    const isToday = (day: number) => {
        const now = new Date()
        return day === now.getDate() && currentDate.getMonth() === now.getMonth() && currentDate.getFullYear() === now.getFullYear()
    }
    
    // Default show today's info if nothing selected
    const todayDate = new Date()
    const showTodayInfo = !selectedDate && currentDate.getMonth() === todayDate.getMonth() && currentDate.getFullYear() === todayDate.getFullYear()
    const displayDate = selectedDate || (showTodayInfo ? todayDate : null)
    const displayData = displayDate ? getDayData(displayDate.getDate()) : null

    const handleAddClick = () => {
        setSelectedEvent(null)
        setIsAddEventModalOpen(true)
    }

    const dotColor = (c: CalendarEvent['color']) =>
        c === 'blue' ? '#3B82F6' : c === 'green' ? 'var(--income)' : c === 'yellow' ? '#F59E0B' : c === 'purple' ? '#8B5CF6' : 'var(--danger)'

    return (
        <div className="card stack-12">
            {/* Live clock */}
            <div className="stack" style={{ textAlign: 'center', gap: 2, borderBottom: '1px solid var(--divider)', paddingBottom: 12 }}>
                <div className="num-l" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {isMounted
                        ? `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}:${String(currentTime.getSeconds()).padStart(2, '0')}`
                        : '--:--:--'}
                </div>
                <div className="sub" style={{ textTransform: 'capitalize' }}>
                    {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
            </div>

            {/* Header */}
            <div className="between">
                <div className="hstack" style={{ gap: 8 }}>
                    <div className="ic-s c-transfer"><CalendarIcon className="i i-s" /></div>
                    <div><h2 className="h2">Kalender</h2><div className="sub">{monthName} {year}</div></div>
                </div>
                <div className="hstack" style={{ gap: 6 }}>
                    <button className="icon-btn ghost" style={{ width: 36, height: 36 }} aria-label="Bulan sebelumnya" onClick={prevMonth}><ChevronLeft className="i i-s" /></button>
                    <button className="icon-btn ghost" style={{ width: 36, height: 36 }} aria-label="Bulan berikutnya" onClick={nextMonth}><ChevronRight className="i i-s" /></button>
                </div>
            </div>

            {/* Grid */}
            <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', textAlign: 'center' }}>
                    {DAYS.map(d => <div key={d} className="lbl" style={{ padding: '4px 0', fontWeight: 700 }}>{d}</div>)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
                    {grid.map((day, idx) => {
                        if (day === null) return <div key={`e-${idx}`} />
                        const { holiday, bills, dayEvents } = getDayData(day)
                        const today = isToday(day)
                        const selected = selectedDate?.getDate() === day && selectedDate?.getMonth() === currentDate.getMonth()
                        const dow = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).getDay()
                        const isNat = holiday?.type === 'National holiday'
                        let color: string | undefined
                        if (!selected) {
                            if (isNat || dow === 0) color = 'var(--danger)'
                            else if (today) color = 'var(--accent)'
                        }
                        return (
                            <button
                                key={day}
                                onClick={() => handleDateClick(day)}
                                style={{
                                    aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    gap: 3, border: today && !selected ? '1px solid var(--accent)' : '1px solid transparent',
                                    borderRadius: 10, background: selected ? 'var(--accent)' : 'transparent',
                                    color: selected ? 'var(--on-accent)' : color || 'var(--text)', fontSize: 13, fontWeight: 700, padding: 0,
                                }}
                            >
                                {day}
                                <span style={{ display: 'flex', gap: 2, height: 5 }}>
                                    {bills.length > 0 && <span style={{ width: 5, height: 5, borderRadius: 3, background: selected ? 'var(--on-accent)' : '#3B82F6' }} />}
                                    {holiday && <span style={{ width: 5, height: 5, borderRadius: 3, background: selected ? 'var(--on-accent)' : 'var(--danger)' }} />}
                                    {dayEvents.length > 0 && <span style={{ width: 5, height: 5, borderRadius: 3, background: selected ? 'var(--on-accent)' : 'var(--income)' }} />}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Detail panel */}
            {displayDate ? (
                <div className="stack-12" style={{ borderTop: '1px solid var(--divider)', paddingTop: 12 }}>
                    <div className="between">
                        <div className="date-h" style={{ padding: 0 }}>{displayDate.getDate()} {MONTHS[displayDate.getMonth()]}</div>
                        <button className="btn-2" style={{ height: 36, fontSize: 13 }} onClick={handleAddClick}><Pencil className="i i-s" />Agenda</button>
                    </div>

                    {displayData?.holiday && (
                        <div className="hstack" style={{ gap: 10, alignItems: 'flex-start', background: 'var(--danger-tint)', borderRadius: 12, padding: 12 }}>
                            <div className="ic-s" style={{ background: 'transparent', color: 'var(--danger-text)' }}><CalendarIcon className="i i-s" /></div>
                            <div><div className="t" style={{ color: 'var(--danger-text)' }}>{displayData.holiday.name}</div><div className="meta" style={{ color: 'var(--danger-text)' }}>{displayData.holiday.type}</div></div>
                        </div>
                    )}

                    {displayData?.dayEvents?.map(event => (
                        <div className="card hstack" key={event.id} style={{ gap: 10, alignItems: 'flex-start', padding: 12 }}>
                            <span style={{ marginTop: 4, width: 10, height: 10, borderRadius: 3, background: dotColor(event.color), flex: 'none' }} />
                            <div className="grow">
                                <div className="t" style={{ whiteSpace: 'normal' }}>{event.title}</div>
                                <div className="lbl">{event.type === 'reminder' ? 'Pengingat' : 'Catatan'}</div>
                            </div>
                            <button className="icon-btn ghost" style={{ width: 34, height: 34 }} aria-label="Ubah agenda" onClick={() => handleEditEvent(event)}><Pencil className="i i-s" /></button>
                            <button className="icon-btn ghost" style={{ width: 34, height: 34, color: 'var(--danger)' }} aria-label="Hapus agenda" onClick={() => handleDeleteEvent(event.id)}><Trash2 className="i i-s" /></button>
                        </div>
                    ))}

                    {displayData?.bills?.map(bill => {
                        const isPaid = billPayments[bill.id]
                        const income = isPemasukan(bill)
                        return (
                            <div className="card between" key={bill.id} style={{ padding: 12, opacity: isPaid ? 0.75 : 1 }}>
                                <div className="hstack" style={{ gap: 10 }}>
                                    <div className={`ic-s ${income ? 'c-gaji' : 'c-tagihan'}`}>{isPaid ? <CheckCircle2 className="i i-s" /> : <span style={{ fontWeight: 700 }}>{bill.name.charAt(0)}</span>}</div>
                                    <div><div className="t">{bill.name}</div><div className="lbl">{isPaid ? (income ? 'Sudah diterima' : 'Sudah dibayar') : (income ? 'Pemasukan rutin' : 'Tagihan rutin')}</div></div>
                                </div>
                                <div className="hstack" style={{ gap: 8 }}>
                                    <span className={`num-m ${income ? 'pos' : ''}`} style={{ fontSize: 14 }}>{income ? '+' : ''}Rp {bill.amount.toLocaleString('id-ID')}</span>
                                    {isPaid ? (
                                        <button className="icon-btn ghost" aria-label="Batalkan" style={{ width: 34, height: 34, color: 'var(--danger)' }} onClick={() => handleDeleteBillPayment(bill.id)}><Trash2 className="i i-s" /></button>
                                    ) : (
                                        <button className="btn" style={{ height: 34, fontSize: 13, padding: '0 12px' }} onClick={() => handleCalendarPayBill(bill)}>{income ? 'Terima' : 'Bayar'}</button>
                                    )}
                                </div>
                            </div>
                        )
                    })}

                    {!displayData?.holiday && !displayData?.bills?.length && !displayData?.dayEvents?.length && (
                        <div className="es" style={{ border: 0, padding: '8px 0' }}>
                            <span className="t2">Tidak ada agenda {displayDate.getDate()} {MONTHS[displayDate.getMonth()].slice(0, 3)}</span>
                            <p>Tambah pengingat untuk tanggal ini.</p>
                            <button className="btn-2" style={{ height: 40, fontSize: 13 }} onClick={handleAddClick}>Tambah agenda</button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="sub" style={{ textAlign: 'center', borderTop: '1px solid var(--divider)', paddingTop: 12 }}>Pilih tanggal untuk melihat detail</div>
            )}

            <AddEventModal
                isOpen={isAddEventModalOpen}
                onClose={() => setIsAddEventModalOpen(false)}
                onSuccess={fetchEvents}
                selectedDate={displayDate || new Date()}
                initialData={selectedEvent}
            />

            {/* Pay / receive sheet */}
            {showPaymentModal && selectedPaymentBill && (
                <>
                    <div className="scrim" onClick={() => setShowPaymentModal(false)} />
                    <div className="sheet">
                        <div className="grabber" />
                        <div className="between">
                            <div><h2 className="h2">{isPemasukan(selectedPaymentBill) ? 'Terima pemasukan' : 'Bayar tagihan'}</h2><div className="lbl">{selectedPaymentBill.name}</div></div>
                            <button className="icon-btn ghost" aria-label="Tutup" onClick={() => setShowPaymentModal(false)}><X className="i" /></button>
                        </div>
                        <label className="field">{isPemasukan(selectedPaymentBill) ? 'Jumlah diterima (Rp)' : 'Jumlah pembayaran (Rp)'}
                            <input className="input" inputMode="numeric" placeholder="0" value={paymentAmount ? parseInt(paymentAmount.replace(/\D/g, '') || '0').toLocaleString('id-ID') : ''} onChange={e => setPaymentAmount(e.target.value.replace(/\D/g, ''))} />
                        </label>
                        <label className="field">Tanggal
                            <DatePickerNeo className="input" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                        </label>
                        <div className="field">{isPemasukan(selectedPaymentBill) ? 'Masuk ke dompet' : 'Bayar dari dompet'}
                            <NeoSelect value={selectedWalletId ? selectedWalletId.toString() : ''} onChange={(val) => setSelectedWalletId(Number(val))} placeholder="Pilih dompet"
                                options={wallets.map(w => ({ label: `${w.name} — Rp ${w.balance.toLocaleString('id-ID')}`, value: w.id.toString() }))} />
                        </div>
                        <button className="btn btn-block" disabled={!selectedWalletId || !paymentAmount || payingBillId !== null} onClick={handleConfirmCalendarPayment}>
                            {payingBillId ? 'Menyimpan…' : isPemasukan(selectedPaymentBill) ? 'Terima' : 'Bayar'}
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}
