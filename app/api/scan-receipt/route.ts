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

    const prompt = `Kamu adalah AI analis struk belanja. Ekstrak informasi dari gambar struk ini dalam format JSON:
{
  "store_name": "nama toko",
  "date": "YYYY-MM-DD",
  "total": angka_total,
  "items": [{ "name": "nama item", "price": harga, "qty": jumlah }],
  "category": "kategori yang sesuai dari list: Kebutuhan Dapur / Makan di Luar / Belanja / Kesehatan / Lainnya"
}
Jika gambar bukan struk atau tidak terbaca, kembalikan { "error": "pesan error kenapa tidak terbaca atau bukan struk" }
HANYA KEMBALIKAN JSON SAJA TANPA MARKDOWN atau TEKS LAIN.`

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
        // Remove markdown formatting if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim()
        parsedData = JSON.parse(jsonStr)
    } catch (e) {
        console.error('Failed to parse Gemini response:', text)
        return NextResponse.json({ error: 'Gagal memproses hasil dari AI' }, { status: 500 })
    }
    
    if (parsedData.error) {
        return NextResponse.json({ error: parsedData.error }, { status: 400 })
    }

    return NextResponse.json({ data: parsedData })
  } catch (error: any) {
    console.error('Error scanning receipt:', error)
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan saat memproses gambar' }, { status: 500 })
  }
}
