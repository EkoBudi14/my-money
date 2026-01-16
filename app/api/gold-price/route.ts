import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

export async function GET() {
    try {
        // Strategy: Scrape Lakuemas.com
        const url = 'https://www.lakuemas.com/'

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            next: { revalidate: 3600 }
        })

        if (!response.ok) {
            throw new Error(`Failed to fetch source: ${response.status}`)
        }

        const html = await response.text()
        const $ = cheerio.load(html)

        let buyPriceText = ''
        let sellPriceText = ''

        // Logic: Find "HARGA BELI EMAS HARI INI" and "HARGA JUAL EMAS HARI INI"

        $('h2, h3, div, span, p').each((i, el) => {
            const text = $(el).text().toUpperCase()

            // HARGA BELI (Purchase Price)
            if (text.includes('HARGA BELI EMAS HARI INI')) {
                const nextEl = $(el).next()
                const nextText = nextEl.text()
                if (nextText.includes('IDR')) {
                    buyPriceText = nextText
                } else {
                    const parentNext = $(el).parent().next().find('h3, .price, div')
                    if (parentNext.text().includes('IDR')) buyPriceText = parentNext.text()
                }
            }

            // HARGA JUAL (Selling Price)
            if (text.includes('HARGA JUAL EMAS HARI INI')) {
                const nextEl = $(el).next()
                const nextText = nextEl.text()
                if (nextText.includes('IDR')) {
                    sellPriceText = nextText
                } else {
                    const parentNext = $(el).parent().next().find('h3, .price, div')
                    if (parentNext.text().includes('IDR')) sellPriceText = parentNext.text()
                }
            }
        })

        // Fallback regex (scan whole body if selectors fail)
        if (!buyPriceText || !sellPriceText) {
            const bodyText = $('body').text()
            // Regex to find "HARGA BELI ... IDR 1,234,567" locally is hard because of layout
            // But based on Lakuemas simple text dump:
            // "HARGA BELI EMAS HARI INI IDR 2,558,000"

            const buyMatch = bodyText.match(/HARGA BELI EMAS HARI INI[\s\S]{0,50}IDR\s*([0-9,.]+)/i)
            if (buyMatch && !buyPriceText) buyPriceText = buyMatch[1]

            const sellMatch = bodyText.match(/HARGA JUAL EMAS HARI INI[\s\S]{0,50}IDR\s*([0-9,.]+)/i)
            if (sellMatch && !sellPriceText) sellPriceText = sellMatch[1]
        }

        if (!buyPriceText && !sellPriceText) {
            throw new Error('Price elements not found')
        }

        const parsePrice = (txt: string) => {
            if (!txt) return 0
            return parseInt(txt.replace(/[^0-9]/g, ''))
        }

        const buyPrice = parsePrice(buyPriceText)
        const sellPrice = parsePrice(sellPriceText)

        return NextResponse.json({
            success: true,
            buyPrice,
            sellPrice,
            source: 'Lakuemas.com',
            lastUpdate: new Date().toISOString()
        })

    } catch (error: any) {
        console.error('Scrape Error:', error.message)
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 })
    }
}
