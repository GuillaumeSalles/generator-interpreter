'use strict';

function getNextPromise(interpreter, generator, resolveNextValue) {
	let iteration;
	try {
		iteration = resolveNextValue();
	} catch(err) {
		return Promise.reject(err);
	}

	if(iteration.done) {
		return Promise.resolve(iteration.value);
	}

	let nextValue;
	try {
		nextValue = interpreter(iteration.value);
	} catch (err) {
		return getNextPromise(interpreter, generator, () => generator.throw(err));
	}

	return Promise.resolve(nextValue)
		.then(
			value => getNextPromise(interpreter, generator, () => generator.next(value)),
			err => getNextPromise(interpreter, generator, () => generator.throw(err)));
}

module.exports = function (interpreter) {
	return generator => {
		return getNextPromise(interpreter, generator,() => generator.next());
	};
}