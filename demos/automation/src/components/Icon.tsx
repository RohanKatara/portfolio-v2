import type { CSSProperties } from "react";
export type IconName =
  | "arrow"
  | "chevron"
  | "check"
  | "file"
  | "box"
  | "wallet"
  | "mail"
  | "play"
  | "reset"
  | "spark"
  | "lock"
  | "alert"
  | "clock"
  | "print"
  | "layers"
  | "external"
  | "close";
const paths: Record<IconName, string[]> = {
  arrow: ["M5 12h14", "m13 6 6 6-6 6"],
  chevron: ["m9 5 7 7-7 7"],
  check: ["m5 12 4 4L19 6"],
  file: ["M14 3H5v18h14V8z", "M14 3v5h5", "M8 12h8", "M8 16h5"],
  box: ["m12 3 9 5v9l-9 5-9-5V8z", "m3 8 9 5 9-5", "M12 13v9", "m7 5 10 6"],
  wallet: ["M20 8V5H4v15h16v-5", "M4 8h17v8h-7V8", "M17 12h1"],
  mail: ["M3 5h18v14H3z", "m3 6 9 7 9-7"],
  play: ["m8 4 12 8-12 8z"],
  reset: ["M3 10a9 9 0 1 1 2 8", "M3 3v7h7"],
  spark: ["m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"],
  lock: ["M5 10h14v11H5z", "M8 10V6a4 4 0 0 1 8 0v4", "M12 14v3"],
  alert: ["m12 3 10 18H2z", "M12 9v5", "M12 17h.01"],
  clock: ["M12 8v5l3 2", "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0"],
  print: ["M6 8V3h12v5", "M6 17H3V8h18v9h-3", "M6 13h12v8H6z", "M17 11h1"],
  layers: ["m12 3 10 5-10 5L2 8z", "m2 12 10 5 10-5", "m2 16 10 5 10-5"],
  external: ["M13 3h8v8", "m21 3-12 12", "M9 3H3v18h18v-6"],
  close: ["m6 6 12 12", "M6 18 18 6"],
};
export default function Icon({
  name,
  size = 20,
  className = "",
  style,
}: {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name].map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
