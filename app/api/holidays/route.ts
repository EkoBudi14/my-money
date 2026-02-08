
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year') || new Date().getFullYear().toString()

    try {
        // Fallback data for Indonesia Holidays
        let fallbackHolidays = []

        if (year === '2026') {
            // Complete 2026 data from Bank Indonesia & SKB 3 Menteri
            // Includes National Holidays and Joint Leave Days (Cuti Bersama)
            fallbackHolidays = [
                // January
                { date: '2026-01-01', name: 'Tahun Baru 2026 Masehi', type: 'National holiday' },
                { date: '2026-01-16', name: 'Isra Mikraj Nabi Muhammad SAW', type: 'National holiday' },
                
                // February
                { date: '2026-02-17', name: 'Tahun Baru Imlek 2577 Kongzili', type: 'National holiday' },
                
                // March
                { date: '2026-03-19', name: 'Hari Suci Nyepi Tahun Baru Saka 1948', type: 'National holiday' },
                { date: '2026-03-20', name: 'Cuti Bersama Idul Fitri', type: 'Observance' },
                { date: '2026-03-21', name: 'Hari Raya Idul Fitri 1447 Hijriah', type: 'National holiday' },
                { date: '2026-03-22', name: 'Hari Raya Idul Fitri 1447 Hijriah', type: 'National holiday' },
                { date: '2026-03-23', name: 'Cuti Bersama Idul Fitri', type: 'Observance' },
                { date: '2026-03-24', name: 'Cuti Bersama Idul Fitri', type: 'Observance' },
                { date: '2026-03-25', name: 'Cuti Bersama Idul Fitri', type: 'Observance' },
                { date: '2026-03-26', name: 'Cuti Bersama Idul Fitri', type: 'Observance' },
                
                // April
                { date: '2026-04-03', name: 'Wafat Yesus Kristus', type: 'National holiday' },
                { date: '2026-04-05', name: 'Kebangkitan Yesus Kristus (Paskah)', type: 'National holiday' },
                
                // May
                { date: '2026-05-01', name: 'Hari Buruh Internasional', type: 'National holiday' },
                { date: '2026-05-14', name: 'Kenaikan Yesus Kristus', type: 'National holiday' },
                { date: '2026-05-15', name: 'Cuti Bersama Hari Raya Waisak', type: 'Observance' },
                { date: '2026-05-27', name: 'Hari Raya Idul Adha 1447 Hijriah', type: 'National holiday' },
                { date: '2026-05-28', name: 'Cuti Bersama Hari Raya Idul Adha', type: 'Observance' },
                
                // June
                { date: '2026-06-01', name: 'Hari Lahir Pancasila', type: 'National holiday' },
                { date: '2026-06-17', name: 'Tahun Baru Islam 1448 Hijriah', type: 'National holiday' },
                
                // August
                { date: '2026-08-17', name: 'Hari Kemerdekaan Republik Indonesia', type: 'National holiday' },
                { date: '2026-08-26', name: 'Maulid Nabi Muhammad SAW', type: 'National holiday' },
                
                // December
                { date: '2026-12-25', name: 'Hari Raya Natal', type: 'National holiday' },
                { date: '2026-12-26', name: 'Cuti Bersama Hari Raya Natal', type: 'Observance' },
            ]
        } else {
            // For other years, only include FIXED holidays (dates don't change year to year)
            // Lunar-based holidays (Imlek, Idul Fitri, Idul Adha, Nyepi, Waisak, etc) are excluded
            // because their dates change every year and would be inaccurate
            fallbackHolidays = [
                { date: `${year}-01-01`, name: 'Tahun Baru Masehi', type: 'National holiday' },
                { date: `${year}-05-01`, name: 'Hari Buruh Internasional', type: 'National holiday' },
                { date: `${year}-06-01`, name: 'Hari Lahir Pancasila', type: 'National holiday' },
                { date: `${year}-08-17`, name: 'Hari Kemerdekaan Republik Indonesia', type: 'National holiday' },
                { date: `${year}-12-25`, name: 'Hari Raya Natal', type: 'National holiday' },
            ]
        }

        // Try to fetch from API
        try {
            const apiUrl = `https://api-harilibur.vercel.app/api?year=${year}`
            const response = await fetch(apiUrl, { next: { revalidate: 86400 } }) // Cache 1 day

            if (response.ok) {
                const data = await response.json()
                if (Array.isArray(data)) {
                    const holidays = data
                        .filter((h: any) => h.holiday_date && h.holiday_name)
                        .map((h: any) => ({
                            date: h.holiday_date,
                            name: h.holiday_name,
                            type: h.is_national_holiday ? 'National holiday' : 'Observance'
                        }))
                    return NextResponse.json({ holidays })
                }
            }
        } catch (apiError) {
            console.warn('[Holidays API] External API failed, using fallback:', apiError)
        }

        // Return fallback if API fails
        return NextResponse.json({ holidays: fallbackHolidays })

    } catch (error) {
        console.error('[Holidays API] Critical Error:', error)
        return NextResponse.json({
            error: 'Failed to fetch holidays',
            holidays: []
        }, { status: 500 })
    }
}
