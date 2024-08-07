import { expect, test } from 'bun:test';
import { onceAsync } from '../src/once-async';
import invariant from 'tiny-invariant';
import { expectTypeOf } from 'expect-type';

test('simple', async () => {
  async function greeting(name: string): Promise<string> {
    return `Hello ${name}`;
  }
  const cachedGreeting = onceAsync(greeting);

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
  const cached = onceAsync(maybeThrow);

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
  const cached = onceAsync(maybeResolve);

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
  const cached = onceAsync(getUser);

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
  const cached = onceAsync(getUser);

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
  const cached = onceAsync(getUser);

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

test('should get the same promise back when "pending" and "fulfilled"', async () => {
  let callCount = 0;
  async function getCallCount(): Promise<string> {
    return `Call count: ${++callCount}`;
  }

  const getCallCountOnce = onceAsync(getCallCount);

  const promise1 = getCallCountOnce();

  expect(await promise1).toBe('Call count: 1');

  const promise2 = getCallCountOnce();

  expect(await promise2).toBe('Call count: 1');

  // same promise object returned
  expect(promise1).toBe(promise2);
});

test('cache clearing (promise "settled")', async () => {
  let callCount = 0;
  function getCallCount(): Promise<number> {
    callCount++;
    return Promise.resolve(callCount);
  }
  const cached = onceAsync(getCallCount);

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
  const cached = onceAsync(getCallCount);

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

test('cache clearing (promise "pending") - simple', async (done) => {
  async function getName(): Promise<string> {
    return 'Alex';
  }

  const getNameOnce = onceAsync(getName);

  getNameOnce().catch(done);

  // getName will still be "pending"
  getNameOnce.clear();
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
  const cached = onceAsync(getCallCount);

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

test('cache clearing (promise "pending") - cleared sync after creation', async () => {
  let callCount = 0;
  function getCallCount(): Promise<string> {
    return new Promise((resolve) => {
      // constructor called synonymously
      resolve(`Call count: ${++callCount}`);
    });
  }

  const getCallCountOnce = onceAsync(getCallCount);

  const promise1 = getCallCountOnce();
  expect(callCount).toBe(1);

  getCallCountOnce.clear();

  const promise2 = getCallCountOnce();
  expect(callCount).toBe(2);

  const result = await Promise.allSettled([promise1, promise2]);
  const [first, second] = result;
  expect(first.status).toBe('rejected');
  invariant(second.status === 'fulfilled');
  expect(second.value).toBe('Call count: 2');
});

test('this binding (.call)', async () => {
  async function getName(this: { name: string }): Promise<string> {
    return `name: ${this.name}`;
  }
  const cached = onceAsync(getName);

  expect(await cached.call({ name: 'Alex' })).toBe('name: Alex');
});

test('this binding (.apply)', async () => {
  async function getName(this: { name: string }): Promise<string> {
    return `name: ${this.name}`;
  }
  const cached = onceAsync(getName);

  expect(await cached.apply({ name: 'Alex' })).toBe('name: Alex');
});

test('this binding (.bind)', async () => {
  async function getName(this: { name: string }): Promise<string> {
    return `name: ${this.name}`;
  }
  const bound = getName.bind({ name: 'Alex' });
  const cached = onceAsync(bound);

  expect(await cached()).toBe('name: Alex');
});

test('this binding (implicit)', async () => {
  async function getName(this: { name: string }): Promise<string> {
    return `name: ${this.name}`;
  }
  const cached = onceAsync(getName);
  const person = {
    name: 'Alex',
    getName: cached,
  };

  expect(await person.getName()).toBe('name: Alex');
});

test('this binding (arrow function)', async () => {
  let callCount = 0;
  function outer(this: { name: string }) {
    // lock inner scope to parent scope
    return async () => {
      callCount++;
      return `name: ${this.name}. call count: ${callCount}`;
    };
  }
  const result = outer.call({ name: 'Alex' });
  const cached = onceAsync(result);

  expect(await cached()).toBe('name: Alex. call count: 1');
  expect(await cached()).toBe('name: Alex. call count: 1');
});

test('this binding (class constructor)', async () => {
  class Person {
    name: string;
    constructor(name: string) {
      this.name = name;
    }
  }

  const onced = onceAsync(async function create(name: string) {
    return new Person(name);
  });

  const result = await onced('Alex');

  expect(result).toBeInstanceOf(Person);
  expect(result.name).toBe('Alex');
});

test('this binding (class property)', async () => {
  class Person {
    #name: string;
    constructor(name: string) {
      this.#name = name;
    }
    getName = async () => {
      return this.#name;
    };
  }
  const person = new Person('Alex');
  const cached = onceAsync(person.getName);

  expect(await cached()).toBe('Alex');
});

test('types', () => {
  {
    async function sayHello(name: string): Promise<string> {
      return `Hello ${name}`;
    }
    const onced = onceAsync(sayHello);

    expectTypeOf(onced).toMatchTypeOf<typeof sayHello>();
  }

  {
    async function getAge(this: { age: number }): Promise<number> {
      return this.age;
    }
    const onced = onceAsync(getAge);

    expectTypeOf(onced).toMatchTypeOf<typeof getAge>();
    expectTypeOf<ThisParameterType<typeof getAge>>().toEqualTypeOf<ThisParameterType<typeof onced>>;
  }
});
