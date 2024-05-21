# limit-once

Create a `once` function that caches the result of the first function call. `limit-once` let's you lazily evaluate a value (using a function), and then hold onto the value forever.

> [!NOTE]
> This package is still under construction

Features:

- synchronous variant (`0.2 Kb`)
- asynchronous variant for promises (`1Kb`)
- only include the code for the variant(s) you want
- both variants support cache clearing

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

### Cache clearing (`.clear()`)

You can clear the cache of a onced function by using the `.clear()` function property.

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

Our async variant allows you to have a `once` functionality for functions that `Promise`.

```ts
import { onceAsync } from 'limit-once/async';

async function getLoggedInUser() {
  await fetch('/user').json();
}

// We don't want every call to `getLoggedInUser()` to call `fetch` again.
// Ideally we would store the result of the first successful call and return that!

const getLoggedInUserOnce = asyncOnce(getLoggedInUser);

const user1 = await getLoggedInUserOnce();

// subsequent calls won't call fetch, and will return the previously fulfilled promise value.
const user2 = await getLoggedInUserOnce();
```

A "rejected" promise call will not be cached and will allow the wrapped function to be called again

```ts
import { onceAsync } from 'limit-once/async';

let callCount = 0;
async function maybeThrow({ shouldThrow }: { shouldThrow: boolean }): Promise<string> {
  callCount++;

  if (shouldThrow) {
    throw new Error(`Call count: ${callCount}`);
  }

  return `Call count: ${callCount}`;
}
const maybeThrowOnce = asyncOnce(maybeThrow);

expect(async () => await maybeThrowOnce({ shouldThrow: true })).toThrowError('Call count: 1');

// failure result was not cached, underlying `maybeThrow` called again
expect(async () => await maybeThrowOnce({ shouldThrow: true })).toThrowError('Call count: 2');

// our first successful result will be cached
expect(await maybeThrowOnce({ shouldThrow: false })).toBe('Call count: 3');
expect(await maybeThrowOnce({ shouldThrow: false })).toBe('Call count: 3');
```

If multiple calls are made to the onced function while the original promise is still `"pending"`, then the original promise is re-used. This prevents multiple calls to the underlying function.

```ts
import { onceAsync } from 'limit-once/async';

async function getLoggedInUser() {
  await fetch('/user').json();
}

export const getLoggedInUserOnce = asyncOnce(getLoggedInUser);

const promise1 = getLoggedInUserOnce();

// This second call to `getLoggedInUserOnce` while the `getLoggedInUser` promise
// is still "pending" will return the same promise that the first call created.
const promise2 = getLoggedInUserOnce();

console.log(promise1 === promise2); // "true"
```

### Cache clearing (`.clear()`)

You can clear the cache of a onced async function by using the `.clear()` function property.

```ts
import { onceAsync } from 'limit-once/async';

let callCount = 0;
async function getCallCount(): Promise<string> {
  return `Call count: ${callCount}`;
}

const onced = asyncOnce(getCallCount);

expect(await onced({ shouldThrow: false })).toBe('Call count: 1');
expect(await onced({ shouldThrow: false })).toBe('Call count: 1');

onced.clear();

expect(await onced({ shouldThrow: false })).toBe('Call count: 2');
expect(await onced({ shouldThrow: false })).toBe('Call count: 2');
```

If onced async function is `"pending"` when `.clear()` is called, then the promise will be rejected.

```ts
import { onceAsync } from 'limit-once/async';

async function getName(): Promise<string> {
  return 'Alex';
}

const getNameOnce = asyncOnce(getName);

const promise1 = getNameOnce().catch(() => {
  console.log('rejected');
});

// cached cleared while promise was pending
// will cause `promise1` to be rejected
getNameOnce.clear();
```
