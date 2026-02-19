'use client'

import React from 'react'

interface DefectCardProps {
    index: number
    title: string
    count: number
    isSelected: boolean
    onToggle: (selected: boolean) => void
}

export const DefectCard: React.FC<DefectCardProps> = ({
    index,
    title,
    count,
    isSelected,
    onToggle,
}) => {
    return (
        <button
            onClick={() => onToggle(!isSelected)}
            className={`relative p-4 border transition-all duration-200 flex flex-col justify-between aspect-square w-full text-left group ${isSelected
                    ? 'bg-[#254153] border-[#254153] text-white shadow-xl z-10'
                    : 'bg-white border-gray-200 text-[#254153] hover:border-[#254153] hover:shadow-md'
                }`}
        >
            <div className="relative z-10 w-full">
                <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] font-bold tracking-tighter px-1.5 py-0.5 border ${isSelected ? 'border-blue-400 text-blue-300' : 'border-gray-200 text-gray-400'
                        }`}>
                        {index.toString().padStart(2, '0')}
                    </span>

                    <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]' : 'bg-gray-100'}`} />
                </div>

                <h3 className={`text-xs font-black leading-tight uppercase tracking-tight break-words ${isSelected ? 'text-white' : 'text-[#254153]'
                    }`}>
                    {title}
                </h3>
            </div>

            <div className="relative z-10 flex flex-col items-end w-full">
                <span className={`text-[8px] uppercase font-bold tracking-widest mb-1 ${isSelected ? 'text-white/40' : 'text-gray-300'
                    }`}>
                    Count Today
                </span>
                <div
                    className={`text-4xl font-black leading-none transition-all duration-300 ${isSelected
                            ? 'text-white'
                            : 'text-gray-200 group-hover:text-[#254153]'
                        }`}
                >
                    {count}
                </div>
            </div>

            {/* Structural Accent */}
            <div className={`absolute bottom-0 left-0 h-1 transition-all duration-300 ${isSelected ? 'w-full bg-blue-500' : 'w-0 bg-gray-200'
                }`} />
        </button>
    )
}
