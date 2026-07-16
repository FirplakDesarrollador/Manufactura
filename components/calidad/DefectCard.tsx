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
            className={`p-3 border transition-colors flex flex-col justify-between w-full text-left min-h-[90px] ${
                isSelected
                    ? 'bg-[#F2C94C] border-[#F2C94C] text-gray-800'
                    : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
        >
            <div className="mb-2">
                <h3 className="text-sm font-medium leading-tight">
                    {index}. {title}
                </h3>
            </div>

            <div className="flex justify-between items-center w-full mt-auto">
                {/* Toggle Switch */}
                <div className={`w-9 h-5 rounded-full p-0.5 flex items-center transition-colors ${
                    isSelected ? 'bg-white/70' : 'bg-gray-200'
                }`}>
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${
                        isSelected ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                </div>

                {/* Count Pill */}
                <div className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${
                    isSelected ? 'bg-[#E5BE45] text-gray-800' : 'bg-gray-100 text-gray-600'
                }`}>
                    {count}
                </div>
            </div>
        </button>
    )
}
