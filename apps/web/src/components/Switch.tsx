import React from 'react';
import clsx from 'clsx';

interface SwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
}

const Switch: React.FC<SwitchProps> = ({ checked, onChange, label }) => {
    return (
        <label className="flex items-center cursor-pointer">
            <div className="relative">
                <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                />
                <div
                    className={clsx(
                        "block w-10 h-6 rounded-full transition-colors duration-300 ease-in-out",
                        checked ? "bg-indigo-600" : "bg-gray-300"
                    )}
                ></div>
                <div
                    className={clsx(
                        "absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ease-in-out shadow",
                        checked ? "translate-x-4" : "translate-x-0"
                    )}
                ></div>
            </div>
            {label && <span className="ml-3 text-sm font-medium text-gray-700">{label}</span>}
        </label>
    );
};

export default Switch;
