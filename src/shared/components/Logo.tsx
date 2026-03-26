import React, { useId } from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export default function Logo({ className = '', size = 32 }: LogoProps) {
  const id0 = useId();
  const id1 = useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 500 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Icon Part */}
      <path
        d="M250 458.333C365.059 458.333 458.333 365.059 458.333 250H250V41.6667C134.941 41.6667 41.6667 134.941 41.6667 250C41.6667 365.059 134.941 458.333 250 458.333Z"
        fill={`url(#${id0})`}
      />
      <path
        d="M458.333 250C458.333 222.641 452.945 195.551 442.475 170.274C432.005 144.998 416.659 122.032 397.314 102.686C377.968 83.3406 355.002 67.9949 329.726 57.5252C304.45 47.0554 277.359 41.6667 250 41.6667V250H458.333Z"
        stroke={`url(#${id1})`}
        strokeWidth="40"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id={id0} x1="315.416" y1="118.053" x2="42.3987" y2="432.041" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--brand-color, #6366f1)" />
          <stop offset="1" stopColor="var(--brand-color-light, #8b5cf6)" />
        </linearGradient>
        <linearGradient id={id1} x1="392.5" y1="72.5" x2="250" y2="236" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--brand-color, #6366f1)" />
          <stop offset="1" stopColor="var(--brand-color-light, #8b5cf6)" />
        </linearGradient>
      </defs>
    </svg>
  );
}
