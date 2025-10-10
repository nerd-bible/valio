import { pipe, type Pipe } from "./pipe";

export function boolean() {
	return {
		...pipe<any, boolean>("any", "boolean"),
		isOutput: (data: any) => typeof data == "boolean",
	};
}

export function undefined() {
	return {
		...pipe<any, undefined>("any", "undefined"),
		isOutput: (data: any) => typeof data == "undefined",
	};
}

export function number() {
	interface Number extends Pipe<any, number> {
		min(n: number): this;
		max(n: number): this;
	}

	return {
		...pipe<any, number>("any", "number"),
		isOutput: (data: unknown) => typeof data == "number",

		min(n: number) {
			return this.refine((v) => (v > n ? "" : `must be > ${n}`));
		},
		max(n: number) {
			return this.refine((v) => (v < n ? "" : `must be < ${n}`));
		},
	} as Number;
}

export function string() {
	interface Stringg extends Pipe<any, string> {
		regex(re: RegExp): this;
		nonempty(): this;
	}

	return {
		...pipe<any, string>("any", "string"),
		isOutput: (data: any) => typeof data == "string",

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
	return {
		...pipe<any, T>("any", "literal"),
		isOutput: (v: any) => v == literal,
	};
}
// Have to use this syntax because JS doesn't like "enum" and "null".
function enum_<T extends Literal>(literals: Array<T>) {
	return {
		...pipe<any, T>("any", "enum"),
		isOutput: (v: any) => literals.includes(v),
	};
}
export { enum_ as enum };

function null_() {
	return {
		...pipe<any, null>("any", "null"),
		isOutput: (data: any) => data === null,
	};
}
export { null_ as null };
