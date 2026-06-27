'use client'

import { Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AddBillModal from '@/components/AddBillModal'

function RecurringPageContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    
    const editIdParam = searchParams.get('edit')
    const editId = editIdParam ? parseInt(editIdParam) : null
    
    const navigatedRef = useRef(false)

    const handleClose = () => {
        if (navigatedRef.current) return
        router.back()
    }

    const handleSaved = () => {
        navigatedRef.current = true
        router.back()
    }

    return (
        <AddBillModal
            isOpen={true}
            editId={editId}
            onClose={handleClose}
            onSuccess={handleSaved}
            mode="page"
        />
    )
}

export default function RecurringPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#F9FAFB] dark:bg-[var(--bg-page)] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-3 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-slate-500 font-medium">Memuat...</p>
                </div>
            </div>
        }>
            <RecurringPageContent />
        </Suspense>
    )
}
