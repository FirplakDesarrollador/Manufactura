'use client'

import * as React from 'react'
import { Search, ChevronDown, X } from 'lucide-react'

interface SearchableSelectProps {
    name: string
    options: string[]
    placeholder: string
    required?: boolean
    label?: string
    onValueChange?: (value: string) => void
    defaultValue?: string
    disabled?: boolean
}

export function SearchableSelect({ name, options, placeholder, required, label, onValueChange, defaultValue = '', disabled = false }: SearchableSelectProps) {
    const [isOpen, setIsOpen] = React.useState(false)
    const [searchTerm, setSearchTerm] = React.useState('')
    const [selectedValue, setSelectedValue] = React.useState(defaultValue)
    const containerRef = React.useRef<HTMLDivElement>(null)

    const normalize = (str: string) =>
        str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";

    const filteredOptions = React.useMemo(() => {
        // Deduplicate options first
        const unique = Array.from(new Set(options.filter(Boolean)))
        const term = normalize(searchTerm);
        if (!term) return unique;
        return unique.filter(option => normalize(String(option)).includes(term));
    }, [searchTerm, options]);

    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSelect = (value: string) => {
        setSelectedValue(value)
        setIsOpen(false)
        setSearchTerm('')
        onValueChange?.(value)
    }

    const clearSelection = (e: React.MouseEvent) => {
        e.stopPropagation()
        setSelectedValue('')
        setSearchTerm('')
        onValueChange?.('')
    }

    return (
        <div className="space-y-1" ref={containerRef}>
            {label && <label className="text-lg font-medium">{label}</label>}
            <div className="relative">
                {/* 
                 * USAR OPACITY-0 Y ABSOLUTE EN LUGAR DE TYPE="HIDDEN"
                 * Esto es crítico para que la validación HTML5 required funcione. 
                 * Los navegadores bloquean silenciosamente el form si un input hidden es required y está vacío.
                 */}
                <input 
                    type="text" 
                    name={name} 
                    value={selectedValue} 
                    required={required} 
                    onChange={() => {}} // React compliance
                    className="absolute opacity-0 w-full h-full -z-10 pointer-events-none" 
                    tabIndex={-1}
                />

                <div
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    className={`w-full h-12 border-2 border-[#254153] rounded-sm px-4 bg-white text-lg flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#749094] ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                    <span className={selectedValue ? 'text-[#254153]' : 'text-gray-400'}>
                        {selectedValue || placeholder}
                    </span>
                    <div className="flex items-center gap-2">
                        {selectedValue && !disabled && (
                            <X
                                size={20}
                                className="text-gray-400 hover:text-red-500"
                                onClick={clearSelection}
                            />
                        )}
                        <div className="h-full w-12 bg-[#749094] absolute right-0 top-0 flex items-center justify-center text-white border-l-2 border-[#254153] pointer-events-none">
                            <ChevronDown size={32} strokeWidth={2.5} />
                        </div>
                    </div>
                </div>

                {isOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border-2 border-[#254153] rounded-sm shadow-xl max-h-64 flex flex-col">
                        <div className="p-2 border-b border-gray-100 flex items-center gap-2 bg-gray-50">
                            <Search size={18} className="text-gray-400" />
                            <input
                                autoFocus
                                type="text"
                                className="w-full bg-transparent outline-none text-base py-1"
                                placeholder="Buscar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                        <div className="overflow-y-auto flex-1">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((option, index) => (
                                    <div
                                        key={`${option}-${index}`}
                                        className={`px-4 py-2 cursor-pointer hover:bg-[#749094] hover:text-white transition-colors text-lg ${selectedValue === option ? 'bg-gray-100 text-[#749094] font-semibold' : 'text-[#254153]'}`}
                                        onClick={() => handleSelect(option)}
                                    >
                                        {option}
                                    </div>
                                ))
                            ) : (
                                <div className="px-4 py-3 text-gray-400 text-center italic">
                                    No se encontraron resultados
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
