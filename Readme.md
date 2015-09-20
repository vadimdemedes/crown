# crown [![Circle CI](https://circleci.com/gh/vdemedes/crown.svg?style=svg)](https://circleci.com/gh/vdemedes/crown)

Give access to your new features gradually.
Make them available to a percentage of your users, certain group or specific users.
Get feedback, make users happy by providing exclusive access and don't break everything at once!

Inspired by Ruby's [rollout](https://github.com/FetLife/rollout) gem.


<h1 align="center">
  <br>
  <img width="200" src="media/logo.png">
  <br>
  <br>
  <br>
</h1>


### Features

- Configurable backend
- Roll out features to percentage of users, groups or specific users
- Enable/disable features
- Promise-based API


### Installation

```
$ npm install crown --save
```


### Usage

```js
const Crown = require('crown');

let rollout = new Crown();


// enable `chat` for everyone
yield rollout.enable('chat');

var hasChat = yield rollout.isEnabled('chat'); // true


// enable `chat` for 20% of users
yield rollout.enablePercentage('chat', 20);

var hasChat = yield rollout.isEnabled('chat', { id: 1 }); // true
```

#### Check if user has access to a feature

To validate access of a certain user to a feature, use `isEnabled()` method.
It accepts 2 arguments: `name` of the feature and `user` object.
`user` can be `Number`, `String` or `Object` with `id` property.

```js
let user = { id: 1 };

let hasChat = yield rollout.isEnabled('chat', user);
```

If your user objects store id in a different property than `id`,
you can customize it via `idAttribute`:

```js
rollout.idAttribute = '_id';
```


#### Enable feature for everyone

`enable()` method gives access to all users, regardless of any other rules.

```js
yield rollout.enable('chat');
```

To disable feature for everyone:

```js
yield rollout.disable('chat');
```


#### Enable feature for a percentage of users

You can enable certain feature for only a percentage of all users:

```js
yield rollout.enablePercentage('chat', 25);
```

The algorithm for determining which users are given access is this:

```
CRC32(user_id + feature_name) % 100 < percentage
```


#### Enable feature for a group of users

You can register a group of users, that satisfy some custom criteria:

```js
rollout.group('beta-testers', function (user) {
  return user.role === 'beta-tester';
});
```

and give access only to this group:

```js
yield rollout.enableGroup('chat', 'beta-testers');

let betaUser = { role: 'beta-tester' };
let guestUser = {};

yield rollout.isEnabled('chat', betaUser); // true
yield rollout.isEnabled('chat', guestUser); // false
```

To disable a feature for previously enabled group:

```js
yield rollout.disableGroup('chat', 'beta-testers');
```


#### Enable feature for a specific user

You can also restrict access to specific users:

```js
let goodUser = { id: 1 };
let badUser = { id: 2 };

yield rollout.enableUser('chat', goodUser);

yield rollout.isEnabled('chat', goodUser); // true
yield rollout.isEnabled('chat', badUser); // false
```

To disable a feature for previously enabled user:

```js
yield rollout.disableUser('chat', goodUser);
```


### Backend stores

Crown can use whatever backend you want, as soon as there is an adapter for it.
Take a look how easy it is to write one, check out built-in [MemoryStore](https://github.com/vdemedes/crown-memory-store/blob/master/index.js).

There are 2 backend stores available: [MemoryStore](https://github.com/vdemedes/crown-memory-store) (built-in) and [RedisStore](https://github.com/vdemedes/crown-redis-store).

To use redis store, install it via `$ npm install crown-redis-store` and:

```js
const RedisStore = require('crown-redis-store');
const Crown = require('crown');

// for accepted arguments see https://www.npmjs.com/package/redis#redis-createclient
let redisStore = new RedisStore(6379, '127.0.0.1');

let rollout = new Crown({
  store: redisStore
});
```


### Tests

[![Circle CI](https://circleci.com/gh/vdemedes/crown.svg?style=svg)](https://circleci.com/gh/vdemedes/crown)

```
$ make test
```


### License

MIT © [vdemedes](https://github.com/vdemedes)
