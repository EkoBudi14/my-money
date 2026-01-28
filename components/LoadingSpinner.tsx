export default function LoadingSpinner() {
    return (
        <div className="inline-flex items-center gap-2">
            <div className="w-5 h-5 border-3 border-current border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium">Memproses...</span>
        </div>
    )
}
