const build = require('../src/make');
const assert = require('chai').assert;

const dictionary = {
	sync: () => 'sync result',
	async: () => Promise.resolve('async result'),
	error: () => { throw new Error('Sync Error'); },
	asyncError: () => Promise.reject(new Error('Async Error'))
}

function interpreterFixture(yieldedValue) {
	const func = dictionary[yieldedValue];

	if(func === undefined)
		throw new Error('Unable to interpret');

	return func();
}

//const fetchJsonInterpreter = build(fetchJson);
const fakeInterpreter = build(interpreterFixture);

describe('interpreter', function() {
	it('should interpret sync response', function() {
		const sync = function*() {
			return yield 'sync';
		}

		return fakeInterpreter(sync())
			.then(result => {
				assert.equal(result, 'sync result');
			});
	});

	it('should interpret async response', function() {
		const async = function*() {
			return yield 'async';
		}

		return fakeInterpreter(async())
			.then(result => {
				assert.equal(result, 'async result');
			});
	});

	it('should handle multiple yield', function() {
		const multiple = function*() {
			const a = yield 'sync';
			const b = yield 'async';
			return a + ' ' + b;
		}

		return fakeInterpreter(multiple())
			.then(result => {
				assert.equal(result, 'sync result async result');
			});
	});

	it('should handle child generator', function() {
		const generatorA = function*() {
			return yield* generatorB();
		}

		const generatorB = function*() {
			return yield 'sync';
		}

		return fakeInterpreter(generatorA())
			.then(result => {
				assert.equal(result, 'sync result');
			});
	});

	it('should bubble error when happening before first yield', function() {
		const generator = function*() {
			if(0 === 0) {
				throw new Error('Before yield');
			}
			return yield 'async';
		}

		return fakeInterpreter(generator())
			.catch(err => {
				assert.equal(err.message, 'Before yield');
			});
	});

	it('should bubble error when happening after yield', function() {
		const generator = function*() {
			yield 'async';
			throw new Error('After Yield');
		}

		return fakeInterpreter(generator())
			.catch(err => {
				assert.equal(err.message, 'After Yield');
			});
	});

	it('should bubble sync error when happening during yield', function() {
		const generator = function*() {
			yield 'error';
		}

		return fakeInterpreter(generator())
			.catch(err => {
				assert.equal(err.message, 'Sync Error');
			});
	});

	it('should bubble async error when happening during yield', function() {
		const generator = function*() {
			yield 'asyncError';
		}

		return fakeInterpreter(generator())
			.catch(err => {
				assert.equal(err.message, 'Async Error');
			});
	});

	it('should throw back async error when happening during yield', function() {
		const generator = function*() {
			try {
				yield 'asyncError';
			} catch(err) {
				assert.equal(err.message, 'Async Error');
			}

			return 'OK';
		}

		return fakeInterpreter(generator())
			.then(result => {
				assert.equal(result, 'OK');
			});
	});

	it('should throw back sync error when happening during yield', function() {
		const generator = function*() {
			try {
				yield 'error';
			} catch(err) {
				assert.equal(err.message, 'Sync Error');
			}

			return 'OK';
		}

		return fakeInterpreter(generator())
			.then(result => {
				assert.equal(result, 'OK');
			});
	});

	it('should handle complex generator', function() {

		const generatorA = function*() {
			try {
				yield 'error';
			} catch (err) {
				assert.equal(err.message, 'Sync Error');
			}

			const resultB = yield* generatorB();

			assert.equal(resultB, 'async result');

			assert.equal(yield 'sync', 'sync result');

			throw new Error('Custom Error');
		}

		const generatorB = function*() {
			try {
				yield 'asyncError';
			} catch (err) {
				assert.equal(err.message, 'Async Error');
			}

			return yield 'async';
		}

		return fakeInterpreter(generatorA())
			.catch(err => {
				assert.equal(err.message, 'Custom Error');
			});
	});
});