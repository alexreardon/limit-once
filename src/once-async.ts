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
 * // returns result of `getUser()`
 *
 * const user2 = await getUserOnce();
 * // `getUser()` not called, previously "fulfilled" value returned
 *
 * console.log(user1 === user2); // true
 */
export function onceAsync<TFunc extends (...args: any[]) => Promise<any>>(
  fn: TFunc,
): CachedFn<TFunc> {
  type Result = ResultValue<TFunc>;

  let state: State<Result> = {
    type: 'initial',
  };

  function onced(
    this: ThisParameterType<TFunc>,
    ...args: Parameters<TFunc>
  ): ReturnType<CachedFn<TFunc>> {
    if (state.type === 'fulfilled') {
      return state.promise;
    }

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
