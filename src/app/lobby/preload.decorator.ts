// Custom Decorator to preload data
export function PreloadData<T = unknown>(preloadFn: () => Promise<T>) {
  return function <
    U extends { prototype: { ngOnInit?: (...args: unknown[]) => void | Promise<void> } },
  >(target: U) {
    const originalNgOnInit = target.prototype.ngOnInit;

    target.prototype.ngOnInit = async function (...args: unknown[]) {
      // Preload data before ngOnInit
      await preloadFn.call(this);

      // Call the original ngOnInit if it exists
      if (originalNgOnInit) {
        originalNgOnInit.apply(this, args);
      }
    };
  };
}
