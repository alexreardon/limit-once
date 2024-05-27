type ResultValue<TFunc extends (this: any, ...args: any[]) => Promise<any>> = Awaited<
  ReturnType<TFunc>
>;

export type OnceAsyncFn<TFunc extends (this: any, ...args: any[]) => Promise<any>> = {
  /**
   * Clear the cached `"fulfilled"` promise.
   * Allow the wrapped function (`TFunc`) to be called again
   * */
  clear: () => void;
  (this: ThisParameterType<TFunc>, ...args: Parameters<TFunc>): Promise<ResultValue<TFunc>>;
};

type State<T> =
  | { type: 'initial' }
  | { type: 'pending'; promise: Promise<T>; abort: () => void }
  | { type: 'fulfilled'; promise: Promise<T> };

/**
 * Creates a new function that will cache the result of it's first call.
 *
 * @example
 * async function getUser() {
 *   return fetch('/user').json();
 * }
 * const getUserOnce = once(getUser);
 *
 * const user1 = await getUserOnce();
 * // returns "fulfilled" `getUser()` promise value
 *
 * const user2 = await getUserOnce();
 * // `getUser()` not called, previously "fulfilled" value returned
 */
export function onceAsync<TFunc extends (...args: any[]) => Promise<any>>(
  fn: TFunc,
): OnceAsyncFn<TFunc> {
  type Result = ResultValue<TFunc>;

  let state: State<Result> = {
    type: 'initial',
  };

  function onced(
    this: ThisParameterType<TFunc>,
    ...args: Parameters<TFunc>
  ): ReturnType<OnceAsyncFn<TFunc>> {
    if (state.type === 'fulfilled') {
      return state.promise;
    }

    if (state.type === 'pending') {
      return state.promise;
    }

    let rejectPendingPromise: ((reason?: any) => void) | null;
    function abort() {
      // TODO: should we reject with an error?
      rejectPendingPromise?.();
    }

    const promise: Promise<Result> = new Promise((resolve, reject) => {
      rejectPendingPromise = reject;
      fn.call(this, ...args)
        .then((result: Result) => {
          state = {
            type: 'fulfilled',
            promise,
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

  onced.clear = function clear() {
    if (state.type === 'pending') {
      state.abort();
    }

    state = {
      type: 'initial',
    };
  };

  return onced;
}
