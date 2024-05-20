import { expect, test, it } from 'bun:test';
import { memoizeFirst } from '../src/memoize-first';

test('single argument', () => {
  function greeting(name: string): string {
    return `Hello ${name}`;
  }
  const cached = memoizeFirst(greeting);
  expect(cached('Alex')).toBe('Hello Alex');
});

test('single argument (falsey return)', () => {
  let callCount = 0;
  function returnFalse() {
    callCount++;
    return undefined;
  }
  const cached = memoizeFirst(returnFalse);

  expect(cached()).toBe(undefined);
  expect(callCount).toBe(1);

  expect(cached()).toBe(undefined);
  expect(callCount).toBe(1);
});

test('multiple arguments', () => {
  function sum(...numbers: number[]): number {
    return numbers.reduce((acc, current) => acc + current, 0);
  }
  const cached = memoizeFirst(sum);
  expect(cached(1, 2, 3, 4)).toBe(1 + 2 + 3 + 4);
});

test('underlying function should only be called once', () => {
  let callCount = 0;
  function getCount(): string {
    return `Call count: ${callCount++}`;
  }
  const cached = memoizeFirst(getCount);

  expect(cached()).toBe('Call count: 0');
  expect(cached()).toBe('Call count: 0');
  expect(cached()).toBe('Call count: 0');
});

test('cache clearing', () => {
  let callCount = 0;
  function getCount(): string {
    return `Call count: ${callCount++}`;
  }
  const cached = memoizeFirst(getCount);

  expect(cached()).toBe('Call count: 0');
  expect(cached()).toBe('Call count: 0');

  cached.clear();

  expect(cached()).toBe('Call count: 1');
  expect(cached()).toBe('Call count: 1');
});

test('if the function throws, the cache should not be set', () => {
  let callCount = 0;
  function maybeThrow({ shouldThrow }: { shouldThrow: boolean }): string {
    callCount++;

    if (shouldThrow) {
      throw new Error(`Call count: ${callCount}`);
    }

    return `Call count: ${callCount}`;
  }
  const cached = memoizeFirst(maybeThrow);

  expect(() => cached({ shouldThrow: true })).toThrowError('Call count: 1');
  expect(() => cached({ shouldThrow: true })).toThrowError('Call count: 2');

  cached.clear();

  // now cache will be applied
  expect(cached({ shouldThrow: false })).toBe('Call count: 3');
  expect(cached({ shouldThrow: false })).toBe('Call count: 3');

  // even though the function would have thrown, the first good value is held on to
  expect(cached({ shouldThrow: true })).toBe('Call count: 3');
});

test('this binding (.call)', () => {
  function getName(this: { name: string }): string {
    return `name: ${this.name}`;
  }
  const cached = memoizeFirst(getName);

  expect(cached.call({ name: 'Alex' })).toBe('name: Alex');
});

test('this binding (.apply)', () => {
  function getName(this: { name: string }): string {
    return `name: ${this.name}`;
  }
  const cached = memoizeFirst(getName);

  expect(cached.apply({ name: 'Alex' })).toBe('name: Alex');
});

test('this binding (.bind)', () => {
  function getName(this: { name: string }): string {
    return `name: ${this.name}`;
  }
  const bound = getName.bind({ name: 'Alex' });
  const cached = memoizeFirst(bound);

  expect(cached()).toBe('name: Alex');
});

test('this binding (implicit)', () => {
  function getName(this: { name: string }): string {
    return `name: ${this.name}`;
  }
  const cached = memoizeFirst(getName);
  const person = {
    name: 'Alex',
    getName: cached,
  };

  expect(person.getName()).toBe('name: Alex');
});

test('this binding (arrow function)', () => {
  let callCount = 0;
  function outer(this: { name: string }) {
    // lock inner scope to parent scope
    return () => {
      callCount++;
      return `name: ${this.name}. call count: ${callCount}`;
    };
  }
  const result = outer.call({ name: 'Alex' });
  const cached = memoizeFirst(result);

  expect(cached()).toBe('name: Alex. call count: 1');
  expect(cached()).toBe('name: Alex. call count: 1');
});

test('this binding (class property)', () => {
  class Person {
    #name: string;
    constructor(name: string) {
      this.#name = name;
    }
    getName = () => {
      return this.#name;
    };
  }
  const person = new Person('Alex');
  const cached = memoizeFirst(person.getName);

  expect(cached()).toBe('Alex');
});
