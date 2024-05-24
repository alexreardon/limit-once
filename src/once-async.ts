type ResultValue<TFunc extends (this: any, ...args: any[]) => Promise<any>> = Awaited<
  ReturnType<TFunc>
>;

export type CachedFn<TFunc extends (this: any, ...args: any[]) => Promise<any>> = {
  clear: () => void;
  (this: ThisParameterType<TFunc>, ...args: Parameters<TFunc>): Promise<ResultValue<TFunc>>;
};

type State<T> =
  | { type: 'initial' }
  | { type: 'pending'; promise: Promise<T>; abort: () => void }
  | { type: 'fulfilled'; result: T };

export function onceAsync<TFunc extends (...args: any[]) => Promise<any>>(
  fn: TFunc,
): CachedFn<TFunc> {
  type Result = ResultValue<TFunc>;

  let state: State<Result> = {
    type: 'initial',
  };

  function cached(
    this: ThisParameterType<TFunc>,
    ...args: Parameters<TFunc>
  ): ReturnType<CachedFn<TFunc>> {
    if (state.type === 'fulfilled') {
      // Doing a Promise.resolve() so that
      // this function _always_ returns a promise.
      return Promise.resolve(state.result);
    }

    // while the promise is pending, all folks
    if (state.type === 'pending') {
      return state.promise;
    }

    let rejectPendingPromise: (() => void) | null;
    function abort() {
      rejectPendingPromise?.();
    }

    const promise: Promise<Result> = new Promise((resolve, reject) => {
      rejectPendingPromise = reject;
      fn.call(this, ...args)
        .then((result: Result) => {
          state = {
            type: 'fulfilled',
            result,
          };
          resolve(result);
        })
        .catch((...args) => {
          // allow the promise to be tried again
          state = { type: 'initial' };
          reject(...args);
        });
    });

    state = {
      type: 'pending',
      promise,
      abort,
    };

    return promise;
  }

  cached.clear = function clear() {
    if (state.type === 'pending') {
      state.abort();
    }

    state = {
      type: 'initial',
    };
  };

  return cached;
}
