'use client'

/** Skeleton primitives (DESIGN-TAMBAHAN.md §6 / PolaState §2). Show only after ~300ms. */
export function Skeleton({ width, height, radius, style }: { width?: number | string; height?: number | string; radius?: number; style?: React.CSSProperties }) {
    return <div className="sk" style={{ width, height, borderRadius: radius, ...style }} />
}

/** List rows skeleton (icon + two text lines + amount). */
export function SkeletonRows({ count = 4 }: { count?: number }) {
    return (
        <div className="card-flush">
            {Array.from({ length: count }).map((_, i) => (
                <div className="row" key={i}>
                    <Skeleton width={40} height={40} radius={12} />
                    <div className="grow stack" style={{ gap: 6 }}>
                        <Skeleton width="55%" height={12} />
                        <Skeleton width="35%" height={10} />
                    </div>
                    <Skeleton width={64} height={12} />
                </div>
            ))}
        </div>
    )
}

/** Card skeletons grid. */
export function SkeletonCards({ count = 4 }: { count?: number }) {
    return (
        <div className="stack-12">
            {Array.from({ length: count }).map((_, i) => (
                <div className="card stack" style={{ gap: 10 }} key={i}>
                    <Skeleton width="50%" height={14} />
                    <Skeleton width="100%" height={10} />
                    <Skeleton width="70%" height={10} />
                </div>
            ))}
        </div>
    )
}

/** Progress-bar skeletons (budgets). */
export function SkeletonBars({ count = 2 }: { count?: number }) {
    return (
        <div className="stack-12">
            {Array.from({ length: count }).map((_, i) => (
                <div className="stack" style={{ gap: 8 }} key={i}>
                    <Skeleton width="40%" height={12} />
                    <Skeleton width="100%" height={8} />
                </div>
            ))}
        </div>
    )
}

/** Tile skeletons grid. */
export function SkeletonTiles({ count = 3 }: { count?: number }) {
    return (
        <div className="g3">
            {Array.from({ length: count }).map((_, i) => (
                <div className="tile stack" style={{ gap: 8 }} key={i}>
                    <Skeleton width="60%" height={12} />
                    <Skeleton width="80%" height={18} />
                </div>
            ))}
        </div>
    )
}

/** Bar-chart skeleton. */
export function SkeletonChart() {
    const heights = ['60%', '80%', '45%', '70%', '55%', '90%']
    return (
        <div className="card" style={{ height: 200, display: 'flex', alignItems: 'flex-end', gap: 14, padding: 20 }}>
            {heights.map((h, i) => <Skeleton key={i} height={h} style={{ flex: 1 }} />)}
        </div>
    )
}
