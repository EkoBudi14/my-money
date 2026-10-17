'use client'
import React, { createContext, useContext, useState, useCallback } from 'react'
import ToastContainer, { Toast, ToastType, ToastAction } from '@/components/Toast'

interface ShowToastOptions {
    action?: ToastAction
}

interface ToastContextType {
    showToast: (type: ToastType, message: string, duration?: number, options?: ShowToastOptions) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    // One toast at a time; a new toast replaces the old one (DESIGN-TAMBAHAN.md §4).
    const showToast = useCallback(
        (type: ToastType, message: string, duration?: number, options?: ShowToastOptions) => {
            const id = Math.random().toString(36).slice(2, 11)
            setToasts([{ id, type, message, duration, action: options?.action }])
        },
        []
    )

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, [])

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <ToastContainer toasts={toasts} onClose={removeToast} />
        </ToastContext.Provider>
    )
}

export function useToast() {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within ToastProvider')
    }
    return context
}
