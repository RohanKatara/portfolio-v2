declare module 'splitting' {
  // The text-splitting API used by the existing reveal animations.
  interface SplittingOptions {
    target: HTMLElement;
    by: 'chars' | 'words';
  }

  interface SplittingResult {
    el: HTMLElement;
    words?: HTMLElement[];
    chars?: HTMLElement[];
  }

  export default function Splitting(options: SplittingOptions): SplittingResult[];
}
