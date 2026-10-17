'use client'
import React, { createContext, useContext, useCallback } from 'react'
import { SuccessModalOptions } from '@/components/SuccessModal'
import { useToast } from '@/hooks/useToast'

interface SuccessModalContextType {
    showSuccess: (options: SuccessModalOptions) => void
}

const SuccessModalContext = createContext<SuccessModalContextType | undefined>(undefined)

/**
 * Kept for API compatibility: the old center success popup now routes to a toast
 * (DESIGN-TAMBAHAN.md §4). Call sites still call showSuccess({ type, message }).
 */
export function SuccessModalProvider({ children }: { children: React.ReactNode }) {
    const { showToast } = useToast()

    const showSuccess = useCallback((opts: SuccessModalOptions) => {
        showToast('success', opts.message)
    }, [showToast])

    return (
        <SuccessModalContext.Provider value={{ showSuccess }}>
            {children}
        </SuccessModalContext.Provider>
    )
}

export function useSuccessModal() {
    const context = useContext(SuccessModalContext)
    if (!context) {
        throw new Error('useSuccessModal must be used within SuccessModalProvider')
    }
    return context
}
