"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search, Loader2 } from "lucide-react";
import { cn } from "./ui/utils";
import { Button } from "./ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "./ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "./ui/popover";

interface SearchableSelectProps {
    options: { value: string; label: string; subLabel?: string }[];
    value: string;
    onValueChange: (value: string) => void;
    onCreateNew?: () => void;
    placeholder?: string;
    emptyMessage?: string;
    className?: string;
    onSearchChange?: (query: string) => void;
    isLoading?: boolean;
}

export function SearchableSelect({
    options,
    value,
    onValueChange,
    onCreateNew,
    placeholder = "Select option...",
    emptyMessage = "No options found.",
    className,
    onSearchChange,
    isLoading = false,
}: SearchableSelectProps) {
    const [open, setOpen] = React.useState(false);

    const selectedOption = options.find((option) => option.value === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "w-full justify-between font-normal text-sm h-10 px-3 bg-white/50 backdrop-blur-sm border-slate-200 hover:border-[var(--color-primary)] hover:bg-white/80 transition-all duration-300",
                        className
                    )}
                >
                    <span className="truncate">
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] min-w-[var(--radix-popover-trigger-width)] p-1 border-slate-200/60 shadow-2xl bg-white/95 backdrop-blur-md rounded-xl animate-in fade-in zoom-in-95 duration-200"
                align="start"
                side="bottom"
                sideOffset={4}
                avoidCollisions={false}
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <Command className="bg-transparent" shouldFilter={!onSearchChange}>
                    <div className="flex items-center border-b border-slate-100 px-3">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <CommandInput
                            placeholder={`Search ${placeholder.toLowerCase()}...`}
                            className="h-10 bg-transparent border-0 outline-none focus:ring-0"
                            onValueChange={onSearchChange}
                        />
                        {isLoading && (
                            <div className="flex items-center justify-center pr-2">
                                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                            </div>
                        )}
                    </div>
                    <CommandList className="max-h-[300px] overflow-y-auto overflow-x-hidden">
                        <CommandEmpty className="p-4 text-center">
                            <p className="text-sm text-slate-500 mb-3">{emptyMessage}</p>
                            {onCreateNew && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        onCreateNew();
                                        setOpen(false);
                                    }}
                                    className="h-8 text-xs bg-[var(--color-primary)]/5 border-[var(--color-primary)]/20 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
                                >
                                    Create New Entry
                                </Button>
                            )}
                        </CommandEmpty>
                        <CommandGroup className="p-1">
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.value}
                                    keywords={[option.label, option.subLabel || ""]}
                                    onSelect={() => {
                                        onValueChange(option.value);
                                        setOpen(false);
                                    }}
                                    className="flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer aria-selected:bg-[var(--color-primary)]/10 aria-selected:text-[var(--color-primary)] transition-colors"
                                >
                                    <div className="flex items-center justify-center w-5 h-5">
                                        {value === option.value && (
                                            <Check className="h-4 w-4" />
                                        )}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-medium text-sm truncate">{option.label}</span>
                                        {option.subLabel && (
                                            <span className="text-[10px] text-slate-500 font-normal truncate">
                                                {option.subLabel}
                                            </span>
                                        )}
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
