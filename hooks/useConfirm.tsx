'use client'
import React, { createContext, useContext, useState, useCallback } from 'react'
import ConfirmDialog from '@/components/ConfirmDialog'

interface ConfirmOptions {
    title: string
    message: string
    confirmText?: string
    cancelText?: string
}

interface ConfirmContextType {
    showConfirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined)

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false)
    const [options, setOptions] = useState<ConfirmOptions>({
        title: '',
        message: ''
    })
    const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null)

    const showConfirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
        setOptions(opts)
        setIsOpen(true)

        return new Promise<boolean>((resolve) => {
            setResolver(() => resolve)
        })
    }, [])

    const handleConfirm = useCallback(() => {
        setIsOpen(false)
        if (resolver) {
            resolver(true)
            setResolver(null)
        }
    }, [resolver])

    const handleCancel = useCallback(() => {
        setIsOpen(false)
        if (resolver) {
            resolver(false)
            setResolver(null)
        }
    }, [resolver])

    return (
        <ConfirmContext.Provider value={{ showConfirm }}>
            {children}
            <ConfirmDialog
                isOpen={isOpen}
                title={options.title}
                message={options.message}
                confirmText={options.confirmText}
                cancelText={options.cancelText}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
            />
        </ConfirmContext.Provider>
    )
}

export function useConfirm() {
    const context = useContext(ConfirmContext)
    if (!context) {
        throw new Error('useConfirm must be used within ConfirmProvider')
    }
    return context
}
