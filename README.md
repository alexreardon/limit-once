# memoize-first

Create a function that caches the result of the first function call. This utility is similar to my other package [`memoize-one`](https://github.com/alexreardon/memoize-one), except that `memoize-first` won't call the cached function again, even when the arguments change. `memoize-first` let's you lazily evaluate a value (using a function), and then hold onto the value forever.

```ts
import { memoizeFirst } from 'memoize-first';

function sayHello(name: string): string {
  return `Hello ${name}`;
}
const cached = memoizeFirst(sayHello);

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

```ts
// is-safari.ts

import { memoizeFirst } from 'memoize-first';

// We are caching the result of our 'isSafari()' function as the result
// of `isSafari()` won't change.
export const isSafari = memoizeFirst(function isSafari(): boolean {
  const { userAgent } = navigator;
  return userAgent.includes('AppleWebKit') && !userAgent.includes('Chrome');
});

// app.ts
if (isSafari()) {
  applySafariFix();
}
```

## Installation

```bash
# yarn
yarn add memoize-first

# npm
npm install memoize-first

# bun
bun add memoize-one
```

## Cache clearing (`.clear()`)

You can clear the cache of a memoized function by using a `.clear()` function that is on your cached function.

```ts
import { memoizeFirst } from 'memoize-first';

function sayHello(name: string): string {
  return `Hello ${name}`;
}
const cached = memoizeFirst(sayHello);

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
