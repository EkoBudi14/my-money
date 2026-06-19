import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabase } from '@/lib/supabase'

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

        const shareId = randomUUID()

        // Simpan ke Supabase agar safe antar serverless function
        const { error: dbError } = await supabase
            .from('temp_shared_images')
            .insert({
                id: shareId,
                base64_data: dataUrl
            })

        if (dbError) {
            console.error('[share-target] Supabase Insert Error:', dbError)
            return NextResponse.redirect(new URL('/scan-receipt?error=failed', request.url))
        }

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

