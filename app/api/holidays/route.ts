
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year') || new Date().getFullYear().toString()

    try {
        // Using api-hari-libur from GitHub
        const apiUrl = `https://api-harilibur.vercel.app/api?year=${year}`
        const response = await fetch(apiUrl)

        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`)
        }

        const data = await response.json()

        // Transform the API response to our format
        const holidays: { date: string; name: string; type: string }[] = []

        // The API returns an array of holidays directly
        if (Array.isArray(data)) {
            data.forEach((holiday: any) => {
                if (holiday.holiday_date && holiday.holiday_name) {
                    holidays.push({
                        date: holiday.holiday_date, // Format: YYYY-MM-DD
                        name: holiday.holiday_name,
                        type: holiday.is_national_holiday ? 'National holiday' : 'Observance'
                    })
                }
            })
        }

        console.log(`[Holidays API] Fetched ${holidays.length} holidays for ${year} from api-hari-libur`)
        return NextResponse.json({ holidays })
    } catch (error) {
        console.error('[Holidays API] Error:', error)
        return NextResponse.json({
            error: 'Failed to fetch holidays',
            holidays: []
        }, { status: 500 })
    }
}
