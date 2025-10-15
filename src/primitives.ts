import { pipe, type Pipe } from "./pipe";

function primitive<T>(name: string, typeCheck: (v: T) => v is T) {
	return pipe({ name, typeCheck }, { name, typeCheck });
}

export interface Boolean {}

export function boolean(): Boolean & Pipe<boolean, boolean> {
	return primitive("boolean", (v): v is boolean => typeof v == "boolean");
}

export interface Undefined {}

export function undefined(): Undefined & Pipe<undefined, undefined> {
	return primitive("undefined", (v): v is undefined => typeof v == "undefined");
}

export interface Any {}

export function any(): Any & Pipe<any, any> {
	return primitive("any", (v): v is any => true);
}

export interface Null {}

function null_(): Null & Pipe<null, null> {
	return primitive("null", (v): v is null => v === null);
}
export { null_ as null };

export interface Number {
	min(n: number): this;
	max(n: number): this;
}
export function number(): Number & Pipe<number, number> {
	return {
		...primitive<number>("number", (v): v is number => typeof v == "number"),

		min(n: number) {
			return this.refine((v) => (v > n ? "" : `must be > ${n}`));
		},
		max(n: number) {
			return this.refine((v) => (v < n ? "" : `must be < ${n}`));
		},
	} as ReturnType<typeof number>;
}

export interface String {
	regex(re: RegExp): this;
	nonempty(): this;
}
export function string(): String & Pipe<string, string> {
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

export type Lit =
	| string
	| number
	| bigint
	| boolean
	| null
	| undefined;
export interface Literal {}
export function literal<T extends Lit>(literal: T): Literal & Pipe<T, T> {
	return primitive<T>(`${literal}`, (v): v is T => v == literal);
}

export interface Enum {}
function enum_<T extends Lit>(literals: Array<T>): Enum & Pipe<T, T> {
	return primitive<T>(`${literals.join(",")}`, (v: any): v is T =>
		literals.includes(v),
	);
}
export { enum_ as enum };
