// Custom Decorator to preload data
export function PreloadData(preloadFn: () => Promise<any>) {
  return function (target: any) {
    const originalNgOnInit = target.prototype.ngOnInit;

    target.prototype.ngOnInit = async function (...args: any[]) {
      // Preload data before ngOnInit
      await preloadFn.call(this);

      // Call the original ngOnInit if it exists
      if (originalNgOnInit) {
        originalNgOnInit.apply(this, args);
      }
    };
  };
}
