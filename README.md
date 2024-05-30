# limit-once

![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/alexreardon/limit-once/check.yml)

Cache the first successful result of a `function` call.

> [!NOTE]
> This package is still under construction

Features:

- [Synchronous variant](#synchronous-variant) (tiny `150B`)
- [Asynchronous variant for promises](#asynchronous-variant) (tiny `360B`)
- Only include the code for the variant(s) you want
- Both variants support cache clearing (avoid memory leaks)
- Both variants respect `this` control
- Full `TypeScript` support

## Installation

```bash
# yarn
yarn add limit-once

# npm
npm install limit-once

# bun
bun add limit-once
```

## Synchronous variant

Create a new `function` that only allows an existing `function` to be called once.

```ts
import { once } from 'limit-once';

function getGreeting(name: string): string {
  return `Hello ${name}`;
}
const getGreetingOnce = once(getGreeting);

getGreetingOnce('Alex');
// getGreeting called and "Hello Alex" is returned
// "Hello Alex" is put into the cache.
// returns "Hello Alex"

getGreetingOnce('Sam');
// getGreeting is not called
// "Hello Alex" is returned from the cache.

getGreetingOnce('Greg');
// getGreeting is not called
// "Hello Alex" is returned from the cache.
```

> [!NOTE]
> If you want the wrapped function to cache the result, but recompute the result when the arguments change: use [`memoize-one`](https://github.com/alexreardon/memoize-one)

### Only successful calls are cached

If the function being wrapped `throw`s an error, then that `throw` is not cached, and the wrapped function is allowed to be called again

```ts
import { once } from 'limit-once';

let callCount = 0;
function maybeThrow({ shouldThrow }: { shouldThrow: boolean }): string {
  callCount++;

  if (shouldThrow) {
    throw new Error(`Call count: ${callCount}`);
  }

  return `Call count: ${callCount}`;
}
const maybeThrowOnce = once(maybeThrow);

expect(() => maybeThrowOnce({ shouldThrow: true })).toThrowError('Call count: 1');

// failure result was not cached, underlying `maybeThrow` called again
expect(() => maybeThrowOnce({ shouldThrow: true })).toThrowError('Call count: 2');

// our first successful result will be cached
expect(maybeThrowOnce({ shouldThrow: false })).toBe('Call count: 3');
expect(maybeThrowOnce({ shouldThrow: false })).toBe('Call count: 3');
```

### Cache clearing (`once(fn).clear()`)

You can clear the cache of a onced `function` by using the `.clear()` `function` property.

```ts
import { once } from 'limit-once';

function getGreeting(name: string): string {
  return `Hello ${name}`;
}
const getGreetingOnce = once(getGreeting);

getGreetingOnce('Alex');
// getGreeting called and "Hello Alex" is returned.
// "Hello Alex" is put into the cache
// getGreetingOnce function returns "Hello Alex"

getGreetingOnce('Sam');
// getGreeting is not called
// "Hello Alex" is returned from cache

getGreetingOnce.clear();

getGreetingOnce('Greg');
// getGreeting is called and "Hello Greg" is returned.
// "Hello Greg" is put into the cache
// "Hello Greg" is returned.
```

## Asynchronous variant

Allows you to have a `once` functionality for a `function` that returns a `Promise`.

```ts
import { onceAsync } from 'limit-once';

async function getPermissions(): Promise<Record<string, boolean>> {
  // Note: could use "zod" to validate response shape
  const response = await fetch('/permissions');
  return await response.json();
}

// We don't want every call to `getPermissions()` to call `fetch` again.
// Ideally we would store the result of the first successful call and return that!

const getPermissionsOnce = onceAsync(getPermissions);

const user1 = await getPermissionsOnce();

// subsequent calls won't call fetch, and will return the previously fulfilled promise value.
const user2 = await getPermissionsOnce();
```

### Only `"fulfilled"` `Promises` are cached

If the wrapped `function` has it's `Promise` `"rejected"`, then the `"rejected"` `Promise` will not be cached, and the underlying `function` can be called again.

```ts
import { onceAsync } from 'limit-once';

let callCount = 0;
async function maybeThrow({ shouldThrow }: { shouldThrow: boolean }): Promise<string> {
  callCount++;

  if (shouldThrow) {
    throw new Error(`Call count: ${callCount}`);
  }

  return `Call count: ${callCount}`;
}
const maybeThrowOnce = onceAsync(maybeThrow);

expect(async () => await maybeThrowOnce({ shouldThrow: true })).toThrowError('Call count: 1');

// failure result was not cached, underlying `maybeThrow` called again
expect(async () => await maybeThrowOnce({ shouldThrow: true })).toThrowError('Call count: 2');

// our first successful result will be cached
expect(await maybeThrowOnce({ shouldThrow: false })).toBe('Call count: 3');
expect(await maybeThrowOnce({ shouldThrow: false })).toBe('Call count: 3');
```

### Calls while a `Promise` is `"pending"`

If multiple calls are made to a `onceAsync(fn)` `function` while the original `Promise` is still `"pending"`, then the original `Promise` is re-used.

✨ This prevents multiple calls to the underlying `function` ✨

```ts
import { onceAsync } from 'limit-once';

async function getPermissions(): Promise<Record<string, boolean>> {
  // Note: could use "zod" to validate response shape
  const response = await fetch('/permissions');
  return await response.json();
}

export const getPermissionsOnce = onceAsync(getPermissions);

const promise1 = getPermissionsOnce();

// This second call to `getPermissionsOnce()` while the `getPermissions()` promise
// is still "pending" will return the same promise that the first call created.
// `fetch` is only called once (by the first call)
const promise2 = getPermissionsOnce();

console.log(promise1 === promise2); // "true"
```

### Cache clearing (`onceAsync(fn).clear()`)

You can clear the cache of a `onceAsync` `function` by using the `.clear()` `function` property.

```ts
import { onceAsync } from 'limit-once';

let callCount = 0;
async function getCallCount(): Promise<string> {
  return `Call count: ${callCount}`;
}

const onced = onceAsync(getCallCount);

expect(await onced({ shouldThrow: false })).toBe('Call count: 1');
expect(await onced({ shouldThrow: false })).toBe('Call count: 1');

onced.clear();

expect(await onced({ shouldThrow: false })).toBe('Call count: 2');
expect(await onced({ shouldThrow: false })).toBe('Call count: 2');
```

If onced async function is `"pending"` when `.clear()` is called, then the promise(s) that the onced function has returned will be rejected.

```ts
import { onceAsync } from 'limit-once';

async function getName(): Promise<string> {
  return 'Alex';
}

const getNameOnce = onceAsync(getName);

const promise1 = getNameOnce().catch(() => {
  console.log('rejected promise 1');
});

const promise2 = getNameOnce().catch(() => {
  console.log('rejected promise 2');
});

// cached cleared while promise was pending
// will cause `promise1` to be rejected
getNameOnce.clear();

// console.log → "rejected promise 1"
// console.log → "rejected promise 2"
```
