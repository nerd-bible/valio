import { pipe, type Pipe } from "./pipe";

function primitive<T>(name: string, typeCheck: (v: T) => v is T) {
	return pipe({ name, typeCheck }, { name, typeCheck });
}

export function boolean() {
	return primitive("boolean", (v): v is boolean => typeof v == "boolean");
}

export function undefined() {
	return primitive("undefined", (v): v is undefined => typeof v == "undefined");
}

function null_() {
	return primitive<null>("null", (v): v is null => v === null);
}
export { null_ as null };

export function number() {
	interface Numberr extends Pipe<any, number> {
		min(n: number): this;
		max(n: number): this;
	}

	return {
		...primitive("number", (v): v is number => typeof v == "number"),

		min(n: number) {
			return this.refine((v) => (v > n ? "" : `must be > ${n}`));
		},
		max(n: number) {
			return this.refine((v) => (v < n ? "" : `must be < ${n}`));
		},
	} as Numberr;
}

export function string() {
	interface Stringg extends Pipe<any, string> {
		regex(re: RegExp): this;
		nonempty(): this;
	}

	return {
		...primitive("string", (v): v is string => typeof v == "string"),

		regex(re: RegExp) {
			return this.refine((v) => (v.match(re) ? "" : `must match ${re.source}`));
		},
		nonempty() {
			return this.refine((v) => (v.length ? "" : `must be nonempty`));
		},
	} as Stringg;
}

export type Literal = string | number | bigint | boolean | null | undefined;
export function literal<T extends Literal>(literal: T) {
	return primitive(`${literal}`, (v): v is T => v == literal);
}

function enum_<T extends Literal>(literals: Array<T>) {
	return primitive(`${literals.join(",")}`, (v: any): v is T =>
		literals.includes(v),
	);
}
export { enum_ as enum };
