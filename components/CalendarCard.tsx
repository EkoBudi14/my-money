'use client'
import { useState, useMemo, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin } from 'lucide-react'

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

export default function CalendarCard() {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [holidays, setHolidays] = useState<Holiday[]>([])
    const [loading, setLoading] = useState(false)
    const [currentTime, setCurrentTime] = useState(new Date())

    // Update time every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date())
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    // Fetch holidays when year changes
    useEffect(() => {
        const fetchHolidays = async () => {
            setLoading(true)
            try {
                const year = currentDate.getFullYear()
                const response = await fetch(`/api/holidays?year=${year}`)
                const data = await response.json()
                setHolidays(data.holidays || [])
            } catch (error) {
                console.error('Error fetching holidays:', error)
                setHolidays([])
            } finally {
                setLoading(false)
            }
        }
        fetchHolidays()
    }, [currentDate.getFullYear()])

    const { daysInMonth, firstDayOfMonth, monthName, year, holidaysInMonth } = useMemo(() => {
        const year = currentDate.getFullYear()
        const month = currentDate.getMonth()
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)

        // Find holidays in this month from API data
        const monthHolidays = holidays
            .filter((h) => {
                const d = new Date(h.date)
                return d.getMonth() === month && d.getFullYear() === year
            })
            .map((h) => ({
                date: new Date(h.date).getDate(),
                name: h.name,
                type: h.type
            }))
            .sort((a, b) => a.date - b.date)

        return {
            daysInMonth: lastDay.getDate(),
            firstDayOfMonth: firstDay.getDay(), // 0 = Sunday
            monthName: MONTHS[month],
            year,
            holidaysInMonth: monthHolidays
        }
    }, [currentDate, holidays])

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    }

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    }

    const isToday = (day: number) => {
        const today = new Date()
        return (
            day === today.getDate() &&
            currentDate.getMonth() === today.getMonth() &&
            currentDate.getFullYear() === today.getFullYear()
        )
    }

    const isSelected = (day: number) => {
        if (!selectedDate) return false
        return (
            day === selectedDate.getDate() &&
            currentDate.getMonth() === selectedDate.getMonth() &&
            currentDate.getFullYear() === selectedDate.getFullYear()
        )
    }

    const isSunday = (day: number) => {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
        return date.getDay() === 0 // 0 = Sunday
    }

    const isSaturday = (day: number) => {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
        return date.getDay() === 6 // 6 = Saturday
    }

    const getHoliday = (day: number) => {
        return holidaysInMonth.find(h => h.date === day)
    }

    const handleDateClick = (day: number) => {
        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
        setSelectedDate(newDate)
    }

    const getTodayHoliday = () => {
        const today = new Date()
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
        return holidays.find(h => h.date === todayStr)
    }

    // Generate grid array
    const grid = []
    // Add empty cells for previous month
    for (let i = 0; i < firstDayOfMonth; i++) {
        grid.push(null)
    }
    // Add days
    for (let i = 1; i <= daysInMonth; i++) {
        grid.push(i)
    }

    const todayHoliday = getTodayHoliday()

    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-full flex flex-col">
            {/* Live Clock & Today's Info */}
            <div className="mb-4 pb-4 border-b border-slate-100">
                <div className="text-center">
                    <div className="text-3xl font-bold text-slate-800 tabular-nums tracking-tight">
                        {String(currentTime.getHours()).padStart(2, '0')}:{String(currentTime.getMinutes()).padStart(2, '0')}:{String(currentTime.getSeconds()).padStart(2, '0')}
                    </div>
                    <div className="text-sm text-slate-500 mt-1">
                        {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toLowerCase()}
                    </div>
                    {todayHoliday && (
                        <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${todayHoliday.type === 'National holiday'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-700'
                            }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            {todayHoliday.name}
                        </div>
                    )}
                </div>
            </div>

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-blue-600" />
                        Kalender
                    </h3>
                    <p className="text-sm text-slate-500">{monthName} {year}</p>
                </div>
                <div className="flex bg-slate-50 rounded-lg p-1">
                    <button onClick={prevMonth} className="p-1 hover:bg-white hover:shadow-sm rounded transition-all text-slate-600">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button onClick={nextMonth} className="p-1 hover:bg-white hover:shadow-sm rounded transition-all text-slate-600">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-6 text-center">
                {DAYS.map(day => (
                    <div key={day} className="text-xs font-semibold text-slate-400 py-2">
                        {day}
                    </div>
                ))}

                {grid.map((day, idx) => {
                    if (day === null) return <div key={`empty-${idx}`} />

                    const holiday = getHoliday(day)
                    const today = isToday(day)
                    const selected = isSelected(day)
                    const sunday = isSunday(day)
                    const saturday = isSaturday(day)
                    const isNationalHoliday = holiday && holiday.type === 'National holiday'

                    return (
                        <div
                            key={day}
                            className="aspect-square flex flex-col items-center justify-center relative group cursor-pointer"
                            onClick={() => handleDateClick(day)}
                        >
                            <span className={`
                                w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-all
                                ${today ? 'bg-blue-600 text-white shadow-blue-200 shadow-lg' : ''}
                                ${selected && !today ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500' : ''}
                                ${isNationalHoliday && !today && !selected ? 'text-rose-600 font-bold bg-rose-50' : ''}
                                ${sunday && !today && !selected && !isNationalHoliday ? 'text-rose-600 font-semibold' : ''}
                                ${saturday && !today && !selected && !holiday && !sunday ? 'text-slate-400' : ''}
                                ${!today && !selected && !holiday && !sunday && !saturday ? 'text-slate-700 hover:bg-slate-100' : ''}
                            `}>
                                {day}
                            </span>

                            {/* Dot Indicators */}
                            <div className="flex gap-0.5 mt-1 h-1.5">
                                {holiday && <div className="w-1 h-1 rounded-full bg-rose-500" />}
                                {!holiday && today && <div className="w-1 h-1 rounded-full bg-blue-300" />}
                                {selected && !today && <div className="w-1 h-1 rounded-full bg-blue-500" />}
                            </div>

                            {/* Tooltip for Holiday on Hover */}
                            {holiday && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[150px] bg-slate-800 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                                    {holiday.name}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-4 border-x-transparent border-t-4 border-t-slate-800"></div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Upcoming Holidays List */}
            {holidaysInMonth.length > 0 ? (
                <div className="mt-auto border-t border-slate-50 pt-4">
                    <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">Libur Nasional & Cuti</p>
                    <div className="space-y-3">
                        {holidaysInMonth.map((h) => (
                            <div key={h.date} className="flex gap-3 items-start">
                                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex flex-col items-center justify-center border border-rose-100">
                                    <span className="text-[10px] font-bold uppercase leading-none">{MONTHS[currentDate.getMonth()].slice(0, 3)}</span>
                                    <span className="text-sm font-bold leading-none">{h.date}</span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-700 leading-tight">{h.name}</p>
                                    <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                                        <MapPin className="w-3 h-3" />
                                        <span>Indonesia</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="mt-auto border-t border-slate-50 pt-4 text-center text-slate-400 text-sm py-2">
                    Tidak ada hari libur bulan ini
                </div>
            )}
        </div>
    )
}
