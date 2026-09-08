import React, { useState, useEffect, useRef } from 'react';

interface Option {
    value: string;
    label: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    noOptionsMessage?: string;
    id?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
    options,
    value,
    onChange,
    placeholder = 'Selecione...',
    disabled = false,
    className = '',
    noOptionsMessage = 'Nenhum arquivo encontrado',
    id
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Initialize/Update search term based on selected value
    const prevValueRef = useRef(value);

    useEffect(() => {
        const selectedOption = options.find(opt => opt.value === value);

        if (selectedOption) {
            // Always sync search term with selected option label
            setSearchTerm(selectedOption.label);
        } else if (!value) {
            // Only clear search term if value was previously set (selection cleared)
            // This prevents clearing typed text when value is initially empty
            if (prevValueRef.current) {
                setSearchTerm('');
            }
        }

        prevValueRef.current = value;
    }, [value, options]);

    // Reset focus when search changes or menu closes
    useEffect(() => {
        setFocusedIndex(-1);
    }, [searchTerm, isOpen]);

    const filteredOptions = options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Auto-scroll to focused item
    useEffect(() => {
        if (isOpen && focusedIndex >= 0 && itemRefs.current[focusedIndex]) {
            itemRefs.current[focusedIndex]?.scrollIntoView({
                block: 'nearest',
            });
        }
    }, [focusedIndex, isOpen]);

    // Handle clicks outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                // Reset search term to selected value if closed without selection
                const selectedOption = options.find(opt => opt.value === value);
                if (selectedOption) {
                    setSearchTerm(selectedOption.label);
                } else {
                    setSearchTerm('');
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [options, value]);

    const handleSelect = (option: Option) => {
        onChange(option.value);
        setSearchTerm(option.label);
        setIsOpen(false);
        setFocusedIndex(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'Enter') {
                e.preventDefault();
                setIsOpen(true);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setFocusedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setFocusedIndex(prev => (prev > 0 ? prev - 1 : prev));
                break;
            case 'Enter':
                e.preventDefault();
                if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
                    handleSelect(filteredOptions[focusedIndex]);
                } else if (filteredOptions.length === 1) {
                    // Auto-select if only one option left
                    handleSelect(filteredOptions[0]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                break;
        }
    };


    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div className="relative">
                <input
                    id={id}
                    type="text"
                    className={`w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 ${disabled ? 'cursor-not-allowed' : 'cursor-text'}`}
                    placeholder={placeholder}
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => {
                        if (!disabled) setIsOpen(true);
                    }}
                    onClick={() => {
                        if (!disabled) setIsOpen(true);
                    }}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} text-xs`}></i>
                </div>
            </div>

            {isOpen && !disabled && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option, index) => (
                            <div
                                key={option.value}
                                ref={(el: HTMLDivElement | null) => { itemRefs.current[index] = el; }}
                                className={`px-3 py-2 text-sm cursor-pointer transition-colors ${option.value === value
                                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-medium'
                                    : focusedIndex === index
                                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }`}
                                onClick={() => handleSelect(option)}
                                onMouseEnter={() => setFocusedIndex(index)}
                            >
                                {option.label}
                            </div>
                        ))
                    ) : (
                        <div className="px-3 py-2 text-sm text-slate-400 text-center">
                            {noOptionsMessage}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
