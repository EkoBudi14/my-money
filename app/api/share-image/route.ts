import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/share-image?id=<uuid>
 * 
 * Diakses oleh client (scan-receipt page) untuk mengambil gambar
 * yang disimpan sementara oleh /share-target route handler di database.
 * 
 * Setelah data diambil, entry langsung dihapus dari DB (one-time retrieval).
 * Jika ID tidak ditemukan, return 404.
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
        return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 })
    }

    // 1. Ambil data dari Supabase
    const { data, error } = await supabase
        .from('temp_shared_images')
        .select('base64_data')
        .eq('id', id)
        .single()

    // Tidak ditemukan atau error
    if (error || !data) {
        return NextResponse.json({ error: 'Image not found or already retrieved' }, { status: 404 })
    }

    // 2. Hapus setelah diambil (one-time retrieval — cegah reuse & hemat db)
    await supabase.from('temp_shared_images').delete().eq('id', id)

    return NextResponse.json({ dataUrl: data.base64_data })
}
