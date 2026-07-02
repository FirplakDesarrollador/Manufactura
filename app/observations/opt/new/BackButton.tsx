'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

export default function BackButton() {
    const router = useRouter()
    return (
        <button
            type="button"
            onClick={() => router.back()}
            className="text-white hover:opacity-70 transition-opacity flex items-center"
            aria-label="Atrás"
        >
            <ChevronLeft size={28} strokeWidth={2.5} />
        </button>
    )
}
