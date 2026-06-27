'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Upload, X, Loader2, ScanLine, Save, CheckCircle2, FlipHorizontal, Trash2, Clipboard } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { Wallet, CATEGORIES } from '@/types'

export default function ScanReceiptPage() {
    const router = useRouter()
    const { showToast } = useToast()
    
    const [image, setImage] = useState<string | null>(null)
    const [isScanning, setIsScanning] = useState(false)
    const [scanResult, setScanResult] = useState<any | null>(null)
    
    const [wallets, setWallets] = useState<Wallet[]>([])
    const [selectedWalletId, setSelectedWalletId] = useState<string>('')
    const [isSaving, setIsSaving] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)

    // Rate limit state
    const [rateLimitInfo, setRateLimitInfo] = useState<{ retryAfter: number; isPerDay: boolean; total: number; resetTime: string } | null>(null)
    const [rateLimitCountdown, setRateLimitCountdown] = useState(0)

    // Camera state
    const [showCamera, setShowCamera] = useState(false)
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
    const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')

    // Clipboard state
    const [showManualPaste, setShowManualPaste] = useState(false)
    const [isConverting, setIsConverting] = useState(false) // Konversi HEIC loading state

    // Share target & clipboard state
    // (Auto-detect dihapus, menggunakan tombol paste eksplisit untuk UX iOS yang lebih baik)    
    const fileInputRef = useRef<HTMLInputElement>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        fetchWallets()
    }, [])

    // ── ANDROID SHARE TARGET ──────────────────────────────────────────────────
    // Ambil foto dari server-side store menggunakan share_id dari URL.
    // Baca URL params via window.location.search (tidak butuh useSearchParams/Suspense).
    // Bersihkan URL setelah dibaca agar toast tidak muncul ulang saat refresh.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const shareId = params.get('share_id')
        const errorType = params.get('error')

        // Bersihkan URL params setelah dibaca (cegah toast muncul ulang saat refresh)
        if (shareId || errorType) {
            router.replace('/scan-receipt')
        }

        if (errorType) {
            const errorMessages: Record<string, string> = {
                no_image: 'Tidak ada foto yang diterima dari galeri.',
                invalid_type: 'File yang di-share bukan gambar.',
                too_large: 'Foto terlalu besar (maks 15MB).',
                failed: 'Gagal memproses foto dari galeri.'
            }
            showToast('error', errorMessages[errorType] || 'Gagal menerima foto.')
            return
        }

        if (shareId) {
            // Ambil gambar dari server-side temporary store via API
            fetch(`/api/share-image?id=${shareId}`)
                .then(res => {
                    if (!res.ok) throw new Error(
                        res.status === 410
                            ? 'Foto sudah kadaluarsa. Coba share ulang dari galeri.'
                            : 'Foto tidak ditemukan. Coba share ulang dari galeri.'
                    )
                    return res.json()
                })
                .then(({ dataUrl }) => {
                    setImage(dataUrl)
                    setScanResult(null)
                    setIsSuccess(false)
                    showToast('success', '📸 Foto dari galeri berhasil dimuat!')
                })
                .catch((err: Error) => {
                    showToast('error', err.message || 'Gagal memuat foto dari galeri.')
                })
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // ── CLIPBOARD GLOBAL LISTENER (MANUAL PASTE) ─────────────────────────────
    // Jika iOS memblokir tombol Paste otomatis, user bisa "Tap & Hold" -> Paste
    // di area mana saja (atau di input khusus) dan event ini akan menangkapnya.
    useEffect(() => {
        const handleGlobalPaste = async (e: ClipboardEvent) => {
            const items = e.clipboardData?.items
            if (!items || items.length === 0) return
            
            let targetBlob: File | null = null
            let debugTypes: string[] = []

            for (let i = 0; i < items.length; i++) {
                debugTypes.push(`${items[i].kind}:${items[i].type || 'unknown'}`)
            }

            // 1. Cari yang secara eksplisit adalah gambar
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.startsWith('image/')) {
                    targetBlob = items[i].getAsFile()
                    if (targetBlob) break
                }
            }

            // 2. Fallback untuk Live Photo / HEIC di iOS: kadang type kosong atau bukan image/
            if (!targetBlob) {
                for (let i = 0; i < items.length; i++) {
                    if (items[i].kind === 'file' && !items[i].type.includes('video')) {
                        targetBlob = items[i].getAsFile()
                        if (targetBlob) break
                    }
                }
            }

            if (targetBlob) {
                e.preventDefault()
                setIsConverting(true)
                try {
                    let finalBlob: Blob = targetBlob
                    // Deteksi HEIC: eksplisit type HEIC/HEIF, atau type kosong/octet-stream
                    // (iOS sering memberikan Live Photo dengan type kosong dari clipboard)
                    const isLikelyHeic = 
                        targetBlob.type === 'image/heic' ||
                        targetBlob.type === 'image/heif' ||
                        targetBlob.type === '' ||
                        targetBlob.type === 'application/octet-stream'
                    
                    if (isLikelyHeic) {
                        showToast('info', 'Menerjemahkan foto ke format standar...')
                        try {
                            const heic2any = (await import('heic2any')).default
                            const converted = await heic2any({ blob: targetBlob, toType: 'image/jpeg', quality: 0.8 })
                            finalBlob = Array.isArray(converted) ? converted[0] : converted
                        } catch {
                            // Jika konversi HEIC gagal (mungkin bukan HEIC asli), lanjutkan dengan blob asli
                        }
                    }

                    const objectUrl = URL.createObjectURL(finalBlob)
                    const img = new Image()
                    img.onload = () => {
                        URL.revokeObjectURL(objectUrl)
                        const dataUrl = compressImage(img, img.naturalWidth, img.naturalHeight)
                        setImage(dataUrl)
                        setScanResult(null)
                        setIsSuccess(false)
                        setShowManualPaste(false)
                        setIsConverting(false)
                        showToast('success', '📋 Foto berhasil di-paste!')
                    }
                    img.onerror = () => {
                        URL.revokeObjectURL(objectUrl)
                        setIsConverting(false)
                        showToast('error', `Gagal membaca gambar (Tipe: ${finalBlob.type || 'unknown'}). Saran: Gunakan tombol Galeri.`)
                    }
                    img.src = objectUrl
                } catch (err: any) {
                    setIsConverting(false)
                    showToast('error', `Gagal memproses gambar: ${err.message}`)
                }
            } else {
                // 3. Fallback: Cek text/html untuk Base64 URI (Biasanya iOS mengirim gambar kecil dalam HTML)
                let htmlItemFound = false
                for (let i = 0; i < items.length; i++) {
                    if (items[i].type === 'text/html') {
                        htmlItemFound = true
                        e.preventDefault()
                        items[i].getAsString((htmlString) => {
                            const match = htmlString.match(/<img[^>]+src="([^">]+)"/i)
                            if (match && match[1] && match[1].startsWith('data:image/')) {
                                const img = new Image()
                                img.onload = () => {
                                    const dataUrl = compressImage(img, img.naturalWidth, img.naturalHeight)
                                    setImage(dataUrl)
                                    setScanResult(null)
                                    setIsSuccess(false)
                                    setShowManualPaste(false)
                                    showToast('success', '📋 Foto kecil berhasil di-paste!')
                                }
                                img.onerror = () => {
                                    setIsConverting(false)
                                    showToast('error', 'Gagal memuat gambar dari clipboard.')
                                }
                                img.src = match[1]
                            } else {
                                // text/html ada tapi tidak mengandung Base64 yang valid
                                showToast('error', `Gagal membaca gambar. Tipe data: [${debugTypes.join(', ')}]. Saran: Gunakan tombol Galeri.`)
                            }
                        })
                        return
                    }
                }
                
                if (!htmlItemFound) {
                    showToast('error', `Gagal. iOS hanya mengirimkan tipe data: [${debugTypes.join(', ')}]. Saran: Gunakan tombol Galeri.`)
                }
            }
        }

        document.addEventListener('paste', handleGlobalPaste)
        return () => document.removeEventListener('paste', handleGlobalPaste)
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Ambil foto dari clipboard via API (Tombol)
    const handlePasteFromClipboard = async () => {
        setIsConverting(true)
        try {
            const items = await navigator.clipboard.read()
            for (const item of items) {
                const imageType = item.types.find(t => t.startsWith('image/'))
                if (imageType) {
                    let blob = await item.getType(imageType)
                    
                    // Deteksi HEIC: eksplisit atau heuristik
                    const isLikelyHeic =
                        imageType === 'image/heic' ||
                        imageType === 'image/heif' ||
                        blob.type === 'image/heic' ||
                        blob.type === '' ||
                        blob.type === 'application/octet-stream'
                    
                    if (isLikelyHeic) {
                        showToast('info', 'Menerjemahkan foto ke format standar...')
                        try {
                            const heic2any = (await import('heic2any')).default
                            const converted = await heic2any({ blob, toType: 'image/jpeg', quality: 0.8 })
                            blob = Array.isArray(converted) ? converted[0] as Blob : converted as Blob
                        } catch {
                            // Jika bukan HEIC asli, lanjutkan dengan blob original
                        }
                    }

                    const objectUrl = URL.createObjectURL(blob)
                    const img = new Image()
                    img.onload = () => {
                        URL.revokeObjectURL(objectUrl)
                        const dataUrl = compressImage(img, img.naturalWidth, img.naturalHeight)
                        setImage(dataUrl)
                        setScanResult(null)
                        setIsSuccess(false)
                        setIsConverting(false)
                        showToast('success', '📋 Foto dari clipboard berhasil dimuat!')
                    }
                    img.onerror = () => {
                        URL.revokeObjectURL(objectUrl)
                        setIsConverting(false)
                        showToast('error', 'Gagal memuat gambar dari clipboard. Coba copy ulang.')
                    }
                    img.src = objectUrl
                    return
                }

                // Fallback untuk gambar kecil (text/html dengan Base64)
                const htmlType = item.types.find(t => t === 'text/html')
                if (htmlType) {
                    const blob = await item.getType(htmlType)
                    const htmlText = await blob.text()
                    const match = htmlText.match(/<img[^>]+src="([^">]+)"/i)
                    if (match && match[1] && match[1].startsWith('data:image/')) {
                        const img = new Image()
                        img.onload = () => {
                            const dataUrl = compressImage(img, img.naturalWidth, img.naturalHeight)
                            setImage(dataUrl)
                            setScanResult(null)
                            setIsSuccess(false)
                            setIsConverting(false)
                            showToast('success', '📋 Foto dari clipboard berhasil dimuat!')
                        }
                        img.onerror = () => {
                            setIsConverting(false)
                            showToast('error', 'Gagal memuat gambar base64 dari clipboard.')
                        }
                        img.src = match[1]
                        return
                    } else {
                        // text/html ada tapi Base64 tidak valid
                        setIsConverting(false)
                        showToast('error', 'Format gambar tidak dikenali. Coba copy ulang dari Galeri.')
                        return
                    }
                }
            }
            setIsConverting(false)
            showToast('error', 'Tidak ada gambar di clipboard.')
        } catch {
            // Jika ditolak (khususnya oleh iOS PWA Home Screen), tampilkan UI manual
            setIsConverting(false)
            setShowManualPaste(true)
            showToast('error', 'Sistem memblokir tombol. Gunakan area Paste Manual di bawah.')
        }
    }

    // Countdown timer for rate limit
    useEffect(() => {
        if (rateLimitCountdown <= 0) return
        const timer = setInterval(() => {
            setRateLimitCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer)
                    return 0
                }
                return prev - 1
            })
        }, 1000)
        return () => clearInterval(timer)
    }, [rateLimitCountdown])

    // Cleanup stream on unmount
    useEffect(() => {
        return () => {
            if (cameraStream) {
                cameraStream.getTracks().forEach(t => t.stop())
            }
        }
    }, [cameraStream])

    const fetchWallets = async () => {
        const { data } = await supabase.from('wallets').select('*')
        if (data) {
            setWallets(data)
            const cashWallet = data.find((w: Wallet) => w.type === 'cash')
            if (cashWallet) setSelectedWalletId(cashWallet.id.toString())
            else if (data.length > 0) setSelectedWalletId(data[0].id.toString())
        }
    }

    // ── CAMERA ────────────────────────────────────────────────────────────────
    const openCamera = async (facing: 'environment' | 'user' = 'environment') => {
        // Stop existing stream first
        if (cameraStream) cameraStream.getTracks().forEach(t => t.stop())

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } }
            })
            setCameraStream(stream)
            setFacingMode(facing)
            setShowCamera(true)

            // Attach to video element after render
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                    videoRef.current.play()
                }
            }, 100)
        } catch (err: any) {
            showToast('error', 'Tidak dapat mengakses kamera. Pastikan izin kamera sudah diberikan di browser.')
        }
    }

    const flipCamera = () => {
        openCamera(facingMode === 'environment' ? 'user' : 'environment')
    }

    // ── COMPRESS ─────────────────────────────────────────────────────────────
    const compressImage = (sourceCanvas: HTMLCanvasElement | HTMLImageElement, w: number, h: number): string => {
        const MAX_DIM = 800 // 800px cukup untuk OCR teks struk, hemat ~60% token vs 1280px
        let targetW = w
        let targetH = h
        if (targetW > MAX_DIM) { targetH = Math.round(targetH * MAX_DIM / targetW); targetW = MAX_DIM }
        if (targetH > MAX_DIM) { targetW = Math.round(targetW * MAX_DIM / targetH); targetH = MAX_DIM }
        const offscreen = document.createElement('canvas')
        offscreen.width = targetW
        offscreen.height = targetH
        offscreen.getContext('2d')?.drawImage(sourceCanvas, 0, 0, targetW, targetH)
        return offscreen.toDataURL('image/jpeg', 0.65) // 65% quality masih oke untuk teks, lebih hemat token
    }

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return
        const video = videoRef.current
        const canvas = canvasRef.current
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d')?.drawImage(video, 0, 0)
        const dataUrl = compressImage(canvas, video.videoWidth, video.videoHeight)
        setImage(dataUrl)
        closeCamera()
    }

    const closeCamera = () => {
        if (cameraStream) cameraStream.getTracks().forEach(t => t.stop())
        setCameraStream(null)
        setShowCamera(false)
    }

    // ── GALLERY ───────────────────────────────────────────────────────────────
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const objectUrl = URL.createObjectURL(file)
        const img = new Image()
        img.onload = () => {
            URL.revokeObjectURL(objectUrl)
            const dataUrl = compressImage(img, img.naturalWidth, img.naturalHeight)
            setImage(dataUrl)
            setScanResult(null)
            setIsSuccess(false)
        }
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl)
            showToast('error', 'Gagal memuat gambar. Coba format lain.')
        }
        img.src = objectUrl
    }

    // ── SCAN ──────────────────────────────────────────────────────────────────────────
    const handleScan = async () => {
        if (!image) return
        setIsScanning(true)
        try {
            const response = await fetch('/api/scan-receipt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image })
            })
            const result = await response.json()

            // Handle rate limit specifically
            if (response.status === 429) {
                const retryAfter = result.retryAfter ?? 60
                const isPerDay = result.isPerDay ?? false
                let resetTime: string

                if (isPerDay) {
                    // Kuota harian reset tengah malam Pacific Time → hitung ke WIB
                    const ptParts = new Intl.DateTimeFormat('en-US', {
                        timeZone: 'America/Los_Angeles',
                        hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false
                    }).formatToParts(new Date())
                    const ptH = parseInt(ptParts.find((p: any) => p.type === 'hour')?.value || '0') % 24
                    const ptM = parseInt(ptParts.find((p: any) => p.type === 'minute')?.value || '0')
                    const ptS = parseInt(ptParts.find((p: any) => p.type === 'second')?.value || '0')
                    const msUntilMidnightPT = ((23 - ptH) * 3600 + (59 - ptM) * 60 + (60 - ptS)) * 1000
                    const nextMidnightPT = new Date(Date.now() + msUntilMidnightPT)
                    resetTime = nextMidnightPT.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })
                } else {
                    // Rate limit per menit → hitung dari retryAfter
                    const resetAt = new Date(Date.now() + retryAfter * 1000)
                    resetTime = resetAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })
                }

                setRateLimitInfo({ retryAfter, isPerDay, total: retryAfter, resetTime })
                setRateLimitCountdown(retryAfter)
                throw new Error(result.error || 'Rate limit exceeded')
            }

            if (!response.ok || result.error) throw new Error(result.error || 'Gagal memproses struk')
            
            // Format result to ensure properties exist
            const data = result.data
            setScanResult({
                document_type: data.document_type || 'struk_belanja',
                store_name: data.store_name || '',
                date: data.date || new Date().toISOString().split('T')[0],
                total: data.total || 0,
                category: data.category || 'Belanja',
                transaction_type: data.transaction_type || 'pengeluaran',
                description: data.description || '',
                discount: data.discount || 0,
                extra_fees: data.extra_fees || 0,
                items: data.items || []
            })
        } catch (error: any) {
            showToast('error', error.message)
        } finally {
            setIsScanning(false)
        }
    }

    const handleItemChange = (idx: number, field: string, value: any) => {
        if (!scanResult) return
        const newItems = [...scanResult.items]
        newItems[idx] = { ...newItems[idx], [field]: value }
        
        // Auto-recalculate total when items change
        const newTotal = newItems.reduce((acc, item) => acc + (item.qty * item.price), 0)
        
        setScanResult({
            ...scanResult,
            items: newItems,
            total: newTotal
        })
    }

    const handleDeleteItem = (idx: number) => {
        if (!scanResult) return
        const newItems = scanResult.items.filter((_: any, i: number) => i !== idx)
        
        const newTotal = newItems.reduce((acc: number, item: any) => acc + (item.qty * item.price), 0)
        
        setScanResult({
            ...scanResult,
            items: newItems,
            total: newTotal
        })
    }

    const handleResultChange = (field: string, value: any) => {
        if (!scanResult) return
        setScanResult({ ...scanResult, [field]: value })
    }

    // ── SAVE ──────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!scanResult || !selectedWalletId) return
        setIsSaving(true)
        try {
            const walletId = parseInt(selectedWalletId)
            const txType = scanResult.transaction_type || 'pengeluaran'
            const { data: wallet } = await supabase.from('wallets').select('balance, name').eq('id', walletId).single()
            if (!wallet) throw new Error('Dompet tidak ditemukan')

            // Cek saldo hanya untuk pengeluaran
            if (txType === 'pengeluaran' && wallet.balance < scanResult.total) {
                throw new Error(`Saldo tidak mencukupi! Saldo ${wallet.name}: Rp ${wallet.balance.toLocaleString('id-ID')}`)
            }

            // Generate judul berdasarkan jenis dokumen
            let title = ''
            if (scanResult.document_type === 'bukti_transfer') {
                title = txType === 'pemasukan'
                    ? `Terima Transfer dari ${scanResult.store_name}`
                    : `Transfer ke ${scanResult.store_name}`
            } else if (scanResult.document_type === 'tagihan') {
                title = `Tagihan ${scanResult.store_name}`
            } else {
                title = `Belanja di ${scanResult.store_name}`
            }

            const safeDate = new Date(`${scanResult.date}T12:00:00`).toISOString()
            const payload = {
                title,
                amount: scanResult.total,
                type: txType,
                category: scanResult.category || 'Belanja',
                wallet_id: walletId,
                date: safeDate,
                created_at: new Date().toISOString(),
                is_piutang: false,
                is_talangan: false
            }
            const { error: insertError } = await supabase.from('transactions').insert([payload])
            if (insertError) throw insertError

            // Update saldo: kurangi untuk pengeluaran, tambah untuk pemasukan
            const newBalance = txType === 'pemasukan'
                ? wallet.balance + scanResult.total
                : wallet.balance - scanResult.total
            await supabase.from('wallets').update({ balance: newBalance }).eq('id', walletId)

            setIsSuccess(true)
            showToast('success', 'Dokumen berhasil disimpan!')
        } catch (error: any) {
            showToast('error', error.message)
        } finally {
            setIsSaving(false)
        }
    }

    // ── RESET ─────────────────────────────────────────────────────────────────
    const resetState = () => {
        setImage(null)
        setScanResult(null)
        setIsSuccess(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    return (
        <main className="min-h-screen bg-[var(--bg-page)] pb-24 md:pb-8">

            {/* ── CAMERA MODAL ─────────────────────────────────────────────── */}
            {showCamera && (
                <div className="fixed inset-0 z-[200] bg-black flex flex-col">
                    <div className="flex items-center justify-between p-4 text-white">
                        <span className="font-semibold text-base">Foto Struk</span>
                        <button onClick={closeCamera} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 relative overflow-hidden">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />
                        {/* Viewfinder overlay */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-4/5 h-3/5 border-2 border-white/60 rounded-2xl relative">
                                <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-xl" />
                                <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-xl" />
                                <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-xl" />
                                <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-xl" />
                            </div>
                        </div>
                        <p className="absolute bottom-4 left-0 right-0 text-center text-white/70 text-xs">Arahkan kamera ke struk</p>
                    </div>

                    <div className="flex items-center justify-center gap-8 p-8 pb-10">
                        {/* Flip camera */}
                        <button onClick={flipCamera} className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                            <FlipHorizontal className="w-5 h-5 text-white" />
                        </button>
                        {/* Shutter */}
                        <button onClick={capturePhoto} className="w-20 h-20 rounded-full bg-white dark:bg-[var(--bg-card)] border-4 border-white/30 shadow-2xl hover:scale-95 transition-transform active:scale-90" />
                        {/* Spacer */}
                        <div className="w-12 h-12" />
                    </div>

                    {/* Hidden canvas for capture */}
                    <canvas ref={canvasRef} className="hidden" />
                </div>
            )}

            {/* ── HEADER ───────────────────────────────────────────────────── */}
            <header className="bg-[var(--bg-card)] px-5 py-4 flex items-center justify-between border-b-4 border-[var(--neo-ink)] shadow-[0_4px_0_var(--neo-ink)] sticky top-0 z-40 mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 brutal-card-sm bg-[var(--neo-sky)] flex items-center justify-center border-[2px] border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] !p-0">
                        <ScanLine className="w-5 h-5 text-[var(--neo-ink)]" />
                    </div>
                    <div>
                        <h1 className="font-black text-[var(--text-primary)] text-lg leading-tight">Scan Struk</h1>
                        <p className="text-xs text-[var(--text-secondary)] font-bold">Catat pengeluaran otomatis pakai AI</p>
                    </div>
                </div>
                <button onClick={() => router.push('/')} className="w-8 h-8 flex items-center justify-center rounded-[8px] bg-white border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] hover:bg-[var(--neo-peach)] hover:scale-105 active:scale-95 transition-all text-[var(--text-primary)]">
                    <X className="w-4 h-4" />
                </button>
            </header>

            <div className="max-w-2xl mx-auto px-5 py-6 space-y-6">

                {/* ── SUCCESS ──────────────────────────────────────────────── */}
                {isSuccess ? (
                    <div className="brutal-card p-8 text-center animate-in zoom-in-95 duration-300 bg-[var(--bg-card)]">
                        <div className="w-20 h-20 bg-[var(--neo-mint)] rounded-full border-4 border-[var(--neo-ink)] shadow-[4px_4px_0_var(--neo-ink)] flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="w-10 h-10 text-[var(--neo-ink)]" />
                        </div>
                        <h2 className="text-2xl font-black text-[var(--text-primary)] mb-2">Berhasil Disimpan!</h2>
                        <p className="text-[var(--text-muted)] font-bold mb-8">Transaksi telah ditambahkan ke pengeluaran Anda.</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={resetState} className="w-full brutal-btn !py-3.5 !bg-[var(--neo-sky)] text-white">
                                Scan Struk Lagi
                            </button>
                            <button onClick={() => router.push('/')} className="w-full brutal-btn !py-3.5 !bg-white text-[var(--text-primary)]">
                                Kembali ke Dashboard
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* ── UPLOAD AREA ──────────────────────────────────── */}
                        {!image && (
                            <div className="brutal-card p-6 space-y-4 bg-[var(--bg-card)]">
                                <div className="aspect-[4/3] w-full rounded-[16px] border-[3px] border-dashed border-[var(--neo-ink)] flex flex-col items-center justify-center gap-4 bg-[var(--bg-elevated)]">
                                    <div className="w-16 h-16 bg-white rounded-[16px] border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] flex items-center justify-center">
                                        <Camera className="w-8 h-8 text-[var(--neo-ink)]" />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-black text-[var(--text-primary)]">Ambil Foto / Upload Struk</p>
                                        <p className="text-sm font-bold text-[var(--text-secondary)] mt-1">Pastikan tulisan terbaca jelas</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => openCamera('environment')}
                                        disabled={isConverting}
                                        className="flex items-center justify-center gap-2 brutal-btn !py-3.5 !bg-[var(--neo-mint)] disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Camera className="w-4 h-4" /> Foto
                                    </button>

                                    <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isConverting}
                                        className="flex items-center justify-center gap-2 brutal-btn !py-3.5 !bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Upload className="w-4 h-4" /> Galeri
                                    </button>
                                </div>

                                {/* ── CLIPBOARD BUTTON ───────────────────────── */}
                                <button
                                    onClick={handlePasteFromClipboard}
                                    disabled={isConverting}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-[12px] bg-[var(--neo-lav)] border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                                >
                                    <div className="w-8 h-8 bg-white border-2 border-[var(--neo-ink)] rounded-[8px] flex items-center justify-center flex-shrink-0">
                                        {isConverting
                                            ? <Loader2 className="w-4 h-4 text-[var(--neo-ink)] animate-spin" />
                                            : <Clipboard className="w-4 h-4 text-[var(--neo-ink)]" />
                                        }
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="text-sm font-black text-[var(--text-primary)]">
                                            {isConverting ? 'Memproses foto...' : 'Paste dari Clipboard'}
                                        </p>
                                        <p className="text-xs font-bold text-[var(--text-muted)]">
                                            {isConverting ? 'Mohon tunggu sebentar' : 'Gunakan foto yang di-copy dari Galeri'}
                                        </p>
                                    </div>
                                    {!isConverting && <span className="text-[var(--text-primary)] font-black text-lg">→</span>}
                                </button>

                                {/* ── MANUAL PASTE FALLBACK (iOS PWA) ────────── */}
                                {showManualPaste && (
                                    <div className="mt-4 p-4 border-[3px] border-dashed border-[var(--neo-ink)] bg-[var(--neo-sky)] rounded-[16px] animate-in fade-in slide-in-from-top-2">
                                        <p className="text-sm text-[var(--neo-ink)] font-black mb-3 text-center">
                                            iOS memblokir tombol paste. <br/>Gunakan cara manual:
                                        </p>
                                        <input 
                                            type="text" 
                                            inputMode="none" 
                                            placeholder="Tap sekali, lalu pilih 'Paste'" 
                                            className="w-full text-center py-3.5 bg-white border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] rounded-[12px] text-[var(--text-primary)] outline-none font-black"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── RATE LIMIT BANNER ───────────────────────────────── */}
                        {rateLimitInfo && rateLimitCountdown > 0 && (
                            <div className="brutal-card p-4 animate-in fade-in bg-[var(--neo-peach)]">
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 bg-white rounded-[8px] border-2 border-[var(--neo-ink)] flex items-center justify-center flex-shrink-0">
                                        <span className="text-lg">⏳</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-[var(--text-primary)] text-sm">
                                            {rateLimitInfo.isPerDay ? 'Kuota Harian Habis' : 'Terlalu Banyak Request'}
                                        </p>
                                        <p className="text-xs text-[var(--text-primary)] font-bold mt-0.5">
                                            {rateLimitInfo.isPerDay
                                                ? `Kuota harian habis. Reset pukul ${rateLimitInfo.resetTime} WIB.`
                                                : `Batas request per menit tercapai. Bisa scan lagi sekitar pukul ${rateLimitInfo.resetTime} WIB.`}
                                        </p>
                                        <div className="mt-3">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs font-bold text-[var(--text-primary)]">Bisa scan lagi dalam:</span>
                                                <span className="text-sm font-black text-[var(--text-primary)] tabular-nums bg-white px-1 border-2 border-[var(--neo-ink)]">
                                                    {rateLimitCountdown >= 3600
                                                        ? `${Math.floor(rateLimitCountdown / 3600)}j ${Math.floor((rateLimitCountdown % 3600) / 60)}m`
                                                        : rateLimitCountdown >= 60
                                                            ? `${Math.floor(rateLimitCountdown / 60)}m ${rateLimitCountdown % 60}s`
                                                            : `${rateLimitCountdown}s`
                                                    }
                                                </span>
                                            </div>
                                            <div className="w-full bg-white border-[2px] border-[var(--neo-ink)] h-3 rounded-[8px] overflow-hidden">
                                                <div
                                                    className="bg-[var(--neo-ink)] h-full transition-all duration-1000"
                                                    style={{ width: `${(rateLimitCountdown / rateLimitInfo.total) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── IMAGE PREVIEW ─────────────────────────────────── */}
                        {image && !scanResult && (
                            <div className="brutal-card overflow-hidden animate-in fade-in !p-0 bg-[var(--bg-card)]">
                                <div className="relative aspect-[3/4] w-full bg-[var(--neo-ink)] border-b-[3px] border-[var(--neo-ink)]">
                                    <img src={image} alt="Struk" className="w-full h-full object-contain" />
                                    <button onClick={resetState} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-[8px] bg-white border-2 border-[var(--neo-ink)] text-[var(--text-primary)] hover:bg-[var(--neo-peach)] hover:scale-105 active:scale-95 transition-all shadow-[2px_2px_0_var(--neo-ink)]">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="p-5">
                                    <button
                                        onClick={handleScan}
                                        disabled={isScanning || rateLimitCountdown > 0}
                                        className="w-full py-4 bg-[var(--primary)] hover:bg-blue-600 disabled:bg-slate-300 dark:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-200 disabled:shadow-none"
                                    >
                                        {isScanning ? (
                                            <><Loader2 className="w-5 h-5 animate-spin" /> Menganalisa Struk...</>
                                        ) : (
                                            <><ScanLine className="w-5 h-5" /> Proses dengan AI</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── SCAN RESULT ───────────────────────────────────── */}
                        {scanResult && !isSuccess && (
                            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
                                <div className="brutal-card p-6 bg-[var(--bg-card)]">
                                    <div className="flex flex-col gap-4 mb-6 pb-6 border-b-[3px] border-dashed border-[var(--neo-ink)]">

                                        {/* ─ Document type badge ─ */}
                                        <div className="flex items-center gap-2">
                                            {scanResult.document_type === 'bukti_transfer' ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--neo-sky)] border-2 border-[var(--neo-ink)] font-black text-[var(--text-primary)] text-xs shadow-[2px_2px_0_var(--neo-ink)]">🏦 Bukti Transfer</span>
                                            ) : scanResult.document_type === 'tagihan' ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--neo-lav)] border-2 border-[var(--neo-ink)] font-black text-[var(--text-primary)] text-xs shadow-[2px_2px_0_var(--neo-ink)]">📄 Tagihan</span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--neo-mint)] border-2 border-[var(--neo-ink)] font-black text-[var(--text-primary)] text-xs shadow-[2px_2px_0_var(--neo-ink)]">🧾 Struk Belanja</span>
                                            )}
                                        </div>

                                        {/* ─ Transfer direction toggle ─ */}
                                        {scanResult.document_type === 'bukti_transfer' && (
                                            <div className="flex border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)]">
                                                <button
                                                    onClick={() => handleResultChange('transaction_type', 'pengeluaran')}
                                                    className={`flex-1 py-2.5 text-xs font-black transition-colors border-r-2 border-[var(--neo-ink)] ${
                                                        scanResult.transaction_type === 'pengeluaran'
                                                            ? 'bg-[var(--neo-peach)] text-[var(--text-primary)]'
                                                            : 'bg-white text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'
                                                    }`}
                                                >
                                                    ↑ Transfer Keluar
                                                </button>
                                                <button
                                                    onClick={() => handleResultChange('transaction_type', 'pemasukan')}
                                                    className={`flex-1 py-2.5 text-xs font-black transition-colors ${
                                                        scanResult.transaction_type === 'pemasukan'
                                                            ? 'bg-[var(--neo-mint)] text-[var(--text-primary)]'
                                                            : 'bg-white text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'
                                                    }`}
                                                >
                                                    ↓ Terima Transfer
                                                </button>
                                            </div>
                                        )}

                                        <div>
                                            <label className="neo-label">Nama Toko</label>
                                            <input 
                                                type="text"
                                                value={scanResult.store_name}
                                                onChange={(e) => handleResultChange('store_name', e.target.value)}
                                                className="w-full text-xl font-black text-[var(--text-primary)] bg-transparent border-b-4 border-[var(--neo-ink)] focus:bg-[var(--neo-yellow)] outline-none py-1 px-2 transition-colors"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="neo-label">Tanggal</label>
                                                <input 
                                                    type="date"
                                                    value={scanResult.date}
                                                    onChange={(e) => handleResultChange('date', e.target.value)}
                                                    className="w-full font-bold text-[var(--text-primary)] bg-transparent border-b-[3px] border-[var(--neo-ink)] focus:bg-[var(--neo-yellow)] outline-none py-1 px-2 transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label className="neo-label">Total Belanja</label>
                                                <div className="flex items-center border-b-[3px] border-[var(--neo-ink)] focus-within:bg-[var(--neo-yellow)] transition-colors py-1 px-2">
                                                    <span className="font-black mr-1">Rp</span>
                                                    <input 
                                                        type="text"
                                                        value={scanResult.total.toLocaleString('id-ID')}
                                                        onChange={(e) => handleResultChange('total', parseInt(e.target.value.replace(/\./g, '')) || 0)}
                                                        className="w-full text-xl font-black text-[var(--text-primary)] bg-transparent outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* ─ Keterangan transfer ─ */}
                                        {scanResult.document_type === 'bukti_transfer' && (
                                            <div>
                                                <label className="neo-label">Keterangan Transfer</label>
                                                <input
                                                    type="text"
                                                    value={scanResult.description || ''}
                                                    onChange={(e) => handleResultChange('description', e.target.value)}
                                                    placeholder="Keterangan transfer..."
                                                    className="w-full font-bold text-sm text-[var(--text-primary)] bg-transparent border-b-[3px] border-[var(--neo-ink)] focus:bg-[var(--neo-yellow)] outline-none py-1 px-2 transition-colors"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Detail item hanya tampil untuk struk & tagihan */}
                                    {scanResult.document_type !== 'bukti_transfer' && (
                                    <div className="mb-6">
                                        <h3 className="neo-label flex items-center justify-between">
                                            Detail Item
                                        </h3>
                                        <div className="space-y-3">
                                            {scanResult.items.map((item: any, idx: number) => (
                                                <div key={idx} className="flex flex-col gap-2 p-3 bg-white border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] focus-within:bg-[var(--neo-yellow)] transition-colors relative">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <input 
                                                            type="text"
                                                            value={item.name}
                                                            onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                                                            className="w-full text-sm font-black text-[var(--text-primary)] bg-transparent outline-none border-b-2 border-transparent focus:border-[var(--neo-ink)]"
                                                            placeholder="Nama Item"
                                                        />
                                                        <button 
                                                            onClick={() => handleDeleteItem(idx)}
                                                            className="w-6 h-6 flex items-center justify-center bg-[var(--neo-peach)] border-2 border-[var(--neo-ink)] rounded-[4px] shadow-[1px_1px_0_var(--neo-ink)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all text-[var(--text-primary)]"
                                                            title="Hapus Item"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                    <div className="flex justify-between items-center text-sm mt-1">
                                                        {/* Kiri: qty x @harga satuan */}
                                                        <div className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
                                                            <span className="text-xs font-black">x</span>
                                                            <input 
                                                                type="number"
                                                                value={item.qty}
                                                                onChange={(e) => handleItemChange(idx, 'qty', parseInt(e.target.value) || 0)}
                                                                className="w-12 bg-white border-2 border-[var(--neo-ink)] shadow-[1px_1px_0_var(--neo-ink)] text-center text-xs outline-none py-0.5 font-black"
                                                            />
                                                            <span className="text-xs">@Rp</span>
                                                            <input 
                                                                type="text"
                                                                value={item.price.toLocaleString('id-ID')}
                                                                onChange={(e) => handleItemChange(idx, 'price', parseInt(e.target.value.replace(/\./g, '')) || 0)}
                                                                className="w-24 bg-white border-2 border-[var(--neo-ink)] shadow-[1px_1px_0_var(--neo-ink)] text-right text-xs px-1 outline-none py-0.5 font-black"
                                                            />
                                                        </div>
                                                        {/* Kanan: subtotal (read-only) */}
                                                        <div className="flex items-center gap-0.5 font-black">
                                                            <span className="text-xs">Rp</span>
                                                            <span className="text-sm tabular-nums">
                                                                {(item.qty * item.price).toLocaleString('id-ID')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {scanResult.items.length === 0 && (
                                                <p className="text-sm font-bold text-[var(--text-muted)] text-center py-2">Tidak ada detail item yang terdeteksi.</p>
                                            )}
                                        </div>
                                    </div>
                                    )} {/* end: detail item for non-transfer */}

                                    {/* ── BREAKDOWN DISKON & BIAYA TAMBAHAN ── */}
                                    {(scanResult.discount > 0 || scanResult.extra_fees > 0) && (
                                        <div className="brutal-card-sm p-4 space-y-2 bg-[var(--neo-yellow)] mb-6">
                                            <div className="flex justify-between text-sm font-bold text-[var(--text-primary)]">
                                                <span>Subtotal Item</span>
                                                <span>Rp {scanResult.items.reduce((a: number, i: any) => a + i.qty * i.price, 0).toLocaleString('id-ID')}</span>
                                            </div>
                                            {scanResult.discount > 0 && (
                                                <div className="flex justify-between text-sm font-black text-emerald-800">
                                                    <span>Diskon / Voucher</span>
                                                    <span>- Rp {scanResult.discount.toLocaleString('id-ID')}</span>
                                                </div>
                                            )}
                                            {scanResult.extra_fees > 0 && (
                                                <div className="flex justify-between text-sm font-bold text-[var(--text-primary)]">
                                                    <span>Biaya Tambahan (Ongkir, dll)</span>
                                                    <span>+ Rp {scanResult.extra_fees.toLocaleString('id-ID')}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-sm font-black pt-2 border-t-2 border-[var(--neo-ink)]">
                                                <span>Total Dibayar</span>
                                                <span>Rp {scanResult.total.toLocaleString('id-ID')}</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-4 pt-6 border-t-[3px] border-dashed border-[var(--neo-ink)]">
                                        <div>
                                            <label className="neo-label">Kategori Pengeluaran</label>
                                            <select
                                                value={scanResult.category}
                                                onChange={(e) => handleResultChange('category', e.target.value)}
                                                className="w-full px-4 py-3 bg-white border-[3px] border-[var(--neo-ink)] shadow-[4px_4px_0_var(--neo-ink)] font-black outline-none transition-all appearance-none cursor-pointer"
                                            >
                                                <option value={scanResult.category}>{scanResult.category}</option>
                                                {CATEGORIES.pengeluaran.filter(c => c.name !== scanResult.category).map((cat, idx) => (
                                                    <option key={idx} value={cat.name}>{cat.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="neo-label">Pilih Dompet Pengeluaran</label>
                                            <select
                                                value={selectedWalletId}
                                                onChange={(e) => setSelectedWalletId(e.target.value)}
                                                className="w-full px-4 py-3 bg-white border-[3px] border-[var(--neo-ink)] shadow-[4px_4px_0_var(--neo-ink)] font-black outline-none transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="" disabled>Pilih dompet...</option>
                                                {wallets.map(w => (
                                                    <option key={w.id} value={w.id}>{w.name} (Rp {w.balance.toLocaleString('id-ID')})</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={resetState} className="brutal-btn !bg-white text-[var(--text-primary)] !py-4">
                                        Ulangi Foto
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="brutal-btn !bg-[var(--neo-mint)] text-[var(--text-primary)] !py-4 flex items-center justify-center gap-2"
                                    >
                                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                        Simpan
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </main>
    )
}
