import { HalfPipe, Pipe } from "./pipe";

function primitive<T>(name: string, typeCheck: (v: T) => v is T) {
	const half = new HalfPipe(name, typeCheck);
	return new Pipe(half, half);
}

export function boolean() {
	return primitive<boolean>(
		"boolean",
		(v): v is boolean => typeof v == "boolean",
	);
}

// biome-ignore lint/suspicious/noShadowRestrictedNames: point of lib
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

export class Comparable<I, O> extends Pipe<I, O> {
	gt(n: O) {
		return this.refine((v) => v > n, "gt", { n });
	}
	gte(n: O) {
		return this.refine((v) => v >= n, "gte", { n });
	}
	lt(n: O) {
		return this.refine((v) => v < n, "lt", { n });
	}
	lte(n: O) {
		return this.refine((v) => v <= n, "lte", { n });
	}
	eq(n: O) {
		return this.refine((v) => v == n, "eq", { n });
	}
}

class ValioNumber extends Comparable<number, number> {
	constructor() {
		const half = new HalfPipe("number", (v) => typeof v == "number");
		super(half, half);
	}
}
export function number() {
	return new ValioNumber();
}

export class Arrayish<
	I,
	O extends {
		length: number;
	},
> extends Pipe<I, O> {
	minLength(n: number) {
		return this.refine((v) => v.length >= n, "minLength", { n });
	}
	maxLength(n: number) {
		return this.refine((v) => v.length <= n, "maxLength", { n });
	}
}

class ValioString extends Pipe<string, string> {
	constructor() {
		const half = new HalfPipe("string", (v) => typeof v == "string");
		super(half, half);
	}

	regex(re: RegExp) {
		return this.refine((v) => !!v.match(re), "regex", { regex: re.source });
	}
}
export function string(): ValioString {
	return new ValioString();
}

export type Lit = string | number | bigint | boolean | null | undefined;

class ValioLiteral<T extends Lit> extends Pipe<T, T> {
	constructor(public literal: T) {
		const half = new HalfPipe(`${literal}`, (v): v is T => v == literal);
		super(half, half);
	}
}
export function literal<T extends Lit>(literal: T) {
	return new ValioLiteral(literal);
}

class ValioEnum<T extends Lit> extends Pipe<T, T> {
	constructor(public literals: T[]) {
		const half = new HalfPipe(`${literals.join(",")}`, (v: any): v is T =>
			literals.includes(v),
		);
		super(half, half);
	}
}
function enum_<T extends Lit>(literals: T[]): ValioEnum<T> {
	return new ValioEnum(literals);
}
export { enum_ as enum };
