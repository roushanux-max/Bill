import React from 'react';

export default function Logo({ className, size = 48 }: { className?: string; size?: number }) {
  const w = size;
  const h = size;

  // Unique IDs for gradients to avoid collisions if multiple logos are on one page
  const id0 = `paint0_linear_${size}`;
  const id1 = `paint1_linear_${size}`;

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 500 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M441.885 331.043C428.631 362.387 407.901 390.006 381.507 411.487C355.113 432.968 323.859 447.656 290.477 454.268C257.095 460.879 222.602 459.213 190.013 449.414C157.424 439.615 127.731 421.982 103.531 398.057C79.3308 374.132 61.36 344.642 51.1896 312.167C41.0192 279.692 38.9589 245.22 45.1888 211.765C51.4187 178.31 65.7492 146.89 86.9273 120.252C108.105 93.6148 135.486 72.5707 166.676 58.96"
        stroke={`url(#${id0})`}
        strokeWidth="50"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M458.333 250C458.333 222.641 452.945 195.551 442.475 170.274C432.005 144.998 416.659 122.032 397.314 102.686C377.968 83.3406 355.002 67.9949 329.726 57.5252C304.45 47.0554 277.359 41.6667 250 41.6667V250H458.333Z"
        stroke={`url(#${id1})`}
        strokeWidth="50"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id={id0} x1="315.416" y1="118.053" x2="42.3987" y2="432.041" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--color-primary, #5452F8)" />
          <stop offset="1" stopColor="var(--color-primary-light, #AB44FF)" />
        </linearGradient>
        <linearGradient id={id1} x1="392.5" y1="72.5" x2="250" y2="236" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--color-primary, #5452F8)" />
          <stop offset="1" stopColor="var(--color-primary-light, #AB44FF)" />
        </linearGradient>
      </defs>
    </svg>
  );
}
