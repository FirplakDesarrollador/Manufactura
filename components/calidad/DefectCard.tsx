'use client'

import React from 'react'

interface DefectCardProps {
    index: number
    title: string
    count: number
    isSelected: boolean
    onToggle: (selected: boolean) => void
    alarmColor?: 'none' | 'yellow' | 'blue' | 'red'
}

export const DefectCard: React.FC<DefectCardProps> = ({
    index,
    title,
    count,
    isSelected,
    onToggle,
    alarmColor = 'none'
}) => {
    // Determine the base styles based on alarmColor and isSelected
    let cardClasses = 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
    let countClasses = 'bg-gray-100 text-gray-600'
    let toggleBgClasses = 'bg-gray-200'

    if (isSelected) {
        cardClasses = 'bg-[#324354] border-[#324354] text-white shadow-md transform scale-[1.02] z-10 relative'
        countClasses = 'bg-white/20 text-white'
        toggleBgClasses = 'bg-[#36A284]'
    } else {
        if (alarmColor === 'red') {
            cardClasses = 'bg-red-50 border-red-500 text-red-900 hover:bg-red-100 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
            countClasses = 'bg-red-500 text-white'
        } else if (alarmColor === 'blue') {
            cardClasses = 'bg-blue-50 border-blue-500 text-blue-900 hover:bg-blue-100 shadow-[0_0_8px_rgba(59,130,246,0.4)]'
            countClasses = 'bg-blue-500 text-white'
        } else if (alarmColor === 'yellow') {
            cardClasses = 'bg-yellow-50 border-yellow-500 text-yellow-900 hover:bg-yellow-100 shadow-[0_0_8px_rgba(234,179,8,0.4)]'
            countClasses = 'bg-yellow-500 text-white'
        }
    }

    return (
        <button
            onClick={() => onToggle(!isSelected)}
            className={`p-3 border transition-all duration-300 flex flex-col justify-between w-full text-left min-h-[90px] ${cardClasses}`}
        >
            <div className="mb-2">
                <h3 className="text-sm font-medium leading-tight">
                    {title}
                </h3>
            </div>

            <div className="flex justify-between items-center w-full mt-auto">
                {/* Toggle Switch */}
                <div className={`w-9 h-5 rounded-full p-0.5 flex items-center transition-colors ${toggleBgClasses}`}>
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${
                        isSelected ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                </div>

                {/* Count Pill */}
                <div className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${countClasses}`}>
                    {count}
                </div>
            </div>
        </button>
    )
}
