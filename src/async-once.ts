type ResultValue<TFunc extends (this: any, ...args: any[]) => Promise<any>> = Awaited<
  ReturnType<TFunc>
>;

export type CachedFn<TFunc extends (this: any, ...args: any[]) => Promise<any>> = {
  clear: () => void;
  (this: ThisParameterType<TFunc>, ...args: Parameters<TFunc>): Promise<ResultValue<TFunc>>;
};

type State<T> =
  | { type: 'initial' }
  | { type: 'pending'; promise: Promise<T> }
  | { type: 'settled'; result: T };

export function asyncOnce<TFunc extends (...args: any[]) => Promise<any>>(
  fn: TFunc,
): CachedFn<TFunc> {
  type Result = ResultValue<TFunc>;

  let state: State<Result> = {
    type: 'initial',
  };

  let controller = new AbortController();

  function cached(
    this: ThisParameterType<TFunc>,
    ...args: Parameters<TFunc>
  ): ReturnType<CachedFn<TFunc>> {
    if (state.type === 'settled') {
      // Doing a Promise.resolve() so that
      // this function _always_ returns a promise.
      return Promise.resolve(state.result);
    }

    // while the promise is pending, all folks
    if (state.type === 'pending') {
      return state.promise;
    }

    const promise: Promise<Result> = new Promise((resolve, reject) => {
      controller.signal.addEventListener('abort', () => reject(), { once: true });

      fn.call(this, ...args)
        .then((result: Result) => {
          state = {
            type: 'settled',
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
    };

    return promise;
  }

  cached.clear = function clear() {
    controller.abort();
    // TODO: need this?
    controller = new AbortController();
    // nothing to do
    state = {
      type: 'initial',
    };
  };

  return cached;
}
