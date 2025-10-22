import { HalfPipe, Pipe } from "./pipe";

function primitive<T>(name: string, typeCheck: (v: T) => v is T) {
	const check = new HalfPipe(name, typeCheck);
	return new Pipe(check, check);
}

export function boolean() {
	return primitive<boolean>(
		"boolean",
		(v): v is boolean => typeof v == "boolean",
	);
}

export function undefined() {
	return primitive<undefined>(
		"undefined",
		(v): v is undefined => typeof v == "undefined",
	);
}

export function any() {
	return primitive<any>("any", (v): v is any => true);
}

function null_() {
	return primitive<null>("null", (v): v is null => v === null);
}
export { null_ as null };

class Comparable<I, O> extends Pipe<I, O> {
	gt(n: O) {
		return this.refine((v) => (v > n ? "" : `must be > ${n}`), { gt: n });
	}
	gte(n: O) {
		return this.refine((v) => (v >= n ? "" : `must be >= ${n}`), { gte: n });
	}
	lt(n: O) {
		return this.refine((v) => (v < n ? "" : `must be < ${n}`), { lt: n });
	}
	lte(n: O) {
		return this.refine((v) => (v <= n ? "" : `must be <= ${n}`), { lte: n });
	}
}

class Number extends Comparable<number, number> {
	constructor() {
		const check = new HalfPipe("number", (v) => typeof v == "number");
		super(check, check);
	}
}
export function number() {
	return new Number();
}

class Arrayish<
	I,
	O extends {
		length: number;
	},
> extends Pipe<I, O> {
	minLength(n: number) {
		return this.refine(
			(v) => (v.length >= n ? "" : `must have length >= ${n}`),
			{ minLength: n },
		);
	}
	maxLength(n: number) {
		return this.refine(
			(v) => (v.length <= n ? "" : `must have length <= ${n}`),
			{ maxLength: n },
		);
	}
}

class String extends Arrayish<string, string> {
	constructor() {
		const check = new HalfPipe("string", (v) => typeof v == "string");
		super(check, check);
	}

	regex(re: RegExp) {
		return this.refine((v) => (v.match(re) ? "" : `must match ${re.source}`), {
			regex: re.source,
		});
	}
}
export function string(): String {
	return new String();
}

export type Lit = string | number | bigint | boolean | null | undefined;

class Literal<T extends Lit> extends Pipe<T, T> {
	constructor(public literal: T) {
		const check = new HalfPipe(`${literal}`, (v): v is T => v == literal);
		super(check, check);
	}
}
export function literal<T extends Lit>(literal: T) {
	return new Literal(literal);
}

class Enum<T extends Lit> extends Pipe<T, T> {
	constructor(public literals: T[]) {
		const check = new HalfPipe(`${literals.join(",")}`, (v: any): v is T =>
			literals.includes(v),
		);
		super(check, check);
	}
}
function enum_<T extends Lit>(literals: T[]): Enum<T> {
	return new Enum(literals);
}
export { enum_ as enum };

export class HeheXd {}
