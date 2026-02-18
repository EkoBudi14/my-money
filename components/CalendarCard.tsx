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
        const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
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
    }, [currentDate.getFullYear(), refreshTrigger])

    const handleCalendarPayBill = (bill: RecurringBill) => {
        setSelectedPaymentBill(bill)
        setPaymentAmount(bill.amount.toString())
        setPaymentDate(new Date().toISOString().split('T')[0])
        setSelectedWalletId(null)
        setShowPaymentModal(true)
    }

    const handleConfirmCalendarPayment = async () => {
        if (!selectedPaymentBill || !selectedWalletId || !paymentAmount || !paymentDate) return
        
        const amountNum = parseFloat(paymentAmount)
        if (isNaN(amountNum) || amountNum <= 0) {
            showToast('error', 'Jumlah pembayaran tidak valid')
            return
        }
        
        const wallet = wallets.find(w => w.id === selectedWalletId)
        if (!wallet) {
            showToast('error', 'Dompet tidak ditemukan')
            return
        }
        
        if (wallet.balance < amountNum) {
            showToast('error', `Saldo tidak mencukupi! Saldo ${wallet.name}: Rp ${wallet.balance.toLocaleString('id-ID')}`)
            return
        }
        
        setPayingBillId(selectedPaymentBill.id)
        try {
            const paymentMonth = new Date(paymentDate).toISOString().slice(0, 7)
            
            const { data: txData, error: txError } = await supabase.from('transactions').insert({
                title: selectedPaymentBill.name,
                amount: amountNum,
                type: 'pengeluaran',
                category: 'Tagihan',
                wallet_id: selectedWalletId,
                date: new Date(paymentDate).toISOString(),
                created_at: new Date().toISOString()
            }).select().single()
            
            if (txError) throw txError
            if (!txData) throw new Error('Transaction created but no data returned')
            
            await supabase.from('wallets').update({
                balance: wallet.balance - amountNum
            }).eq('id', selectedWalletId)
            
            await supabase.from('bill_payments').insert({
                bill_id: selectedPaymentBill.id,
                month: paymentMonth,
                paid_at: new Date().toISOString(),
                transaction_id: txData.id
            })
            
            showToast('success', 'Tagihan berhasil dibayar!')
            
            // Refresh data
            const { data: walletsData } = await supabase.from('wallets').select('*')
            setWallets(walletsData || [])
            await checkBillPayments()
            if (onUpdate) onUpdate()
            
            setShowPaymentModal(false)
        } catch (error) {
            console.error(error)
            showToast('error', 'Gagal membayar tagihan')
        } finally {
            setPayingBillId(null)
        }
    }

    const handleDeleteBillPayment = async (billId: number) => {
        const confirmed = await showConfirm({
            title: 'Batalkan Pembayaran?',
            message: 'Pembayaran akan dihapus dan dana akan dikembalikan ke dompet (jika data transaksi ditemukan).',
            confirmText: 'Batalkan Bayar',
            cancelText: 'Kembali'
        })
        
        if (!confirmed) return

        try {
            const currentMonth = new Date().toISOString().slice(0, 7)
            
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
            
            showToast('success', 'Pembayaran dibatalkan')
            
            // Refresh data
            const { data: walletsData } = await supabase.from('wallets').select('*')
            setWallets(walletsData || [])
            await checkBillPayments()
            if (onUpdate) onUpdate()
            
        } catch (error) {
            console.error('Error deleting bill payment:', error)
            showToast('error', 'Gagal membatalkan pembayaran')
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
        const confirmed = await showConfirm({
            title: 'Hapus Catatan?',
            message: 'Catatan akan dihapus permanen.',
            confirmText: 'Hapus',
            cancelText: 'Batal'
        })
        
        if (!confirmed) return

        const { error } = await supabase
            .from('calendar_events')
            .delete()
            .eq('id', id)

        if (!error) {
            showToast('success', 'Catatan dihapus')
            fetchEvents()
        } else {
            showToast('error', 'Gagal menghapus catatan')
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

    return (
        <div className="glass shadow-premium-lg p-6 rounded-[2rem] border border-white/20 h-full flex flex-col backdrop-blur-xl card-hover relative overflow-hidden">
             {/* Live Clock */}
             <div className="mb-6 border-b border-slate-100 pb-4 text-center">
                {isMounted ? (
                    <div className="text-3xl font-bold text-slate-800 tabular-nums tracking-tight">
                        {String(currentTime.getHours()).padStart(2, '0')}:{String(currentTime.getMinutes()).padStart(2, '0')}:{String(currentTime.getSeconds()).padStart(2, '0')}
                    </div>
                ) : (
                    <div className="text-3xl font-bold text-slate-800">--:--:--</div>
                )}
                <div className="text-sm text-slate-500 mt-1 capitalize">
                    {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
            </div>

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <CalendarIcon className="w-6 h-6 text-blue-600" />
                        Kalender
                    </h3>
                    <p className="text-sm text-slate-500 font-medium">{monthName} {year}</p>
                </div>
                <div className="flex bg-slate-50 rounded-xl p-1 gap-1">
                    <button onClick={prevMonth} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-600">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button onClick={nextMonth} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-600">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-8 text-center">
                {DAYS.map(day => (
                    <div key={day} className="text-xs font-bold text-slate-400 py-2 uppercase tracking-wide">
                        {day}
                    </div>
                ))}

                {grid.map((day, idx) => {
                    if (day === null) return <div key={`empty-${idx}`} />

                    const { holiday, bills, dayEvents } = getDayData(day)
                    const today = isToday(day)
                    const selected = selectedDate?.getDate() === day && selectedDate?.getMonth() === currentDate.getMonth()
                    
                    // Detect day of week for weekend coloring
                    const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
                    const dayOfWeek = dateObj.getDay() // 0 = Sunday, 6 = Saturday
                    
                    const hasBills = bills.length > 0
                    const isHoliday = !!holiday
                    const isNationalHoliday = holiday?.type === 'National holiday'
                    const hasEvents = dayEvents.length > 0

                    // Determine text color with priority: selected > national holiday > weekend > today > default
                    let textColor: string | undefined = undefined
                    if (!selected && !isNationalHoliday) {
                        if (dayOfWeek === 0) textColor = '#dc2626'      // Sunday: red
                        else if (dayOfWeek === 6) textColor = '#9ca3af' // Saturday: gray
                    }

                    return (
                        <div
                            key={day}
                            onClick={() => handleDateClick(day)}
                            className={`
                                aspect-square flex flex-col items-center justify-center relative rounded-2xl cursor-pointer transition-all duration-200
                                ${selected ? 'bg-blue-600 shadow-lg shadow-blue-200 scale-105 z-10' : ''}
                                ${!selected && today ? 'bg-blue-50 ring-1 ring-blue-200' : ''}
                                ${!selected && !today && isNationalHoliday ? 'bg-rose-50' : ''}
                                ${!selected && !today ? 'hover:bg-slate-50' : ''}
                            `}
                        >
                            <span 
                                className={`text-sm font-bold ${
                                    selected ? '!text-white' : 
                                    isNationalHoliday ? 'text-rose-600' : 
                                    (today && dayOfWeek !== 0 && dayOfWeek !== 6) ? 'text-blue-600' :
                                    'text-slate-700'
                                }`}
                                style={textColor ? { color: textColor } : undefined}
                            >
                                {day}
                            </span>
                            
                            {/* Indicators */}
                            <div className="flex gap-1 mt-1 justify-center h-1.5">
                                {/* Blue dot for bills */}
                                {hasBills && (
                                    <span className={`w-1.5 h-1.5 rounded-full ${selected ? 'bg-white' : 'bg-blue-500'}`}></span>
                                )}
                                {/* Red dot for holidays (National holiday or Observance/Cuti Bersama) */}
                                {isHoliday && (
                                    <span className={`w-1.5 h-1.5 rounded-full ${selected ? 'bg-white/70' : 'bg-rose-500'}`}></span>
                                )}
                                {/* Green dot for events */}
                                {hasEvents && (
                                    <span className={`w-1.5 h-1.5 rounded-full ${selected ? 'bg-white/70' : 'bg-emerald-500'}`}></span>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Selected Date Info Panel */}
            {displayDate ? (
                 <div className="mt-auto border-t border-slate-100 pt-4 animate-in slide-in-from-bottom-2">
                    <div className="flex justify-between items-center mb-3">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            {displayDate.getDate()} {MONTHS[displayDate.getMonth()]}
                        </p>
                        <button 
                            onClick={handleAddClick}
                            className="text-sm font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5"
                        >
                            + Catatan
                        </button>
                    </div>
                    
                    <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                        {/* Holiday Info */}
                        {displayData?.holiday && (
                            <div className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-100">
                                <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
                                    <CalendarIcon size={16} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">{displayData.holiday.name}</p>
                                    <p className="text-xs text-slate-500 mt-1">{displayData.holiday.type}</p>
                                </div>
                            </div>
                        )}

                        {/* Events Info */}
                        {displayData?.dayEvents && displayData.dayEvents.length > 0 && (
                            displayData.dayEvents.map(event => (
                                <div key={event.id} className={`flex items-start gap-3 p-3 rounded-xl border group relative
                                    ${event.color === 'blue' ? 'bg-blue-50 border-blue-100' : 
                                      event.color === 'green' ? 'bg-emerald-50 border-emerald-100' :
                                      event.color === 'yellow' ? 'bg-amber-50 border-amber-100' :
                                      event.color === 'purple' ? 'bg-purple-50 border-purple-100' :
                                      'bg-rose-50 border-rose-100'
                                    }
                                `}>
                                    <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0
                                        ${event.color === 'blue' ? 'bg-blue-500' : 
                                          event.color === 'green' ? 'bg-emerald-500' :
                                          event.color === 'yellow' ? 'bg-amber-500' :
                                          event.color === 'purple' ? 'bg-purple-500' :
                                          'bg-rose-500'
                                        }
                                    `}></div>
                                    <div className="flex-1 pr-16 min-h-[40px]">
                                        <p className="text-sm font-medium text-slate-700 break-words">{event.title}</p>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">{event.type === 'reminder' ? 'Pengingat' : 'Catatan'}</p>
                                    </div>
                                    
                                    <div className="flex gap-2 absolute top-2 right-2">
                                        <button 
                                            onClick={() => handleEditEvent(event)}
                                            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-100 rounded-xl transition-all"
                                            aria-label="Edit catatan"
                                        >
                                            <Pencil size={18} />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteEvent(event.id)}
                                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-100 rounded-xl transition-all"
                                            aria-label="Hapus catatan"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}

                        {/* Bills Info */}
                        {displayData?.bills && displayData.bills.length > 0 && (
                            displayData.bills.map(bill => {
                                const isPaid = billPayments[bill.id]
                                return (
                                    <div key={bill.id} className={`flex items-center justify-between p-3 rounded-xl border ${
                                        isPaid ? 'bg-green-50/50 border-green-100' : 'bg-blue-50/50 border-blue-100'
                                    } group`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                                                isPaid ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                                            }`}>
                                                {isPaid ? <CheckCircle2 size={16} /> : bill.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{bill.name}</p>
                                                <p className="text-xs text-slate-500">
                                                    {isPaid ? 'Sudah dibayar' : 'Tagihan Rutin'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p className={`text-sm font-bold ${
                                                isPaid ? 'text-green-600' : 'text-blue-600'
                                            }`}>
                                                Rp {bill.amount.toLocaleString('id-ID')}
                                            </p>
                                            
                                            {isPaid ? (
                                                <button
                                                    onClick={() => handleDeleteBillPayment(bill.id)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                    title="Batalkan Pembayaran"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleCalendarPayBill(bill)}
                                                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500 text-white hover:bg-blue-600 transition-all"
                                                >
                                                    Bayar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        )}

                        {!displayData?.holiday && (!displayData?.bills || displayData.bills.length === 0) && (!displayData?.dayEvents || displayData.dayEvents.length === 0) && (
                            <div className="text-center py-4 text-slate-400 text-sm">
                                Tidak ada agenda tanggal ini
                            </div>
                        )}
                    </div>
                 </div>
            ) : (
                <div className="mt-auto border-t border-slate-100 pt-4 text-center text-slate-400 text-sm">
                    Pilih tanggal untuk melihat detail
                </div>
            )}

            <AddEventModal 
                isOpen={isAddEventModalOpen}
                onClose={() => setIsAddEventModalOpen(false)}
                onSuccess={fetchEvents}
                selectedDate={displayDate || new Date()}
                initialData={selectedEvent}
            />

            {/* Payment Modal */}
            {showPaymentModal && selectedPaymentBill && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)}></div>
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl z-50 p-6 relative">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-slate-800">
                                Bayar Tagihan
                            </h3>
                            <button 
                                onClick={() => setShowPaymentModal(false)}
                                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-5">
                            <p className="text-sm text-slate-600">Tagihan</p>
                            <p className="text-lg font-bold text-slate-800">{selectedPaymentBill.name}</p>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Jumlah Pembayaran (Rp)
                                </label>
                                <MoneyInput
                                    value={paymentAmount}
                                    onChange={setPaymentAmount}
                                    placeholder={selectedPaymentBill.amount.toString()}
                                />
                                <p className="text-xs text-slate-400 mt-1">
                                    Default: Rp {selectedPaymentBill.amount.toLocaleString('id-ID')}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Tanggal Pembayaran
                                </label>
                                <input
                                    type="date"
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    value={paymentDate}
                                    onChange={(e) => setPaymentDate(e.target.value)}
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Bayar dari Dompet
                                </label>
                                <select
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    value={selectedWalletId || ''}
                                    onChange={(e) => setSelectedWalletId(Number(e.target.value))}
                                >
                                    <option value="">Pilih Dompet</option>
                                    {wallets.map(w => (
                                        <option key={w.id} value={w.id}>
                                            {w.name} - Rp {w.balance.toLocaleString('id-ID')}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleConfirmCalendarPayment}
                                disabled={!selectedWalletId || !paymentAmount || payingBillId !== null}
                                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {payingBillId ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                                ) : (
                                    'Bayar'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
