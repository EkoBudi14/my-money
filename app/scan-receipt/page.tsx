'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Upload, X, Loader2, ScanLine, Save, CheckCircle2, FlipHorizontal } from 'lucide-react'
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

    // Camera state
    const [showCamera, setShowCamera] = useState(false)
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
    const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
    
    const fileInputRef = useRef<HTMLInputElement>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        fetchWallets()
    }, [])

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

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return
        const video = videoRef.current
        const canvas = canvasRef.current
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d')?.drawImage(video, 0, 0)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
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
        const reader = new FileReader()
        reader.onloadend = () => {
            setImage(reader.result as string)
            setScanResult(null)
            setIsSuccess(false)
        }
        reader.readAsDataURL(file)
    }

    // ── SCAN ──────────────────────────────────────────────────────────────────
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
            if (!response.ok || result.error) throw new Error(result.error || 'Gagal memproses struk')
            
            // Format result to ensure properties exist
            const data = result.data
            setScanResult({
                store_name: data.store_name || '',
                date: data.date || new Date().toISOString().split('T')[0],
                total: data.total || 0,
                category: data.category || 'Belanja',
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
            const { data: wallet } = await supabase.from('wallets').select('balance, name').eq('id', walletId).single()
            if (!wallet) throw new Error('Dompet tidak ditemukan')
            if (wallet.balance < scanResult.total) throw new Error(`Saldo tidak mencukupi! Saldo ${wallet.name}: Rp ${wallet.balance.toLocaleString('id-ID')}`)

            const safeDate = new Date(`${scanResult.date}T12:00:00`).toISOString()
            const payload = {
                title: `Belanja di ${scanResult.store_name}`,
                amount: scanResult.total,
                type: 'pengeluaran',
                category: scanResult.category || 'Belanja',
                wallet_id: walletId,
                date: safeDate,
                created_at: new Date().toISOString(),
                is_piutang: false,
                is_talangan: false
            }
            const { error: insertError } = await supabase.from('transactions').insert([payload])
            if (insertError) throw insertError

            await supabase.from('wallets').update({ balance: wallet.balance - scanResult.total }).eq('id', walletId)

            setIsSuccess(true)
            showToast('success', 'Struk berhasil disimpan sebagai pengeluaran!')
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
        <main className="min-h-screen bg-[#EFF2F7] pb-24 md:pb-8">

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
                        <button onClick={capturePhoto} className="w-20 h-20 rounded-full bg-white border-4 border-white/30 shadow-2xl hover:scale-95 transition-transform active:scale-90" />
                        {/* Spacer */}
                        <div className="w-12 h-12" />
                    </div>

                    {/* Hidden canvas for capture */}
                    <canvas ref={canvasRef} className="hidden" />
                </div>
            )}

            {/* ── HEADER ───────────────────────────────────────────────────── */}
            <header className="bg-white px-5 py-4 flex items-center justify-between shadow-sm sticky top-0 z-40 border-b border-[#F3F4F3]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#165DFF]/10 rounded-xl flex items-center justify-center">
                        <ScanLine className="w-5 h-5 text-[#165DFF]" />
                    </div>
                    <div>
                        <h1 className="font-bold text-[#080C1A] text-lg leading-tight">Scan Struk</h1>
                        <p className="text-xs text-[#6A7686]">Catat pengeluaran otomatis pakai AI</p>
                    </div>
                </div>
                <button onClick={() => router.push('/')} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#EFF2F7] text-[#6A7686] hover:bg-slate-200 transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </header>

            <div className="max-w-2xl mx-auto px-5 py-6 space-y-6">

                {/* ── SUCCESS ──────────────────────────────────────────────── */}
                {isSuccess ? (
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#F3F4F3] text-center animate-in zoom-in-95 duration-300">
                        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Berhasil Disimpan!</h2>
                        <p className="text-slate-500 mb-8">Transaksi telah ditambahkan ke pengeluaran Anda.</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={resetState} className="w-full py-3.5 bg-[#165DFF] hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors">
                                Scan Struk Lagi
                            </button>
                            <button onClick={() => router.push('/')} className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors">
                                Kembali ke Dashboard
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* ── UPLOAD AREA ──────────────────────────────────── */}
                        {!image && (
                            <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#F3F4F3] space-y-4">
                                <div className="aspect-[4/3] w-full rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-4 bg-slate-50">
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
                                        <Camera className="w-8 h-8 text-[#165DFF]" />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-semibold text-slate-700">Ambil Foto / Upload Struk</p>
                                        <p className="text-sm text-slate-500 mt-1">Pastikan tulisan terbaca jelas</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Foto — buka kamera via getUserMedia */}
                                    <button
                                        onClick={() => openCamera('environment')}
                                        className="flex items-center justify-center gap-2 py-3.5 bg-[#165DFF] text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
                                    >
                                        <Camera className="w-4 h-4" /> Foto
                                    </button>

                                    {/* Galeri — buka file picker */}
                                    <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center justify-center gap-2 py-3.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                                    >
                                        <Upload className="w-4 h-4" /> Galeri
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── IMAGE PREVIEW ─────────────────────────────────── */}
                        {image && !scanResult && (
                            <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-[#F3F4F3] animate-in fade-in">
                                <div className="relative aspect-[3/4] w-full bg-slate-900">
                                    <img src={image} alt="Struk" className="w-full h-full object-contain" />
                                    <button onClick={resetState} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="p-5">
                                    <button
                                        onClick={handleScan}
                                        disabled={isScanning}
                                        className="w-full py-4 bg-[#165DFF] hover:bg-blue-600 disabled:bg-blue-400 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-200"
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
                                <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#F3F4F3]">
                                    <div className="flex flex-col gap-4 mb-6 pb-6 border-b border-dashed border-slate-200">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Nama Toko</label>
                                            <input 
                                                type="text"
                                                value={scanResult.store_name}
                                                onChange={(e) => handleResultChange('store_name', e.target.value)}
                                                className="w-full text-xl font-bold text-slate-800 bg-transparent border-b border-slate-200 focus:border-[#165DFF] outline-none pb-1 transition-colors"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Tanggal</label>
                                                <input 
                                                    type="date"
                                                    value={scanResult.date}
                                                    onChange={(e) => handleResultChange('date', e.target.value)}
                                                    className="w-full text-slate-700 bg-transparent border-b border-slate-200 focus:border-[#165DFF] outline-none pb-1 transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Total Belanja</label>
                                                <div className="flex items-center border-b border-slate-200 focus-within:border-[#165DFF] transition-colors pb-1">
                                                    <span className="text-[#165DFF] font-bold mr-1">Rp</span>
                                                    <input 
                                                        type="number"
                                                        value={scanResult.total}
                                                        onChange={(e) => handleResultChange('total', parseInt(e.target.value) || 0)}
                                                        className="w-full text-xl font-bold text-[#165DFF] bg-transparent outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider flex items-center justify-between">
                                            Detail Item
                                        </h3>
                                        <div className="space-y-3">
                                            {scanResult.items.map((item: any, idx: number) => (
                                                <div key={idx} className="flex flex-col gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 focus-within:border-slate-300 focus-within:shadow-sm transition-all">
                                                    <input 
                                                        type="text"
                                                        value={item.name}
                                                        onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                                                        className="w-full text-sm font-medium text-slate-800 bg-transparent outline-none"
                                                        placeholder="Nama Item"
                                                    />
                                                    <div className="flex justify-between items-center text-sm">
                                                        <div className="flex items-center gap-2 text-slate-500">
                                                            <span>x</span>
                                                            <input 
                                                                type="number"
                                                                value={item.qty}
                                                                onChange={(e) => handleItemChange(idx, 'qty', parseInt(e.target.value) || 0)}
                                                                className="w-12 bg-white border border-slate-200 rounded text-center outline-none focus:border-[#165DFF]"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-1 font-semibold text-slate-700">
                                                            <span className="text-xs text-slate-400">Rp</span>
                                                            <input 
                                                                type="number"
                                                                value={item.price}
                                                                onChange={(e) => handleItemChange(idx, 'price', parseInt(e.target.value) || 0)}
                                                                className="w-20 bg-white border border-slate-200 rounded text-right px-1 outline-none focus:border-[#165DFF]"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {scanResult.items.length === 0 && (
                                                <p className="text-sm text-slate-500 text-center py-2">Tidak ada detail item yang terdeteksi.</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-6 border-t border-slate-100">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Kategori Pengeluaran</label>
                                            <select
                                                value={scanResult.category}
                                                onChange={(e) => handleResultChange('category', e.target.value)}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-[#165DFF]/20 focus:border-[#165DFF] outline-none transition-all appearance-none"
                                            >
                                                <option value={scanResult.category}>{scanResult.category}</option>
                                                {CATEGORIES.pengeluaran.filter(c => c.name !== scanResult.category).map((cat, idx) => (
                                                    <option key={idx} value={cat.name}>{cat.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Pilih Dompet Pengeluaran</label>
                                            <select
                                                value={selectedWalletId}
                                                onChange={(e) => setSelectedWalletId(e.target.value)}
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#165DFF]/20 focus:border-[#165DFF] outline-none transition-all appearance-none"
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
                                    <button onClick={resetState} className="py-4 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors">
                                        Ulangi Foto
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="py-4 bg-[#165DFF] text-white rounded-xl font-semibold hover:bg-blue-600 disabled:bg-blue-400 transition-colors flex items-center justify-center gap-2"
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
