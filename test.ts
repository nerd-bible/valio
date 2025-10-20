// 1. Classes
class Foo {
	constructor(public foo: number) {}

	clone(): this {
		return { ...this };
	}
}

function foo(foo: number) {
	return new Foo(foo);
}

class Bar extends Foo {
	constructor(foo: number, public bar: number) {
		super(foo);
	}
}

function bar(foo: number, bar: number) {
	return new Bar(foo, bar);
}

const a = foo(10);
const b = bar(a.foo, 11);
const c = b.clone();
console.log(c.bar);

const d = Object.create(Object.getPrototypeOf(a), Object.getOwnPropertyDescriptors(a))
console.log(d)
