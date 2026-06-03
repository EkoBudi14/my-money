import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API Key is not configured' }, { status: 500 })
    }

    const body = await req.json()
    const { audioBase64, mimeType } = body

    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return NextResponse.json({ error: 'Audio data tidak ditemukan' }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

    const today = new Date().toISOString().split('T')[0]

    const prompt = `Kamu adalah AI asisten keuangan pribadi. Tugasmu adalah mendengarkan rekaman suara dari pengguna dan mengekstrak informasi transaksi keuangan. Bahasa yang digunakan adalah bahasa Indonesia (mungkin informal, singkat, atau ambigu).

Tanggal hari ini: ${today}

Tugas:
1. Dengarkan audio yang dilampirkan.
2. Transkripsi apa yang diucapkan (simpan di field "transcript").
3. Ekstrak informasi transaksi (bisa lebih dari satu) dan kembalikan HANYA JSON dengan format berikut:

{
  "transcript": "teks lengkap yang kamu dengar dari audio",
  "transactions": [
    {
      "type": "pengeluaran",
      "title": "judul singkat transaksi (maks 50 karakter)",
      "amount": angka_nominal_tanpa_titik_koma,
      "category": "salah satu dari: Kebutuhan Dapur / Makan di Luar / Transportasi / Tempat Tinggal / Tagihan / Belanja / Kesehatan / Cicilan & Utang / Pribadi & Hiburan / Edukasi & Donasi / Lainnya",
      "date": "YYYY-MM-DD",
      "notes": "catatan tambahan jika ada, string kosong jika tidak ada",
      "wallet": "nama dompet/rekening jika disebut (contoh: BCA, Gopay, Tunai), kosongkan jika tidak disebut"
    },
    {
      "type": "pemasukan",
      "title": "judul singkat transaksi (maks 50 karakter)",
      "amount": angka_nominal_tanpa_titik_koma,
      "category": "salah satu dari: Gaji / Bonus & Hadiah / Investasi / Penjualan / Lainnya",
      "date": "YYYY-MM-DD",
      "notes": "catatan tambahan jika ada, string kosong jika tidak ada",
      "wallet": "nama dompet/rekening jika disebut (contoh: BCA, Gopay, Tunai), kosongkan jika tidak disebut"
    },
    {
      "type": "topup",
      "title": "judul singkat transaksi (maks 50 karakter)",
      "amount": angka_nominal_tanpa_titik_koma,
      "category": "Transfer",
      "date": "YYYY-MM-DD",
      "notes": "catatan tambahan jika ada, string kosong jika tidak ada",
      "source_wallet": "dari dompet mana jika disebut, kosongkan jika tidak",
      "destination_wallet": "ke dompet mana jika disebut, kosongkan jika tidak"
    }
  ]
}

Jika tidak bisa mengidentifikasi transaksi dengan jelas dari suaranya:
{ "error": "penjelasan singkat kenapa tidak bisa diproses" }

Aturan penting:
- "amount" harus angka bulat tanpa titik/koma, contoh: 35000 bukan "35.000" atau "35,000"
- Jika user menyebutkan beberapa transaksi, masukkan semuanya ke dalam array "transactions" KECUALI jika user menggunakan kata kunci penggabungan (misal: "gabung", "digabung", "gabungin", "satuin", "jadiin satu", "sekalian", "totalin", "barengan"). Jika ada kata kunci penggabungan, JUMLAHKAN semua nominal transaksi tersebut dan jadikan HANYA 1 transaksi saja di dalam array "transactions" dengan title gabungan (misal "Bensin dan parkir").
- Jika user sebut "35 ribu" → amount = 35000
- Jika user sebut "1.5 juta" → amount = 1500000
- "title" harus deskriptif tapi singkat, contoh: "Makan siang di warteg", "Bayar ojek online", "Gaji bulan ini"
- Untuk "date": gunakan tanggal hari ini (${today}) jika tidak disebutkan. Jika user bilang "kemarin" gunakan tanggal kemarin. Jika sebut nama hari, hitung mundur dari hari ini.
- Tentukan "type" dari konteks: kata kunci pengeluaran = beli, bayar, makan, ngeluarin, keluar; pemasukan = terima, dapat, masuk, gajian; transfer = transfer, pindahin, topup
- Pilih "category" yang paling sesuai berdasarkan konteks

HANYA kembalikan JSON, tanpa markdown, tanpa penjelasan tambahan.`

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: audioBase64,
          mimeType: mimeType || 'audio/webm',
        },
      },
    ])
    const response = await result.response
    const text_response = response.text()

    // Parse JSON response
    let parsedData
    try {
      let jsonStr = text_response.replace(/```json/gi, '').replace(/```/g, '').trim()
      try {
        parsedData = JSON.parse(jsonStr)
      } catch {
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('No valid JSON found in response')
        }
      }
    } catch {
      console.error('Failed to parse Gemini response:', text_response)
      return NextResponse.json(
        { error: 'AI tidak bisa memahami rekaman suara tersebut. Coba ucapkan lebih jelas.' },
        { status: 500 }
      )
    }

    if (parsedData.error) {
      return NextResponse.json({ error: parsedData.error }, { status: 400 })
    }

    // Validate required fields for multi-transaction
    if (!parsedData.transactions || !Array.isArray(parsedData.transactions) || parsedData.transactions.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada transaksi yang terdeteksi. Coba sebutkan dengan lebih jelas.' },
        { status: 400 }
      )
    }

    // Validate each transaction in the array
    for (const tx of parsedData.transactions) {
      if (!tx.type || !tx.amount || !tx.title) {
        return NextResponse.json(
          { error: 'Ada data transaksi yang tidak lengkap. Coba ulangi dengan menyebutkan jenis, nominal, dan keterangan.' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json({ data: parsedData })
  } catch (error: any) {
    console.error('Error processing voice transaction:', error)

    // Handle rate limit (429)
    const is429 =
      error.status === 429 ||
      error.message?.includes('429') ||
      error.message?.includes('Too Many Requests')

    if (is429) {
      let retryAfterSeconds = 60
      let isPerDay = false
      try {
        if (error.errorDetails) {
          const retryInfo = error.errorDetails.find((d: any) =>
            d['@type']?.includes('RetryInfo')
          )
          if (retryInfo?.retryDelay) {
            const match = retryInfo.retryDelay.match(/(\d+(?:\.\d+)?)s/)
            if (match) retryAfterSeconds = Math.ceil(parseFloat(match[1]))
          }
          isPerDay = error.errorDetails.some((d: any) =>
            d.violations?.some((v: any) => v.quotaId?.includes('PerDay'))
          )
        } else {
          const match = error.message?.match(/retry in (\d+(?:\.\d+)?)s/i)
          if (match) retryAfterSeconds = Math.ceil(parseFloat(match[1]))
        }
      } catch (_) {
        /* ignore */
      }

      return NextResponse.json(
        {
          error: isPerDay ? 'Kuota harian Gemini API habis.' : 'Terlalu banyak request ke AI.',
          retryAfter: retryAfterSeconds,
          isPerDay,
        },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan saat memproses suara' },
      { status: 500 }
    )
  }
}
