# cache-first

Create a function that caches the result of the first function call.

```ts
function sayHello(name: string): string {
  return `Hello ${name}`;
}
const cached = cacheFirst(sayHello);

cached('Alex'); // returns "Hello Alex"
cached('Sam'); // returns "Hello Alex" (underlying `sayHello` function not called)

cached.clear();

cached('Sam'); // returns "Hello Sam"
```
