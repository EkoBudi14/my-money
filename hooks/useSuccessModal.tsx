'use client'
import React, { createContext, useContext, useState, useCallback } from 'react'
import SuccessModal, { SuccessModalOptions } from '@/components/SuccessModal'

interface SuccessModalContextType {
    showSuccess: (options: SuccessModalOptions) => void
}

const SuccessModalContext = createContext<SuccessModalContextType | undefined>(undefined)

export function SuccessModalProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false)
    const [options, setOptions] = useState<SuccessModalOptions>({
        type: 'general',
        message: ''
    })

    const showSuccess = useCallback((opts: SuccessModalOptions) => {
        setOptions(opts)
        setIsOpen(true)
    }, [])

    const handleClose = useCallback(() => {
        setIsOpen(false)
    }, [])

    return (
        <SuccessModalContext.Provider value={{ showSuccess }}>
            {children}
            <SuccessModal
                isOpen={isOpen}
                onClose={handleClose}
                type={options.type}
                title={options.title}
                message={options.message}
                duration={options.duration}
            />
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
