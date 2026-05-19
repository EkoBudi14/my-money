import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API Key is not configured' }, { status: 500 })
    }

    const body = await req.json()
    const { image } = body // Expected as base64 string

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    // Extract base64 data (remove data:image/jpeg;base64, prefix if present)
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '')
    const mimeType = image.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg'

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

    const prompt = `Kamu adalah AI analis dokumen keuangan. Tentukan jenis dokumen dan ekstrak informasi dalam format JSON.

JENIS DOKUMEN yang dikenali:
- "struk_belanja": Struk/nota pembelian dari toko, minimarket, restoran, kafe, dll
- "bukti_transfer": Bukti transfer bank (BCA, Mandiri, BNI, BRI, GoPay, OVO, DANA, ShopeePay, dll)
- "tagihan": Tagihan/invoice/bill dari layanan (listrik, internet, dll)

FORMAT JSON untuk struk_belanja atau tagihan:
{
  "document_type": "struk_belanja",
  "store_name": "nama toko/merchant",
  "date": "YYYY-MM-DD",
  "total": angka_total_yang_benar_dibayar,
  "items": [{ "name": "nama item", "price": harga_satuan, "qty": jumlah }],
  "category": "pilih dari: Kebutuhan Dapur / Makan di Luar / Belanja / Kesehatan / Lainnya",
  "transaction_type": "pengeluaran",
  "description": "",
  "discount": total_potongan_diskon_voucher_dalam_angka_positif_atau_0,
  "extra_fees": total_biaya_tambahan_seperti_ongkir_biaya_layanan_dll_dalam_angka_positif_atau_0
}
Catatan: "total" adalah jumlah yang benar-benar dibayar user (setelah diskon dan biaya tambahan).

FORMAT JSON untuk bukti_transfer:
{
  "document_type": "bukti_transfer",
  "store_name": "nama penerima transfer",
  "date": "YYYY-MM-DD",
  "total": angka_nominal_transfer,
  "items": [],
  "category": "Transfer",
  "transaction_type": "pengeluaran",
  "description": "keterangan/berita transfer jika ada"
}

Jika gambar tidak terbaca atau bukan dokumen keuangan:
{ "error": "penjelasan singkat kenapa tidak bisa diproses" }

HANYA kembalikan JSON, tanpa markdown atau teks lain.`

    const imageParts = [
      {
        inlineData: {
          data: base64Data,
          mimeType
        }
      }
    ]

    const result = await model.generateContent([prompt, ...imageParts])
    const response = await result.response
    const text = response.text()

    // Parse JSON
    let parsedData
    try {
        // 1. Remove markdown code blocks if present
        let jsonStr = text.replace(/```json/gi, '').replace(/```/g, '').trim()
        
        // 2. Try direct parse first
        try {
            parsedData = JSON.parse(jsonStr)
        } catch {
            // 3. Fallback: extract JSON object/array using regex
            const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
                parsedData = JSON.parse(jsonMatch[0])
            } else {
                throw new Error('No valid JSON found in response')
            }
        }
    } catch (e) {
        console.error('Failed to parse Gemini response:', text)
        return NextResponse.json({ error: 'Gagal memproses hasil dari AI. Coba foto ulang dengan pencahayaan lebih baik.' }, { status: 500 })
    }
    
    if (parsedData.error) {
        return NextResponse.json({ error: parsedData.error }, { status: 400 })
    }

    return NextResponse.json({ data: parsedData })
  } catch (error: any) {
    console.error('Error scanning receipt:', error)

    // Handle rate limit (429) specifically
    const is429 = error.status === 429 || error.message?.includes('429') || error.message?.includes('Too Many Requests')
    if (is429) {
      let retryAfterSeconds = 60
      let isPerDay = false
      try {
        if (error.errorDetails) {
          // Parse retry delay
          const retryInfo = error.errorDetails.find((d: any) => d['@type']?.includes('RetryInfo'))
          if (retryInfo?.retryDelay) {
            const match = retryInfo.retryDelay.match(/(\d+(?:\.\d+)?)s/)
            if (match) retryAfterSeconds = Math.ceil(parseFloat(match[1]))
          }
          // Detect if daily quota (vs per-minute)
          isPerDay = error.errorDetails.some((d: any) =>
            d.violations?.some((v: any) => v.quotaId?.includes('PerDay'))
          )
        } else {
          // Fallback: parse from error message
          const match = error.message?.match(/retry in (\d+(?:\.\d+)?)s/i)
          if (match) retryAfterSeconds = Math.ceil(parseFloat(match[1]))
        }
      } catch (_) { /* ignore parse errors */ }

      return NextResponse.json({
        error: isPerDay ? 'Kuota harian Gemini API habis.' : 'Terlalu banyak request ke AI.',
        retryAfter: retryAfterSeconds,
        isPerDay
      }, { status: 429 })
    }

    return NextResponse.json({ error: error.message || 'Terjadi kesalahan saat memproses gambar' }, { status: 500 })
  }
}
