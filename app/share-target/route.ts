import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

/**
 * Server-side ephemeral image store (module-level, in-memory)
 * 
 * Menggantikan pendekatan cookie yang gagal karena batas ukuran cookie ~4KB.
 * Foto dari galeri bisa ratusan KB–MB, jauh melebihi batas cookie.
 * 
 * Arsitektur baru:
 * 1. POST /share-target  → simpan base64 di Map dengan UUID key (TTL 60 detik)
 * 2. Redirect ke /scan-receipt?share_id=UUID
 * 3. Client fetch GET /api/share-image?id=UUID → terima base64, Map entry dihapus
 */
interface ImageEntry {
    data: string
    expires: number
}

// Module-level store: reset setiap server restart — fine untuk TTL 60 detik
const imageStore = new Map<string, ImageEntry>()

function cleanExpiredEntries() {
    const now = Date.now()
    for (const [key, entry] of imageStore) {
        if (entry.expires < now) imageStore.delete(key)
    }
}

/**
 * POST /share-target
 * 
 * Dipanggil otomatis oleh OS Android saat user memilih CatatDuit
 * di share sheet setelah share foto dari galeri.
 */
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('image') as File | null

        // Validasi: harus ada file
        if (!file) {
            return NextResponse.redirect(new URL('/scan-receipt?error=no_image', request.url))
        }

        // Validasi: harus file gambar
        if (!file.type.startsWith('image/')) {
            return NextResponse.redirect(new URL('/scan-receipt?error=invalid_type', request.url))
        }

        // Validasi: max 15MB (sisi server — kompresi dilakukan di client nanti)
        if (file.size > 15 * 1024 * 1024) {
            return NextResponse.redirect(new URL('/scan-receipt?error=too_large', request.url))
        }

        // Konversi file ke base64 data URL
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const base64 = buffer.toString('base64')
        const dataUrl = `data:${file.type};base64,${base64}`

        // Bersihkan entri yang sudah expired sebelum tambah yang baru
        cleanExpiredEntries()

        // Simpan di server-side store dengan UUID key (TTL 60 detik)
        const shareId = randomUUID()
        imageStore.set(shareId, {
            data: dataUrl,
            expires: Date.now() + 60_000 // 60 detik
        })

        // Redirect ke scan-receipt dengan UUID — bukan cookie, tidak ada size limit
        return NextResponse.redirect(new URL(`/scan-receipt?share_id=${shareId}`, request.url))

    } catch (error) {
        console.error('[share-target] Error:', error)
        return NextResponse.redirect(new URL('/scan-receipt?error=failed', request.url))
    }
}

/**
 * GET /share-target
 * 
 * Android melakukan GET request saat mendaftarkan share target di OS.
 * Redirect ke scan-receipt menggunakan URL asal request (bukan hardcode localhost).
 */
export async function GET(request: NextRequest) {
    // Gunakan origin dari request agar tidak hardcode localhost
    const origin = new URL(request.url).origin
    return NextResponse.redirect(new URL('/scan-receipt', origin))
}

// Export imageStore agar bisa diakses oleh /api/share-image route
export { imageStore }
