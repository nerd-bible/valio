// 2. Interface + functions
interface Foo {
	foo: number;
	clone(): this;
}

function foo(foo: number): Foo {
	return {
		foo,
		clone() { return { ...this } }
	};
}

interface Bar extends Foo {
	bar: number;
}

function bar(foo_: number, bar: number): Bar {
	return {
		...foo(foo_) as any,
		bar,
	};
}

const a = foo(10);
const b = bar(a.foo, 11);
const c = b.clone();
console.log(c.bar);
