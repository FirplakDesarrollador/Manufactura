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
        <div className="space-y-2 w-full" ref={containerRef}>
            {label && <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{label}</label>}
            <div className="relative">
                <input 
                    type="text" 
                    name={name} 
                    value={selectedValue} 
                    required={required} 
                    onChange={() => {}} 
                    className="absolute opacity-0 w-full h-full -z-10 pointer-events-none" 
                    tabIndex={-1}
                />

                <div
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    className={`flex h-10 w-full items-center justify-between rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm ring-offset-white focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 ${disabled ? 'cursor-not-allowed opacity-50 bg-slate-50' : 'cursor-pointer hover:bg-slate-50/50'}`}
                >
                    <span className={selectedValue ? 'text-slate-900 font-medium' : 'text-slate-500'}>
                        {selectedValue || placeholder}
                    </span>
                    <div className="flex items-center gap-2">
                        {selectedValue && !disabled && (
                            <X
                                size={14}
                                className="text-slate-400 hover:text-red-500 transition-colors"
                                onClick={clearSelection}
                            />
                        )}
                        <ChevronDown size={16} className="text-slate-500 opacity-50" />
                    </div>
                </div>

                {isOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-md max-h-60 flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
                        <div className="p-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50/80 sticky top-0">
                            <Search size={16} className="text-slate-400" />
                            <input
                                autoFocus
                                type="text"
                                className="w-full bg-transparent outline-none text-sm py-1 placeholder:text-slate-400"
                                placeholder="Buscar supervisor..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                        <div className="overflow-y-auto flex-1 p-1">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((option, index) => (
                                    <div
                                        key={`${option}-${index}`}
                                        className={`px-3 py-2 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors text-sm rounded-sm ${selectedValue === option ? 'bg-slate-100 font-bold text-primary' : 'text-slate-700'}`}
                                        onClick={() => handleSelect(option)}
                                    >
                                        {option}
                                    </div>
                                ))
                            ) : (
                                <div className="px-3 py-3 text-slate-500 text-sm text-center italic">
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
