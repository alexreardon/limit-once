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

function sayHello(name: string): string {
  return `Hello ${name}`;
}
const cached = once(sayHello);

cached('Alex');
// sayHello called and "Hello Alex" is returned
// "Hello Alex" is put into the cache.
// returns "Hello Alex"

cached('Sam');
// sayHello is not called
// "Hello Alex" is returned from the cache.

cached('Greg');
// sayHello is not called
// "Hello Alex" is returned from the cache.
```

### Cache clearing (`.clear()`)

You can clear the cache of a memoized function by using a `.clear()` function that is on your cached function.

```ts
import { once } from 'limit-once';

function sayHello(name: string): string {
  return `Hello ${name}`;
}
const cached = once(sayHello);

cached('Alex');
// sayHello called and "Hello Alex" is returned.
// "Hello Alex" is put into the cache
// cached function returns "Hello Alex"

cached('Sam');
// sayHello is not called
// "Hello Alex" is returned from cache

cached.clear();

cached('Greg');
// sayHello is called and "Hello Greg" is returned.
// "Hello Greg" is put into the cache
// "Hello Greg" is returned.
```

## Async variant

```ts
import { onceAsync } from 'limit-once/async';

export const getLoggedInUser = onceAsync(async function getLoggedInUser(): Promise<User> {
  await fetch('/user').json();
});
```

```ts
const user1 = await getLoggedInUser();
// after result is calculated, `fetch` won't be called again
const user2 = await getLoggedInUser();
```

```ts
// will kick off the `fetch` call
const promise1 = getLoggedInUser();

// will get the same promise back as ... TODO
const promise2 = getLoggedInUser();
```
