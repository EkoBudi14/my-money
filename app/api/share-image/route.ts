import { NextRequest, NextResponse } from 'next/server'
import { imageStore } from '@/app/share-target/route'

/**
 * GET /api/share-image?id=<uuid>
 * 
 * Diakses oleh client (scan-receipt page) untuk mengambil gambar
 * yang disimpan sementara oleh /share-target route handler.
 * 
 * Setelah data diambil, entry langsung dihapus dari store (one-time retrieval).
 * Jika ID tidak ditemukan atau sudah expired, return 404.
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
        return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 })
    }

    const entry = imageStore.get(id)

    // Tidak ditemukan
    if (!entry) {
        return NextResponse.json({ error: 'Image not found or already retrieved' }, { status: 404 })
    }

    // Sudah expired
    if (entry.expires < Date.now()) {
        imageStore.delete(id)
        return NextResponse.json({ error: 'Image expired. Please share again.' }, { status: 410 })
    }

    // Hapus setelah diambil (one-time retrieval — cegah reuse)
    imageStore.delete(id)

    return NextResponse.json({ dataUrl: entry.data })
}
