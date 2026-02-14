'use client'
import React, { useState, useMemo, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, Trash2, Pencil } from 'lucide-react'
import { getRecurringBills } from '@/lib/recurring-bills'
import { RecurringBill, CalendarEvent } from '@/types'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/hooks/useConfirm'
import AddEventModal from './AddEventModal'

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
}

export default function CalendarCard({ refreshTrigger = 0 }: CalendarCardProps) {
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

            } catch (error) {
                console.error('Error fetching calendar data:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [currentDate.getFullYear(), refreshTrigger])

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
                            displayData.bills.map(bill => (
                                <div key={bill.id} className="flex items-center justify-between p-3 rounded-xl bg-blue-50/50 border border-blue-100 group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                            {bill.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">{bill.name}</p>
                                            <p className="text-xs text-slate-500">Tagihan Rutin</p>
                                        </div>
                                    </div>
                                    <p className="text-sm font-bold text-blue-600">
                                        Rp {bill.amount.toLocaleString('id-ID')}
                                    </p>
                                </div>
                            ))
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
        </div>
    )
}
