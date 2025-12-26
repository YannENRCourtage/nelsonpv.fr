import React from 'react';

export function ToggleSwitch({ checked, onCheckedChange, id, label, disabled }) {
    return (
        <div className="flex items-center gap-3">
            <button
                type="button"
                id={id}
                disabled={disabled}
                onClick={() => !disabled && onCheckedChange(!checked)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${checked
                        ? 'bg-green-500 focus:ring-green-500'
                        : 'bg-gray-300 focus:ring-gray-300'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                aria-checked={checked}
                role="switch"
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${checked ? 'translate-x-6' : 'translate-x-1'
                        }`}
                />
            </button>
            {label && (
                <label
                    htmlFor={id}
                    className={`text-sm ${disabled ? 'text-gray-400' : 'text-gray-700 cursor-pointer'}`}
                    onClick={() => !disabled && onCheckedChange(!checked)}
                >
                    {label}
                </label>
            )}
        </div>
    );
}
