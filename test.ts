function foo(bar: number) {
	this.bar = bar;
	return this;
}

const a = foo(14);
a.bar;
