"use client";

import * as React from "react";
import { cn } from "./ui/utils";
import { Input } from "./ui/input";
import {
    Popover,
    PopoverContent,
    PopoverAnchor,
} from "./ui/popover";
import {
    Command,
    CommandGroup,
    CommandItem,
    CommandList,
} from "./ui/command";

interface SuggestionInputProps extends React.ComponentProps<"input"> {
    suggestions: { id: string; name: string; phone: string; [key: string]: any }[];
    onSuggestionSelect: (suggestion: any) => void;
    labelKey?: string;
    subLabelKey?: string;
}

export function SuggestionInput({
    suggestions,
    onSuggestionSelect,
    labelKey = "name",
    subLabelKey = "phone",
    className,
    value,
    onChange,
    onFocus,
    onBlur,
    ...props
}: SuggestionInputProps) {
    const [open, setOpen] = React.useState(false);
    const [isFocused, setIsFocused] = React.useState(false);

    // Filter suggestions based on value
    const filteredSuggestions = React.useMemo(() => {
        if (!isFocused) return [];

        const query = String(value || "").toLowerCase().trim();
        if (!query) return suggestions.slice(0, 5); // Show top 5 on focus when empty

        return suggestions
            .filter(s => {
                const labelMatch = s[labelKey] ? String(s[labelKey]).toLowerCase().includes(query) : false;
                const subLabelMatch = s[subLabelKey] ? String(s[subLabelKey]).toLowerCase().includes(query) : false;
                return labelMatch || subLabelMatch;
            })
            .slice(0, 5); // Limit to 5 suggestions
    }, [suggestions, value, isFocused, labelKey, subLabelKey]);

    React.useEffect(() => {
        setOpen(filteredSuggestions.length > 0 && isFocused);
    }, [filteredSuggestions, isFocused]);

    return (
        <div className="relative w-full">
            <Popover open={open} onOpenChange={setOpen} modal={false}>
                <PopoverAnchor asChild>
                    <Input
                        {...props}
                        value={value}
                        onChange={(e) => {
                            onChange?.(e);
                            setIsFocused(true);
                        }}
                        onFocus={(e) => {
                            onFocus?.(e);
                            setIsFocused(true);
                        }}
                        onBlur={(e) => {
                            onBlur?.(e);
                            // Delay blur to allow clicking suggestions
                            setTimeout(() => setIsFocused(false), 200);
                        }}
                        className={cn("w-full", className)}
                    />
                </PopoverAnchor>
                <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] min-w-[var(--radix-popover-trigger-width)] p-1 border-slate-200/60 shadow-2xl bg-white/95 backdrop-blur-md rounded-xl animate-in fade-in zoom-in-95 duration-200"
                    align="start"
                    side="bottom"
                    sideOffset={4}
                    avoidCollisions={false}
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <Command className="bg-transparent" shouldFilter={false}>
                        <CommandList className="max-h-[300px] overflow-y-auto pr-1">
                            <CommandGroup heading="Recent Customers" className="text-[10px] text-slate-400 font-medium px-2 py-1">
                                {filteredSuggestions.map((suggestion) => (
                                    <CommandItem
                                        key={suggestion.id}
                                        value={suggestion.id}
                                        onSelect={() => {
                                            onSuggestionSelect(suggestion);
                                            setOpen(false);
                                            setIsFocused(false);
                                        }}
                                        className="flex flex-col items-start px-3 py-2 rounded-lg cursor-pointer aria-selected:bg-[var(--brand-color)]/10 aria-selected:text-[var(--brand-color)] transition-all hover:bg-slate-50"
                                    >
                                        <span className="font-semibold text-sm">{suggestion[labelKey]}</span>
                                        <span className="text-[10px] opacity-70 italic">{suggestion[subLabelKey]}</span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}
