import { expect, test, it } from 'bun:test';
import { asyncOnce } from '../src/async-once';
import invariant from 'tiny-invariant';

test('simple', async () => {
  async function greeting(name: string): Promise<string> {
    return `Hello ${name}`;
  }
  const cachedGreeting = asyncOnce(greeting);

  expect(await cachedGreeting('Alex')).toBe('Hello Alex');
});

test('a function that throws should not be cached', async () => {
  let callCount = 0;
  async function maybeThrow({ shouldThrow }: { shouldThrow: boolean }): Promise<string> {
    callCount++;

    if (shouldThrow) {
      throw new Error(`Call count: ${callCount}`);
    }

    return `Call count: ${callCount}`;
  }
  const cached = asyncOnce(maybeThrow);

  expect(async () => await cached({ shouldThrow: true })).toThrowError('Call count: 1');
  expect(async () => await cached({ shouldThrow: true })).toThrowError('Call count: 2');

  expect(await cached({ shouldThrow: false })).toBe('Call count: 3');
  expect(await cached({ shouldThrow: false })).toBe('Call count: 3');
});

test('a function that rejects should not be cached', async () => {
  let callCount = 0;
  function maybeResolve({ shouldResolve }: { shouldResolve: boolean }): Promise<string> {
    callCount++;
    return new Promise((resolve, reject) => {
      if (!shouldResolve) {
        reject(`Call count: ${callCount}`);
      }

      return resolve(`Call count: ${callCount}`);
    });
  }
  const cached = asyncOnce(maybeResolve);

  expect(async () => await cached({ shouldResolve: false })).toThrowError('Call count: 1');
  expect(async () => await cached({ shouldResolve: false })).toThrowError('Call count: 2');

  expect(await cached({ shouldResolve: true })).toBe('Call count: 3');
  expect(await cached({ shouldResolve: true })).toBe('Call count: 3');
});

test('asking for a settled promise', async () => {
  type User = { callCount: number };
  let callCount = 0;
  async function getUser(): Promise<User> {
    return { callCount: ++callCount };
  }
  const cached = asyncOnce(getUser);

  const user = await cached();
  expect(user).toEqual({ callCount: 1 });

  // all future calls should get the same user
  expect(await cached()).toBe(user);
  expect(await cached()).toBe(user);

  // we are making sure that we are always getting a promise back, and not the value
  expect(cached()).toBeInstanceOf(Promise);
});

test('joining a pending promise (which gets fulfilled)', (done) => {
  type User = { id: string };
  const user: User = { id: 'alex' };
  let triggerResolve: (user: User) => void = () => {};
  function getUser(): Promise<User> {
    return new Promise((resolve) => {
      triggerResolve = resolve;
    });
  }
  const cached = asyncOnce(getUser);

  const promise1 = cached();
  const promise2 = cached();
  // they got the same promise back
  expect(promise1).toBe(promise2);

  Promise.allSettled([promise1, promise2]).then((result) => {
    const [first, second] = result;
    invariant(first.status === 'fulfilled');
    // checking we got the exact user object we expected
    expect(first.value).toBe(user);

    invariant(second.status === 'fulfilled');
    // checking we got the exact user object we expected
    expect(second.value).toBe(user);

    done();
  });

  triggerResolve(user);
});

test('joining a pending promise (which gets rejected)', (done) => {
  type User = { id: string };
  let triggerReject: () => void = () => {};
  function getUser(): Promise<User> {
    return new Promise((resolve, reject) => {
      triggerReject = reject;
      void resolve;
    });
  }
  const cached = asyncOnce(getUser);

  const promise1 = cached();
  const promise2 = cached();
  // they got the same promise back
  expect(promise1).toBe(promise2);

  Promise.allSettled([promise1, promise2]).then((result) => {
    const [first, second] = result;
    expect(first.status).toBe('rejected');
    expect(second.status).toBe('rejected');

    done();
  });

  triggerReject();
});

test('cache clearing (promise "settled")', async () => {
  let callCount = 0;
  function getCallCount(): Promise<number> {
    callCount++;
    return Promise.resolve(callCount);
  }
  const cached = asyncOnce(getCallCount);

  expect(await cached()).toBe(1);
  expect(await cached()).toBe(1);

  cached.clear();

  expect(await cached()).toBe(2);
  expect(await cached()).toBe(2);

  cached.clear();

  expect(await cached()).toBe(3);
  expect(await cached()).toBe(3);
});

test('cache clearing (promise "pending")', async (done) => {
  type Data = { callCount: number };
  let triggerResolve: () => void = () => {};
  let callCount = 0;
  function getCallCount(): Promise<Data> {
    const data: Data = { callCount: ++callCount };
    return new Promise((resolve) => {
      triggerResolve = () => resolve(data);
    });
  }
  const cached = asyncOnce(getCallCount);

  // both of these promises are still pending.
  const promise1 = cached();
  const promise2 = cached();

  Promise.allSettled([promise1, promise2]).then((result) => {
    const [first, second] = result;
    expect(first.status).toBe('rejected');
    expect(second.status).toBe('rejected');
  });

  // will abort the current promise
  cached.clear();
  await Promise.allSettled([promise1, promise2]);

  // will now call underlying function again
  const promise3 = cached();
  const promise4 = cached();

  Promise.allSettled([promise3, promise4]).then((result) => {
    const [first, second] = result;
    invariant(first.status === 'fulfilled');
    expect(first.value).toEqual({ callCount: 2 });

    invariant(second.status === 'fulfilled');
    expect(second.value).toEqual({ callCount: 2 });
    done();
  });

  triggerResolve();
});

test('cache clearing (promise "pending") - multiple', (done) => {
  type Data = { callCount: number };
  let triggerResolve: () => void = () => {};
  let callCount = 0;
  function getCallCount(): Promise<Data> {
    const data: Data = { callCount: ++callCount };
    return new Promise((resolve) => {
      triggerResolve = () => resolve(data);
    });
  }
  const cached = asyncOnce(getCallCount);

  for (let i = 0; i < 10; i++) {
    Promise.allSettled([cached(), cached()]).then((result) => {
      const [first, second] = result;
      expect(first.status).toBe('rejected');
      expect(second.status).toBe('rejected');
      if (i === 9) {
        done();
      }
    });

    cached.clear();
  }
});
