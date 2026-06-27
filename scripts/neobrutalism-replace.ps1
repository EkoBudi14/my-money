# Neobrutalism CSS Class Replacement Script
# Run from: d:\apps_project\project_pribadi\my-money
# Usage: .\scripts\neobrutalism-replace.ps1

$basePath = "d:\apps_project\project_pribadi\my-money"

$files = @(
    "$basePath\app\page.tsx",
    "$basePath\app\analytics\page.tsx",
    "$basePath\app\wallets\page.tsx",
    "$basePath\app\main-savings\page.tsx",
    "$basePath\app\budgets\page.tsx",
    "$basePath\app\goals\page.tsx",
    "$basePath\app\notes\page.tsx",
    "$basePath\app\transaction\page.tsx",
    "$basePath\app\scan-receipt\page.tsx",
    "$basePath\app\voice-transaction\page.tsx"
)

foreach ($file in $files) {
    if (-not (Test-Path $file)) {
        Write-Host "SKIP (not found): $file"
        continue
    }

    $content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
    $orig = $content
    $count = 0

    function ReplaceAndCount {
        param($text, $old, $new)
        $result = $text.Replace($old, $new)
        if ($result -ne $text) {
            $script:count++
        }
        return $result
    }

    # ======================================================
    # BATCH 1 — Main Card Patterns (page.tsx specific)
    # ======================================================
    
    # Mobile stat cards p-4
    $content = ReplaceAndCount $content `
        'bg-white dark:bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border-default)] shadow-sm' `
        'brutal-card-sm p-4'

    # Desktop stats grid cards (long pattern)
    $content = ReplaceAndCount $content `
        'flex flex-col rounded-2xl border border-[var(--border-default)] p-6 gap-3 bg-white dark:bg-[var(--bg-card)] hover:shadow-sm transition-all duration-300 group' `
        'brutal-card flex flex-col p-6 gap-3 group'

    # Transaction list with max-h scrollable
    $content = ReplaceAndCount $content `
        'bg-white dark:bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] shadow-sm overflow-hidden max-h-[420px] overflow-y-auto custom-scrollbar' `
        'brutal-card overflow-hidden max-h-[420px] overflow-y-auto custom-scrollbar'

    # Container overflow-hidden only
    $content = ReplaceAndCount $content `
        'bg-white dark:bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] shadow-sm overflow-hidden' `
        'brutal-card overflow-hidden'

    # Card p-4 with shadow
    $content = ReplaceAndCount $content `
        'bg-white dark:bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] shadow-sm p-4' `
        'brutal-card p-4'

    # Card p-5 with shadow
    $content = ReplaceAndCount $content `
        'bg-white dark:bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] shadow-sm p-5' `
        'brutal-card p-5'

    # Card p-6 with shadow
    $content = ReplaceAndCount $content `
        'bg-white dark:bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] shadow-sm p-6' `
        'brutal-card p-6'

    # Generic bare card (remaining shadow-sm variants)
    $content = ReplaceAndCount $content `
        'bg-white dark:bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] shadow-sm' `
        'brutal-card'

    # Card p-4 no shadow variant
    $content = ReplaceAndCount $content `
        'bg-white dark:bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] p-4' `
        'brutal-card p-4'

    # ======================================================
    # BATCH 2 — Analytics-style p-6 rounded-2xl variants
    # ======================================================

    # analytics stats cards (p-6 before rounded)
    $content = ReplaceAndCount $content `
        'bg-white dark:bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border-default)] hover:shadow-sm transition-all duration-300 group' `
        'brutal-card p-6 group'

    # ======================================================
    # BATCH 3 — Control Bars & Search Bars
    # ======================================================

    # Analytics control bar (flex-col md:flex-row)
    $content = ReplaceAndCount $content `
        'flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border-default)] shadow-sm' `
        'brutal-card flex flex-col md:flex-row justify-between items-center gap-4 p-4'

    # Search bar container
    $content = ReplaceAndCount $content `
        'flex items-center gap-3 bg-white dark:bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl px-4 py-3 shadow-sm' `
        'brutal-card-sm flex items-center gap-3 px-4 py-3'

    # Search results dropdown
    $content = ReplaceAndCount $content `
        'mt-2 bg-white dark:bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] shadow-lg overflow-hidden' `
        'mt-2 brutal-card overflow-hidden'

    # ======================================================
    # BATCH 4 — Filter / Settings Panels
    # ======================================================

    # Analytics filter panel (with relative z-20)
    $content = ReplaceAndCount $content `
        'relative z-20 w-full md:max-w-sm md:ml-auto lg:fixed lg:right-8 lg:top-32 lg:z-50 bg-white dark:bg-[var(--bg-card)] rounded-2xl shadow-xl border border-[var(--border-default)] p-5 animate-in fade-in zoom-in-95 duration-200' `
        'relative z-20 w-full md:max-w-sm md:ml-auto lg:fixed lg:right-8 lg:top-32 lg:z-50 brutal-card p-5 animate-in fade-in zoom-in-95 duration-200'

    # Dashboard filter panel (desktop)
    $content = ReplaceAndCount $content `
        'w-full md:max-w-sm md:ml-auto lg:fixed lg:right-8 lg:top-32 lg:z-50 bg-white dark:bg-[var(--bg-card)] rounded-2xl shadow-xl border border-slate-100 dark:border-[var(--border-default)] p-5 animate-in fade-in zoom-in-95 duration-200' `
        'w-full md:max-w-sm md:ml-auto lg:fixed lg:right-8 lg:top-32 lg:z-50 brutal-card p-5 animate-in fade-in zoom-in-95 duration-200'

    # Mobile Settings Panel (page.tsx line 1831)
    $content = ReplaceAndCount $content `
        'mx-4 mt-3 bg-white dark:bg-[var(--bg-card)] rounded-2xl shadow-lg border border-slate-100 dark:border-[var(--border-default)] p-4 animate-in fade-in zoom-in-95 duration-200' `
        'mx-4 mt-3 brutal-card p-4 animate-in fade-in zoom-in-95 duration-200'

    # ======================================================
    # BATCH 5 — Mobile Hero Card (add neo border, keep gradient)
    # ======================================================
    $content = ReplaceAndCount $content `
        'mx-4 mt-4 rounded-2xl bg-gradient-to-br from-[#165DFF] to-[#0E4BD9] p-5 shadow-lg shadow-blue-500/20 relative overflow-hidden' `
        'mx-4 mt-4 rounded-[24px] bg-gradient-to-br from-[#165DFF] to-[#0E4BD9] p-5 relative overflow-hidden border-[3px] border-[#141414] shadow-[6px_6px_0_#141414]'

    # ======================================================
    # BATCH 6 — Notes / Warning Cards
    # ======================================================
    $content = ReplaceAndCount $content `
        'mx-4 mt-4 block rounded-2xl border border-[#FED71F] dark:border-amber-700/50 bg-[#FEF9C3] dark:bg-amber-950/30 p-3' `
        'mx-4 mt-4 block rounded-[20px] border-[3px] border-[#141414] bg-[var(--neo-yellow)] dark:bg-[var(--neo-yellow)] p-3'

    # Warning banner (amber-50)
    $content = ReplaceAndCount $content `
        'mx-4 mt-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/30 rounded-2xl' `
        'mx-4 mt-4 bg-[var(--neo-yellow)] border-[3px] border-[#141414] rounded-[20px]'

    # ======================================================
    # BATCH 7 — Page Headers
    # ======================================================
    # Sticky headers used on all pages
    $content = ReplaceAndCount $content `
        'sticky top-0 z-30 flex items-center justify-between w-full h-[70px] md:h-[90px] shrink-0 border-b border-[var(--border-default)] bg-white dark:bg-[var(--bg-card)] px-5 md:px-8' `
        'sticky top-0 z-30 flex items-center justify-between w-full h-[70px] md:h-[90px] shrink-0 border-b-[3px] border-[var(--border-strong)] bg-[var(--bg-card)] px-5 md:px-8'

    # ======================================================
    # BATCH 8 — Additional shadow-lg card variants
    # ======================================================
    $content = ReplaceAndCount $content `
        'bg-white dark:bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] shadow-lg overflow-hidden' `
        'brutal-card overflow-hidden'

    $content = ReplaceAndCount $content `
        'bg-white dark:bg-[var(--bg-card)] rounded-2xl shadow-lg border border-[var(--border-default)]' `
        'brutal-card'

    # ======================================================
    # BATCH 9 — Analytics comparison / table cards
    # ======================================================
    # Period comparison card
    $content = ReplaceAndCount $content `
        'bg-white dark:bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] overflow-hidden' `
        'brutal-card overflow-hidden'

    # Wallet breakdown accordion
    $content = ReplaceAndCount $content `
        'bg-white dark:bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] overflow-hidden shadow-sm' `
        'brutal-card overflow-hidden'

    # ======================================================
    # Write file back
    # ======================================================
    if ($content -ne $orig) {
        [System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
        Write-Host "✅ Updated ($count replacements): $file"
    } else {
        Write-Host "⚪ No changes: $file"
    }
}

Write-Host ""
Write-Host "=== DONE ==="
