import { pipe, type Pipe } from "./pipe";

function primitive<T>(name: string, typeCheck: (v: T) => v is T) {
	return pipe({ name, typeCheck }, { name, typeCheck });
}

export interface Boolean<I = boolean> extends Pipe<I, boolean> {}
export function boolean(): Boolean {
	return primitive("boolean", (v): v is boolean => typeof v == "boolean");
}

export interface Undefined<I = undefined> extends Pipe<I, undefined> {}
export function undefined(): Undefined {
	return primitive("undefined", (v): v is undefined => typeof v == "undefined");
}

export interface Any<I = any> extends Pipe<I, any> {}
export function any(): Any {
	return primitive("any", (v): v is any => true);
}

export interface Null<I = null> extends Pipe<I, null> {}
function null_(): Null {
	return primitive("null", (v): v is null => v === null);
}
export { null_ as null };

export interface Number<I = number> extends Pipe<I, number> {
	gt(n: number): this;
	gte(n: number): this;
	lt(n: number): this;
	lte(n: number): this;
}
export function number(): Number {
	return {
		...primitive<number>("number", (v): v is number => typeof v == "number"),

		gt(n: number) {
			return this.refine((v) => (v > n ? "" : `must be > ${n}`));
		},
		gte(n: number) {
			return this.refine((v) => (v >= n ? "" : `must be >= ${n}`));
		},
		lt(n: number) {
			return this.refine((v) => (v < n ? "" : `must be < ${n}`));
		},
		lte(n: number) {
			return this.refine((v) => (v <= n ? "" : `must be <= ${n}`));
		},
	} as ReturnType<typeof number>;
}

export interface String<I = string> extends Pipe<I, string> {
	regex(re: RegExp): this;
	nonempty(): this;
}
export function string(): String {
	return {
		...primitive<string>("string", (v): v is string => typeof v == "string"),

		regex(re: RegExp) {
			return this.refine((v) => (v.match(re) ? "" : `must match ${re.source}`));
		},
		nonempty() {
			return this.refine((v) => (v.length ? "" : `must be nonempty`));
		},
	} as ReturnType<typeof string>;
}

export type Lit = string | number | bigint | boolean | null | undefined;
export interface Literal<T extends Lit, I = T> extends Pipe<I, T> {
	literal: T;
}
export function literal<T extends Lit>(literal: T): Literal<T> {
	const res = primitive<T>(
		`${literal}`,
		(v): v is T => v == literal,
	) as Literal<T>;
	res.literal = literal;
	return res;
}

export interface Enum<T extends Lit, I = T> extends Pipe<I, T> {}
function enum_<T extends Lit>(literals: Array<T>): Enum<T> {
	return primitive<T>(`${literals.join(",")}`, (v: any): v is T =>
		literals.includes(v),
	);
}
export { enum_ as enum };

export class HeheXd {}
