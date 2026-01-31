import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

export async function GET() {
    try {
        // Strategy: Scrape Lakuemas.com
        const url = 'https://www.lakuemas.com/'

        console.log('[Gold API] Fetching data from:', url)

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            next: { revalidate: 3600 }
        })

        console.log('[Gold API] Response status:', response.status)

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

        console.log('[Gold API] Buy price text found:', buyPriceText)
        console.log('[Gold API] Sell price text found:', sellPriceText)

        // Fallback regex (scan whole body if selectors fail)
        if (!buyPriceText || !sellPriceText) {
            const bodyText = $('body').text()
            // Regex to find "HARGA BELI ... IDR 1,234,567" locally is hard because of layout
            // But based on Lakuemas simple text dump:
            // "HARGA BELI EMAS HARI INI IDR 2,558,000"

            const buyMatch = bodyText.match(/HARGA BELI EMAS HARI INI[\s\S]{0,50}IDR\s*([0-9,.]+)/i)
            if (buyMatch && !buyPriceText) {
                buyPriceText = buyMatch[1]
                console.log('[Gold API] Buy price from regex:', buyPriceText)
            }

            const sellMatch = bodyText.match(/HARGA JUAL EMAS HARI INI[\s\S]{0,50}IDR\s*([0-9,.]+)/i)
            if (sellMatch && !sellPriceText) {
                sellPriceText = sellMatch[1]
                console.log('[Gold API] Sell price from regex:', sellPriceText)
            }
        }

        if (!buyPriceText && !sellPriceText) {
            console.error('[Gold API] Price elements not found in HTML')
            // Return fallback data instead of throwing error
            return NextResponse.json({
                success: true,
                buyPrice: 1480000, // Fallback approximate price
                sellPrice: 1395000,
                source: 'Fallback Data',
                lastUpdate: new Date().toISOString(),
                note: 'Scraping failed, showing approximate price'
            })
        }

        const parsePrice = (txt: string) => {
            if (!txt) return 0
            const cleaned = txt.replace(/[^0-9]/g, '')
            const num = parseInt(cleaned, 10)
            return isNaN(num) ? 0 : num
        }

        const buyPrice = parsePrice(buyPriceText)
        const sellPrice = parsePrice(sellPriceText)

        console.log('[Gold API] Parsed buy price:', buyPrice)
        console.log('[Gold API] Parsed sell price:', sellPrice)

        return NextResponse.json({
            success: true,
            buyPrice,
            sellPrice,
            source: 'Lakuemas.com',
            lastUpdate: new Date().toISOString()
        })

    } catch (error: any) {
        console.error('[Gold API] Scrape Error:', error.message)
        console.error('[Gold API] Full error:', error)

        // Return fallback data instead of error status
        return NextResponse.json({
            success: true,
            buyPrice: 1480000, // Fallback approximate price
            sellPrice: 1395000,
            source: 'Fallback Data',
            lastUpdate: new Date().toISOString(),
            error: error.message,
            note: 'Error occurred, showing approximate price'
        })
    }
}
