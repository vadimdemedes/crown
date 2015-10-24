'use strict';

/**
 * Dependencies
 */

const Crown = require('./');
const test = require('ava');


/**
 * Tests
 */

test('enable feature for all users', function * (t) {
	t.plan(3);

	let rollout = new Crown();

	yield rollout.enable('chat');

	let feature = yield rollout.get('chat');
	t.same(feature, {
		percentage: 100
	});

	// check if random user has access
	let isEnabled = yield rollout.isEnabled('chat', { id: 1 });
	t.true(isEnabled);

	// check if all users have access
	isEnabled = yield rollout.isEnabled('chat');
	t.true(isEnabled);
});

test('disable feature for all users', function * (t) {
	t.plan(2);

	let rollout = new Crown();

	yield rollout.enable('chat');

	let isEnabled = yield rollout.isEnabled('chat');
	t.true(isEnabled);

	yield rollout.disable('chat');

	isEnabled = yield rollout.isEnabled('chat');
	t.false(isEnabled);
});

test('enable feature for a group of users', function * (t) {
	t.plan(4);

	let rollout = new Crown();

	rollout.group('beta-testers', function (user) {
		return user.role === 'beta-tester';
	});

	rollout.group('alpha-testers', function (user) {
		return user.role === 'alpha-tester';
	});

	yield rollout.enableGroup('chat', 'beta-testers');
	yield rollout.enableGroup('chat', 'alpha-testers');

	let feature = yield rollout.get('chat');
	t.same(feature, {
		groups: ['beta-testers', 'alpha-testers']
	});

	// check if beta-tester has access
	let isEnabled = yield rollout.isEnabled('chat', { id: 1, role: 'beta-tester' });
	t.true(isEnabled);

	// check if alpha-tester has access
	isEnabled = yield rollout.isEnabled('chat', { id: 1, role: 'alpha-tester' });
	t.true(isEnabled);

	// check if regular user has access
	isEnabled = yield rollout.isEnabled('chat', { id: 1 });
	t.false(isEnabled);
});

test('disable feature for a group', function * (t) {
	t.plan(6);

	let rollout = new Crown();

	rollout.group('beta-testers', function (user) {
		return user.role === 'beta-tester';
	});

	rollout.group('alpha-testers', function (user) {
		return user.role === 'alpha-tester';
	});

	yield rollout.enableGroup('chat', 'beta-testers');
	yield rollout.enableGroup('chat', 'alpha-testers');

	let feature = yield rollout.get('chat');
	t.same(feature, {
		groups: ['beta-testers', 'alpha-testers']
	});

	// check if beta-tester has access
	let isEnabled = yield rollout.isEnabled('chat', { id: 1, role: 'beta-tester' });
	t.true(isEnabled);

	// check if alpha-tester has access
	isEnabled = yield rollout.isEnabled('chat', { id: 1, role: 'alpha-tester' });
	t.true(isEnabled);

	yield rollout.disableGroup('chat', 'beta-testers');

	feature = yield rollout.get('chat');
	t.same(feature, {
		groups: ['alpha-testers']
	});

	// check if beta-tester has access
	isEnabled = yield rollout.isEnabled('chat', { id: 1, role: 'beta-tester' });
	t.false(isEnabled);

	// check if alpha-tester has access
	isEnabled = yield rollout.isEnabled('chat', { id: 1, role: 'alpha-tester' });
	t.true(isEnabled);
});

test('enable feature for specific users', function * (t) {
	t.plan(3);

	let rollout = new Crown();

	yield rollout.enableUser('chat', { id: 1 });

	let feature = yield rollout.get('chat');
	t.same(feature, {
		users: [1]
	});

	// check if allowed user has access
	let isEnabled = yield rollout.isEnabled('chat', { id: 1 });
	t.true(isEnabled);

	// check if 3rd-party user has access
	isEnabled = yield rollout.isEnabled('chat', { id: 2 });
	t.false(isEnabled);
});

test('enable feature for a specific user by id', function * (t) {
	t.plan(3);

	let rollout = new Crown();

	yield rollout.enableUser('chat', 1);

	let feature = yield rollout.get('chat');
	t.same(feature, {
		users: ['1']
	});

	// check if allowed user has access
	let isEnabled = yield rollout.isEnabled('chat', 1);
	t.true(isEnabled);

	// check if 3rd-party user has access
	isEnabled = yield rollout.isEnabled('chat', 2);
	t.false(isEnabled);
});

test('enable feature for a specific user by string id', function * (t) {
	t.plan(3);

	let rollout = new Crown();

	yield rollout.enableUser('chat', '1');

	let feature = yield rollout.get('chat');
	t.same(feature, {
		users: ['1']
	});

	// check if allowed user has access
	let isEnabled = yield rollout.isEnabled('chat', '1');
	t.true(isEnabled);

	// check if 3rd-party user has access
	isEnabled = yield rollout.isEnabled('chat', '2');
	t.false(isEnabled);
});

test('disable feature for specific users', function * (t) {
	t.plan(6);

	let rollout = new Crown();

	yield rollout.enableUser('chat', 1);
	yield rollout.enableUser('chat', 2);

	let feature = yield rollout.get('chat');
	t.same(feature, {
		users: ['1', '2']
	});

	// check if allowed users have access
	let isEnabled = yield rollout.isEnabled('chat', 1);
	t.true(isEnabled);

	isEnabled = yield rollout.isEnabled('chat', 2);
	t.true(isEnabled);

	yield rollout.disableUser('chat', 1);

	feature = yield rollout.get('chat');
	t.same(feature, {
		users: ['2']
	});

	// check if allowed user has access
	isEnabled = yield rollout.isEnabled('chat', 1);
	t.false(isEnabled);

	isEnabled = yield rollout.isEnabled('chat', 2);
	t.true(isEnabled);
});

test('enable feature for a percentage of users', function * (t) {
	t.plan(5);

	let rollout = new Crown();

	// test 20% with 120 users
	yield rollout.enablePercentage('chat', 20);

	let feature = yield rollout.get('chat');
	t.same(feature, {
		percentage: 20
	});

	let users = yield testFeature(rollout, 'chat', 120);

	t.true(users >= 19 && users <= 21);

	// test 20% with 200 users
	users = yield testFeature(rollout, 'chat', 200);

	t.true(users >= 35 && users <= 45);

	// test 5% with 100 users
	yield rollout.enablePercentage('chat', 5);

	feature = yield rollout.get('chat');
	t.same(feature, {
		percentage: 5
	});

	users = yield testFeature(rollout, 'chat', 100);

	t.true(users >= 3 && users <= 7);
});


/**
 * Helpers
 */

function * testFeature (rollout, feature, total) {
	let users = 0;

	while (total > 0) {
		let isEnabled = yield rollout.isEnabled(feature, { id: total });

		if (isEnabled) {
			users++;
		}

		total--;
	}

	return users;
}
