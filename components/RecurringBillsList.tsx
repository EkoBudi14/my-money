'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { RecurringBill } from '@/types'
import { getRecurringBills, deleteRecurringBill } from '@/lib/recurring-bills'
import { useConfirm } from '@/hooks/useConfirm'
import AddBillModal from './AddBillModal'

interface RecurringBillsListProps {
    onUpdate?: () => void
}

export default function RecurringBillsList({ onUpdate }: RecurringBillsListProps) {
    const [bills, setBills] = useState<RecurringBill[]>([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [loading, setLoading] = useState(true)
    const { showConfirm } = useConfirm()

    const [selectedBill, setSelectedBill] = useState<RecurringBill | null>(null)

    const fetchBills = async () => {
        try {
            const data = await getRecurringBills()
            setBills(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleSuccess = () => {
        fetchBills()
        if (onUpdate) onUpdate()
    }

    useEffect(() => {
        fetchBills()
    }, [])

    const handleDelete = async (id: number) => {
        const confirmed = await showConfirm({
            title: 'Hapus Tagihan',
            message: 'Yakin ingin menghapus tagihan ini?'
        })
        if (!confirmed) return
        try {
            await deleteRecurringBill(id)
            fetchBills()
            if (onUpdate) onUpdate()
        } catch (error) {
            alert('Gagal menghapus')
        }
    }

    const handleEdit = (bill: RecurringBill) => {
        setSelectedBill(bill)
        setIsModalOpen(true)
    }

    const handleCloseModal = () => {
        setIsModalOpen(false)
        setSelectedBill(null)
    }

    const getStatus = (dueDate: number) => {
        const today = new Date().getDate()
        const daysLeft = dueDate - today
        
        // Logic handling month transition
        // If due date < today, it means it's due next month (or overdue if we track payment status, 
        // but for simple recurring, let's assume it resets)
        // Wait, simple recurring usually just shows "Next due: [Date]"
        
        let status = 'upcoming'
        let color = 'bg-gray-100 text-gray-600'
        let text = `Tgl ${dueDate}`

        if (daysLeft >= 0 && daysLeft <= 3) {
            status = 'soon'
            color = 'bg-yellow-100 text-yellow-700'
            text = daysLeft === 0 ? 'Hari ini!' : `${daysLeft} hari lagi`
        } else if (daysLeft < 0) {
            // Checks if it was due recently this month
            // For now, let's just say "Lewat" (Passed) or assume next month
            // A simple logic: if today > due_date, show for next month? 
            // The user want alerts. 
            // Let's keep it simple: "Tgl X" is the due date. 
            // If today is 20 and due is 18, it's passed for this month.
            // If today is 20 and due is 22, it's coming.
            
            // Let's refine the "Alert" logic requested by user.
            status = 'past'
            color = 'bg-green-100 text-green-700' 
            text = 'Selesai bulan ini' // Assumed paid or passed
        }

        return { status, color, text }
    }

    // Sort: those due soonest (but not passed) first
    const sortedBills = [...bills].sort((a, b) => {
        const today = new Date().getDate()
        
        const getEffectiveDate = (day: number) => {
            if (day < today) return day + 31 // Push to next month for sorting purposes
            return day
        }

        return getEffectiveDate(a.due_date) - getEffectiveDate(b.due_date)
    })
    
    // Check for urgent bills
    const urgentBillsCount = bills.filter(b => {
        const today = new Date().getDate()
        const diff = b.due_date - today
        return diff >= 0 && diff <= 3
    }).length

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        Tagihan Rutin
                        {urgentBillsCount > 0 && (
                            <span className="flex h-3 w-3 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                        )}
                    </h2>
                    <p className="text-sm text-gray-500">Kelola langganan & tagihan bulanan</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                >
                    <Plus size={20} />
                </button>
            </div>

            {urgentBillsCount > 0 && (
                <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-start gap-3">
                    <AlertTriangle className="text-yellow-600 shrink-0 mt-0.5" size={18} />
                    <div>
                        <p className="text-sm font-medium text-yellow-800">
                            Ada {urgentBillsCount} tagihan yang harus dibayar segera!
                        </p>
                    </div>
                </div>
            )}

            <div className="space-y-3">
                {loading ? (
                    <div className="text-center py-8 text-gray-500">Memuat...</div>
                ) : bills.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                        Belum ada tagihan rutin
                    </div>
                ) : (
                    sortedBills.map((bill) => {
                        const { color, text, status } = getStatus(bill.due_date)
                        return (
                            <div key={bill.id} className="group flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-all border border-transparent hover:border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                        status === 'soon' ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'
                                    }`}>
                                        <Calendar size={18} />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900">{bill.name}</h4>
                                        <p className="text-xs text-gray-500">
                                            Rp {bill.amount.toLocaleString('id-ID')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>
                                        {text}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleEdit(bill)
                                            }}
                                            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                        </button>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleDelete(bill.id)
                                            }}
                                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            <AddBillModal 
                isOpen={isModalOpen} 
                onClose={handleCloseModal} 
                onSuccess={handleSuccess}
                initialData={selectedBill}
            />
        </div>
    )
}
