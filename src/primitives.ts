import { Pipe, Task } from "./pipe";

function primitive<T>(name: string, typeCheck: (v: T) => v is T) {
	const t = new Task(name, typeCheck);
	return new Pipe(t, t);
}

export class Boolean extends Pipe<boolean, boolean> {
	constructor() {
		const t = new Task("boolean", (v): v is boolean => typeof v == "boolean");
		super(t, t);
	}
}

export function boolean() {
	return new Boolean();
}

export function undefined() {
	return primitive("undefined", (v): v is undefined => typeof v == "undefined");
}

export function any() {
	return primitive("any", (v): v is any => true);
}

function null_() {
	return primitive("null", (v): v is null => v === null);
}
export { null_ as null };

export class Number extends Pipe<number, number> {
	constructor() {
		const t = new Task("number", (v): v is number => typeof v == "number");
		super(t, t);
	}
	min(n: number) {
		return this.refine((v) => (v > n ? "" : `must be > ${n}`));
	}
	max(n: number) {
		return this.refine((v) => (v < n ? "" : `must be < ${n}`));
	}
}
export function number() {
	return new Number();
}

export class String extends Pipe<string, string> {
	constructor() {
		const t = new Task("string", (v): v is string => typeof v == "string");
		super(t, t);
	}
	regex(re: RegExp) {
		return this.refine((v) => (v.match(re) ? "" : `must match ${re.source}`));
	}
	nonempty() {
		return this.refine((v) => (v.length ? "" : `must be nonempty`));
	}
}
export function string() {
	return new String();
}

export type Lit = string | number | bigint | boolean | null | undefined;
export function literal<T extends Lit>(literal: T) {
	return primitive<T>(`${literal}`, (v): v is T => v == literal);
}

function enum_<T extends Lit>(literals: Array<T>) {
	return primitive<T>(`${literals.join(",")}`, (v: any): v is T =>
		literals.includes(v),
	);
}
export { enum_ as enum };
