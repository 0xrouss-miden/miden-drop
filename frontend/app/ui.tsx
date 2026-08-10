import type { ReactNode } from "react";

export type IconName = "arrow" | "back" | "check" | "copy" | "lock" | "scan" | "wallet";

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <><path d="M5 12h14" /><path d="m14 7 5 5-5 5" /></>,
    back: <><path d="M19 12H5" /><path d="m10 7-5 5 5 5" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    copy: <><rect x="8" y="8" width="11" height="11" rx="1" /><path d="M16 8V5H5v11h3" /></>,
    lock: <><rect x="5" y="10" width="14" height="10" rx="1" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" /></>,
    scan: <><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" /><rect x="8" y="8" width="8" height="8" rx="2" /></>,
    wallet: <><path d="M4 7h15a2 2 0 0 1 2 2v10H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12v3" /><path d="M16 12h5v4h-5a2 2 0 0 1 0-4Z" /></>,
  };

  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

export function BrandMark() {
  return (
    <svg aria-hidden="true" className="brand-mark" viewBox="0 0 28 28">
      <path d="M2 2h8v8H2zM18 2h8v8h-8zM10 10h8v8h-8zM2 18h8v8H2zM18 18h8v8h-8z" />
    </svg>
  );
}

export function ProofField() {
  return (
    <svg aria-hidden="true" className="proof-field" viewBox="0 0 620 650" preserveAspectRatio="xMidYMid meet">
      <defs><pattern id="proof-dots" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="1.2" cy="1.2" r="1" fill="currentColor" /></pattern></defs>
      <g className="proof-orbit" fill="none" stroke="currentColor" strokeWidth="1">
        <path d="M73 177 308 38l235 139v276L308 592 73 453Z" />
        <path d="m73 177 235 139 235-139M308 316v276M73 453l235-137 235 137" />
        <path d="M151 132 387 270v276M229 86l235 138v276M151 500V224l235-139M73 315l235-138 235 138" opacity=".55" />
      </g>
      <g fill="url(#proof-dots)" opacity=".78">
        <path d="m73 177 235 139v276L73 453Z" />
        <path d="m308 38 235 139-235 139L73 177Z" opacity=".5" />
        <path d="m308 316 235-139v276L308 592Z" opacity=".36" />
        <path d="m229 224 79-47 78 47-78 46Z" opacity=".9" />
      </g>
      <g fill="currentColor">
        {[[73,177],[308,38],[543,177],[543,453],[308,592],[73,453],[308,316],[151,132],[464,224],[151,500]].map(([x,y]) => <rect key={`${x}-${y}`} x={x - 4} y={y - 4} width="8" height="8" />)}
        <circle cx="574" cy="315" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      </g>
    </svg>
  );
}

const qrCells = Array.from({ length: 21 * 21 }, (_, index) => {
  const row = Math.floor(index / 21);
  const column = index % 21;
  const inFinder = (originRow: number, originColumn: number) => {
    const y = row - originRow;
    const x = column - originColumn;
    if (x < 0 || y < 0 || x > 6 || y > 6) return false;
    return x === 0 || y === 0 || x === 6 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4);
  };
  return inFinder(0, 0) || inFinder(0, 14) || inFinder(14, 0) || ((index * 17 + row * row + column * 7) % 13 < 6);
});

export function QrPreview() {
  return <div className="qr-preview" role="img" aria-label="Illustrative QR code for the generated drop">{qrCells.map((active, index) => <span className={active ? "is-active" : ""} key={index} />)}</div>;
}

export const previewLink = "https://drop.miden.xyz/claim#7x8k9m2q";
