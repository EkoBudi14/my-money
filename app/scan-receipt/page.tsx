'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Upload, X, Loader2, ScanLine, Save, CheckCircle2, FlipHorizontal, Trash2, Clipboard, ChevronLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { useIsWeb } from '@/hooks/useIsWeb'
import { Wallet, CATEGORIES } from '@/types'
import NeoSelect from '@/components/NeoSelect'
import DatePickerNeo from '@/components/DatePickerNeo'

export default function ScanReceiptPage() {
    const router = useRouter()
    const { showToast } = useToast()
    const isWeb = useIsWeb()
    
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
            showToast('error', 'Izinkan kamera di pengaturan browser, lalu coba lagi. Atau pilih dari galeri.')
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
        loadImageFile(file)
    }

    // Drag-and-drop on web (DESIGN.md 7.10).
    const [isDragging, setIsDragging] = useState(false)
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) { showToast('error', 'Pilih file gambar (JPG atau PNG).'); return }
        loadImageFile(file)
    }

    const loadImageFile = (file: File) => {
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

    const handleAddItem = () => {
        if (!scanResult) return
        setScanResult({ ...scanResult, items: [...scanResult.items, { name: '', qty: 1, price: 0 }] })
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
            showToast('success', txType === 'pemasukan' ? 'Pemasukan tersimpan' : 'Pengeluaran tersimpan')
        } catch (error: any) {
            showToast('error', error.message || 'Transaksi gagal disimpan. Coba lagi.')
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
        <main className="cd" style={{ minHeight: '100vh', background: 'var(--surface)' }}>

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
            <div className={isWeb ? 'main' : 'top'} style={isWeb ? { paddingBottom: 0 } : { padding: '16px 20px' }}>
                <div className="top-l">
                    {!isWeb && <button onClick={() => router.push('/')} className="icon-btn ghost" aria-label="Kembali"><ChevronLeft className="i" /></button>}
                    <div>
                        <h1 className={isWeb ? 'ptitle' : 'h1'} style={isWeb ? undefined : { fontSize: 20 }}>Scan struk</h1>
                        <p className="sub">{isWeb ? 'Catat pengeluaran dari foto struk, lalu cek sebelum simpan.' : 'Catat pengeluaran dari foto struk'}</p>
                    </div>
                </div>
            </div>

            <div className="scroll" style={isWeb ? { maxWidth: 1240, margin: '0 auto', padding: '20px clamp(16px,3vw,40px) 40px' } : { maxWidth: 640, margin: '0 auto', paddingTop: 0 }}>

                {/* ── SUCCESS ──────────────────────────────────────────────── */}
                {isSuccess ? (
                    <div className="card stack" style={{ textAlign: 'center', alignItems: 'center', padding: '28px 20px' }}>
                        <div className="ic-l" style={{ background: 'var(--income-tint)', color: 'var(--income)' }}><CheckCircle2 className="i i-l" /></div>
                        <h2 className="h2" style={{ marginTop: 4 }}>Berhasil disimpan!</h2>
                        <p className="sub">Transaksi telah ditambahkan ke pengeluaranmu.</p>
                        <div className="stack" style={{ width: '100%', marginTop: 8 }}>
                            <button onClick={resetState} className="btn btn-block">Scan struk lagi</button>
                            <button onClick={() => router.push('/')} className="btn-2 btn-block">Kembali ke beranda</button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="scan-cols">
                        <div className="stack-12" style={{ minWidth: 0 }}>
                        {/* ── UPLOAD AREA ──────────────────────────────────── */}
                        {!image && (
                            <div className="stack-12">
                                <div
                                    className="card stack"
                                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={handleDrop}
                                    style={{ border: `2px dashed ${isDragging ? 'var(--accent)' : 'var(--border-strong)'}`, background: isDragging ? 'var(--accent-tint)' : undefined, alignItems: 'center', textAlign: 'center', padding: isWeb ? '32px 20px' : '28px 20px' }}
                                >
                                    <div className="ic-l" style={{ background: 'var(--accent-tint)', color: 'var(--accent)' }}><Camera className="i i-l" /></div>
                                    <div className="h2" style={{ marginTop: 4 }}>{isWeb ? 'Seret foto struk ke sini' : 'Foto atau unggah struk'}</div>
                                    <div className="sub">Nominal, tanggal, dan kategori diisi otomatis pakai AI. Tinggal cek sebelum simpan.</div>
                                </div>

                                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
                                {isWeb ? (
                                    <>
                                        <button onClick={() => fileInputRef.current?.click()} disabled={isConverting} className="btn btn-block"><Upload className="i i-s" />Pilih file</button>
                                        <div className="g2">
                                            <button onClick={handlePasteFromClipboard} disabled={isConverting} className="btn-2">
                                                {isConverting ? <Loader2 className="i i-s animate-spin" /> : <Clipboard className="i i-s" />}
                                                {isConverting ? 'Memproses…' : 'Tempel (Ctrl+V)'}
                                            </button>
                                            <button onClick={() => openCamera('environment')} disabled={isConverting} className="btn-2"><Camera className="i i-s" />Kamera</button>
                                        </div>
                                        <span className="lbl" style={{ textAlign: 'center' }}>JPG atau PNG. Bisa juga salin gambar lalu tekan Ctrl+V di halaman ini.</span>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => openCamera('environment')} disabled={isConverting} className="btn btn-block"><Camera className="i i-s" />Ambil foto</button>
                                        <div className="g2">
                                            <button onClick={() => fileInputRef.current?.click()} disabled={isConverting} className="btn-2"><Upload className="i i-s" />Galeri</button>
                                            <button onClick={handlePasteFromClipboard} disabled={isConverting} className="btn-2">
                                                {isConverting ? <Loader2 className="i i-s animate-spin" /> : <Clipboard className="i i-s" />}
                                                {isConverting ? 'Memproses…' : 'Tempel'}
                                            </button>
                                        </div>
                                        <span className="lbl" style={{ textAlign: 'center' }}>Tempel: salin foto dari galeri, lalu tekan Tempel.</span>
                                    </>
                                )}

                                {/* ── MANUAL PASTE FALLBACK (iOS PWA) ────────── */}
                                {showManualPaste && (
                                    <div className="card" style={{ border: '2px dashed var(--border-strong)', background: 'var(--accent-tint)' }}>
                                        <p className="t" style={{ whiteSpace: 'normal', textAlign: 'center', marginBottom: 10 }}>iOS memblokir tombol paste. Gunakan cara manual:</p>
                                        <input type="text" inputMode="none" placeholder="Tap sekali, lalu pilih 'Paste'" className="input" style={{ textAlign: 'center' }} />
                                    </div>
                                )}

                            </div>
                        )}

                        {/* ── RATE LIMIT (ScanStatus — quota) ─────────────────── */}
                        {rateLimitInfo && rateLimitCountdown > 0 && (
                            <div className="card stack" style={{ gap: 10 }}>
                                <div className="hstack" style={{ gap: 10 }}>
                                    <div className="ic-s" style={{ background: 'var(--warn-tint)', color: 'var(--warn)' }}><Loader2 className="i i-s" /></div>
                                    <div className="grow">
                                        <div className="t">{rateLimitInfo.isPerDay ? 'Kuota harian habis' : 'Terlalu banyak scan'}</div>
                                        <div className="meta" style={{ whiteSpace: 'normal' }}>
                                            {rateLimitInfo.isPerDay
                                                ? `Reset pukul ${rateLimitInfo.resetTime} WIB.`
                                                : `Bisa scan lagi sekitar pukul ${rateLimitInfo.resetTime} WIB.`}
                                        </div>
                                    </div>
                                </div>
                                <div className="between" style={{ fontSize: 12 }}>
                                    <span className="lbl">Bisa scan lagi dalam</span>
                                    <span className="num-m" style={{ fontSize: 14 }}>
                                        {rateLimitCountdown >= 3600
                                            ? `${Math.floor(rateLimitCountdown / 3600)}j ${Math.floor((rateLimitCountdown % 3600) / 60)}m`
                                            : rateLimitCountdown >= 60
                                                ? `${Math.floor(rateLimitCountdown / 60)}m ${rateLimitCountdown % 60}s`
                                                : `${rateLimitCountdown}s`}
                                    </span>
                                </div>
                                <div className="bar"><div style={{ width: `${(rateLimitCountdown / rateLimitInfo.total) * 100}%` }} /></div>
                            </div>
                        )}

                        {/* ── IMAGE PREVIEW ─────────────────────────────────── */}
                        {image && !scanResult && (
                            <div className="card stack-12" style={{ padding: 0, overflow: 'hidden' }}>
                                <div style={{ position: 'relative', width: '100%', aspectRatio: '3 / 4', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                                    <img src={image} alt="Struk" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                    <button onClick={resetState} className="icon-btn" aria-label="Hapus foto" style={{ position: 'absolute', top: 12, right: 12 }}><X className="i" /></button>
                                </div>
                                <div style={{ padding: 16 }}>
                                    <button onClick={handleScan} disabled={isScanning || rateLimitCountdown > 0} className="btn btn-block">
                                        {isScanning ? <><Loader2 className="i animate-spin" /> Menganalisa struk…</> : <><ScanLine className="i" /> Proses dengan AI</>}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Web: keep the photo visible next to the result (ScanWeb) */}
                        {isWeb && image && scanResult && (
                            <div className="card stack-12" style={{ padding: 0, overflow: 'hidden' }}>
                                <div style={{ width: '100%', aspectRatio: '3 / 4', background: 'var(--surface-2)' }}>
                                    <img src={image} alt="Struk" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                </div>
                                <div style={{ padding: '0 16px 16px' }}><button className="btn-2 btn-block" onClick={resetState} disabled={isSaving}>Scan ulang</button></div>
                            </div>
                        )}
                        </div>
                        <div className="stack-12" style={{ minWidth: 0 }}>
                        {!image && (
                            <div className="stack-12">
                        {/* Tips */}
                        <div className="card stack">
                            <h2 className="h3">Biar hasilnya akurat</h2>
                            {['Foto lurus dari atas, seluruh struk masuk frame', 'Cahaya cukup, tidak ada bayangan di angka total', 'Struk tidak terlipat di bagian total'].map((tip, i) => (
                                <div className="hstack" key={i} style={{ alignItems: 'flex-start', fontSize: 13 }}>
                                    <CheckCircle2 className="i i-s" style={{ color: 'var(--accent)', marginTop: 2 }} />
                                    <span className="grow" style={{ whiteSpace: 'normal' }}>{tip}</span>
                                </div>
                            ))}
                        </div>
                            </div>
                        )}
                        {/* ── SCAN RESULT (ScanCek — editable) ──────────────── */}
                        {scanResult && !isSuccess && (
                            <div className="stack-12" style={{ paddingBottom: 24 }}>
                                <div className="card stack-12">
                                    {/* Document type */}
                                    <div className="hstack">
                                        {scanResult.document_type === 'bukti_transfer' ? (
                                            <span className="badge b-neutral">Bukti transfer</span>
                                        ) : scanResult.document_type === 'tagihan' ? (
                                            <span className="badge b-warn">Tagihan</span>
                                        ) : (
                                            <span className="badge b-ok">Struk belanja</span>
                                        )}
                                    </div>

                                    {/* Transfer direction */}
                                    {scanResult.document_type === 'bukti_transfer' && (
                                        <div className="seg">
                                            <button className={scanResult.transaction_type === 'pengeluaran' ? 'on' : ''} onClick={() => handleResultChange('transaction_type', 'pengeluaran')}>Transfer keluar</button>
                                            <button className={scanResult.transaction_type === 'pemasukan' ? 'on' : ''} onClick={() => handleResultChange('transaction_type', 'pemasukan')}>Terima transfer</button>
                                        </div>
                                    )}

                                    <label className="field">Nama toko
                                        <input className="input" value={scanResult.store_name} onChange={(e) => handleResultChange('store_name', e.target.value)} />
                                    </label>
                                    <div className="g2">
                                        <label className="field">Tanggal
                                            <DatePickerNeo className="input" value={scanResult.date} onChange={(e) => handleResultChange('date', e.target.value)} />
                                        </label>
                                        <div className="field">Total
                                            <div className="input" style={{ gap: 4 }}>
                                                <span className="cur" style={{ color: 'var(--text-2)', fontWeight: 600 }}>Rp</span>
                                                <input
                                                    inputMode="numeric"
                                                    value={scanResult.total.toLocaleString('id-ID')}
                                                    onChange={(e) => handleResultChange('total', parseInt(e.target.value.replace(/\./g, '')) || 0)}
                                                    style={{ border: 0, outline: 0, background: 'transparent', color: 'var(--text)', width: '100%', fontWeight: 700 }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {scanResult.document_type === 'bukti_transfer' && (
                                        <label className="field">Keterangan transfer
                                            <input className="input" value={scanResult.description || ''} placeholder="Keterangan transfer…" onChange={(e) => handleResultChange('description', e.target.value)} />
                                        </label>
                                    )}
                                </div>

                                {/* Item details — struk & tagihan only */}
                                {scanResult.document_type !== 'bukti_transfer' && (
                                    <div className="card stack-12">
                                        <div className="between">
                                            <h3 className="h3">Rincian item</h3>
                                            <button className="link" onClick={handleAddItem}>+ Tambah item</button>
                                        </div>
                                        {scanResult.items.length === 0 ? (
                                            <div className="es" style={{ border: 0, padding: '8px 0' }}>
                                                <span className="t2">Rincian item tidak terbaca</span>
                                                <p>Total tetap bisa disimpan. Tambah item manual kalau perlu.</p>
                                                <button className="btn-2" style={{ height: 40, fontSize: 13 }} onClick={handleAddItem}>Tambah item</button>
                                            </div>
                                        ) : (
                                            <div className="stack">
                                                {scanResult.items.map((item: any, idx: number) => (
                                                    <div className="tile stack" key={idx} style={{ gap: 8 }}>
                                                        <div className="hstack" style={{ gap: 8 }}>
                                                            <input className="input" style={{ height: 38 }} value={item.name} placeholder="Nama item" onChange={(e) => handleItemChange(idx, 'name', e.target.value)} />
                                                            <button className="icon-btn ghost" aria-label="Hapus item" style={{ color: 'var(--danger)', width: 38, height: 38 }} onClick={() => handleDeleteItem(idx)}><Trash2 className="i i-s" /></button>
                                                        </div>
                                                        <div className="between" style={{ fontSize: 13 }}>
                                                            <div className="hstack" style={{ gap: 6 }}>
                                                                <span className="lbl">x</span>
                                                                <input className="input" style={{ height: 34, width: 48, padding: '0 6px' }} inputMode="numeric" value={item.qty} onChange={(e) => handleItemChange(idx, 'qty', parseInt(e.target.value) || 0)} />
                                                                <span className="lbl">@Rp</span>
                                                                <input className="input" style={{ height: 34, width: 96, padding: '0 6px' }} inputMode="numeric" value={item.price.toLocaleString('id-ID')} onChange={(e) => handleItemChange(idx, 'price', parseInt(e.target.value.replace(/\./g, '')) || 0)} />
                                                            </div>
                                                            <span className="num-m" style={{ fontSize: 14 }}>Rp {(item.qty * item.price).toLocaleString('id-ID')}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Discount / fees breakdown */}
                                {(scanResult.discount > 0 || scanResult.extra_fees > 0) && (
                                    <div className="card stack" style={{ gap: 6, fontSize: 13 }}>
                                        <div className="between"><span>Subtotal item</span><span>Rp {scanResult.items.reduce((a: number, i: any) => a + i.qty * i.price, 0).toLocaleString('id-ID')}</span></div>
                                        {scanResult.discount > 0 && <div className="between pos"><span>Diskon / voucher</span><span>− Rp {scanResult.discount.toLocaleString('id-ID')}</span></div>}
                                        {scanResult.extra_fees > 0 && <div className="between"><span>Biaya tambahan</span><span>+ Rp {scanResult.extra_fees.toLocaleString('id-ID')}</span></div>}
                                        <div className="between" style={{ fontWeight: 700, borderTop: '1px solid var(--divider)', paddingTop: 6 }}><span>Total dibayar</span><span>Rp {scanResult.total.toLocaleString('id-ID')}</span></div>
                                    </div>
                                )}

                                {/* Category + wallet */}
                                <div className="card stack-12">
                                    <div className="field">Kategori
                                        <NeoSelect
                                            value={scanResult.category}
                                            onChange={(val) => handleResultChange('category', val)}
                                            options={[{ label: scanResult.category, value: scanResult.category }].concat(
                                                CATEGORIES.pengeluaran.filter(c => c.name !== scanResult.category).map(cat => ({ label: cat.name, value: cat.name }))
                                            )}
                                        />
                                    </div>
                                    <div className="field">Dompet
                                        <NeoSelect
                                            value={selectedWalletId}
                                            onChange={(val) => setSelectedWalletId(val)}
                                            placeholder="Pilih dompet…"
                                            options={wallets.map(w => ({ label: `${w.name} (Rp ${w.balance.toLocaleString('id-ID')})`, value: w.id.toString() }))}
                                        />
                                    </div>
                                </div>

                                <div className="stack">
                                    <button className="btn btn-block" onClick={handleSave} disabled={isSaving}>
                                        {isSaving ? 'Menyimpan…' : <><Save className="i i-s" />Simpan</>}
                                    </button>
                                    <button className="btn-2 btn-block" onClick={resetState} disabled={isSaving}>Ulangi foto</button>
                                </div>
                            </div>
                        )}
                        </div>
                        </div>
                    </>
                )}
            </div>
        </main>
    )
}
