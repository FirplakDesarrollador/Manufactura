import React from 'react'

interface MetricCardProps {
    title: string
    value: number | string
    bgColor?: string
    textColor?: string
}

export default function MetricCard({
    title,
    value,
    bgColor = 'bg-blue-500',
    textColor = 'text-white'
}: MetricCardProps) {
    return (
        <div className={`${bgColor} ${textColor} rounded-lg p-2 shadow-sm min-w-[90px] flex-1 flex flex-col items-center justify-center`}>
            <div className="text-[11px] font-bold uppercase mb-1">{title}</div>
            <div className="text-lg font-bold">{value}</div>
        </div>
    )
}
