import { bind } from 'bind-event-listener';

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
  | { type: 'fulfilled'; result: T };

export function onceAsync<TFunc extends (...args: any[]) => Promise<any>>(
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
    if (state.type === 'fulfilled') {
      // Doing a Promise.resolve() so that
      // this function _always_ returns a promise.
      return Promise.resolve(state.result);
    }

    // while the promise is pending, all folks
    if (state.type === 'pending') {
      return state.promise;
    }

    const promise: Promise<Result> = new Promise((resolve, reject) => {
      function listener() {
        reject();
      }
      const cleanup = bind(controller.signal, { type: 'abort', listener: () => reject() });

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
        })
        // this isn't needed for functionality,
        // but it seems like a good idea to unbind the event listener
        // to prevent possible memory leaks
        .finally(cleanup);
    });

    state = {
      type: 'pending',
      promise,
    };

    return promise;
  }

  cached.clear = function clear() {
    controller.abort();
    // Need to create a new controller
    // as the old one has been aborted
    controller = new AbortController();
    state = {
      type: 'initial',
    };
  };

  return cached;
}
