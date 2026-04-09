import { Pipe } from "./pipe.ts";

function primitive<T>(name: string, typeCheck: (v: any) => v is T) {
	return class extends Pipe<T, T> {
		get inputName() {
			return name;
		}
		inputTypeCheck(v: any) {
			return typeCheck(v);
		}

		get outputName() {
			return name;
		}
		outputTypeCheck(v: any) {
			return typeCheck(v);
		}
	};
}

export const ValioBoolean = primitive<boolean>(
	"boolean",
	(v): v is boolean => typeof v === "boolean",
);
export function boolean() {
	return new ValioBoolean();
}

export const ValioUndefined = primitive<undefined>(
	"undefined",
	(v): v is undefined => typeof v === "undefined",
);
function undefined_() {
	return new ValioUndefined();
}
export { undefined_ as undefined };

export const ValioAny = primitive<any>("any", (_v): _v is any => true);
export function any() {
	return new ValioAny();
}

export const ValioNull = primitive<null>("null", (v): v is null => v === null);
function null_() {
	return new ValioNull();
}
export { null_ as null };

export abstract class Comparable<I, O = I> extends Pipe<I, O> {
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
		return this.refine((v) => v === n, "eq", { n });
	}
	neq(n: O) {
		return this.refine((v) => v !== n, "neq", { n });
	}
}

export class ValioNumber extends Comparable<number> {
	static typeCheck(v: any): v is number {
		return typeof v === "number";
	}

	get inputName() {
		return "number";
	}
	inputTypeCheck(v: any) {
		return ValioNumber.typeCheck(v);
	}

	get outputName() {
		return this.inputName;
	}
	outputTypeCheck(v: any) {
		return ValioNumber.typeCheck(v);
	}
}
export function number() {
	return new ValioNumber();
}

export class ValioDate extends Comparable<Date> {
	static typeCheck(v: any): v is Date {
		return v instanceof Date;
	}

	get inputName() {
		return "date";
	}
	inputTypeCheck(v: any) {
		return ValioDate.typeCheck(v);
	}

	get outputName() {
		return this.inputName;
	}
	outputTypeCheck(v: any) {
		return ValioDate.typeCheck(v);
	}
}
export function date(): ValioDate {
	return new ValioDate();
}

export abstract class Arrayish<
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
	length(n: number) {
		return this.refine((v) => v.length === n, "eqLength", { n });
	}
}

export class ValioString extends Arrayish<string, string> {
	inputName = "string";
	outputName = this.inputName;

	static typeCheck(v: any): v is string {
		return typeof v === "string";
	}

	inputTypeCheck(v: any) {
		return ValioString.typeCheck(v);
	}
	outputTypeCheck(v: any) {
		return ValioString.typeCheck(v);
	}

	regex(re: RegExp) {
		return this.refine((v) => !!v.match(re), "regex", { regex: re.source });
	}
}
export function string(): ValioString {
	return new ValioString();
}

export type Lit = string | number | bigint | boolean | null | undefined;

export class ValioLiteral<T extends Lit> extends Pipe<T, T> {
	literal: T;

	constructor(literal: T) {
		super();
		this.literal = literal;
	}

	typeCheck(v: any): v is T {
		return v === this.literal;
	}

	get inputName() {
		return `${this.literal}`;
	}
	inputTypeCheck(v: any): v is T {
		return this.typeCheck(v);
	}

	get outputName() {
		return this.inputName;
	}
	outputTypeCheck(v: any): v is T {
		return this.typeCheck(v);
	}
}
export function literal<T extends Lit>(literal: T) {
	return new ValioLiteral(literal);
}

export class ValioEnum<T extends Lit> extends Pipe<T, T> {
	literals: readonly T[];

	constructor(literals: readonly T[]) {
		super();
		this.literals = literals;
	}

	get inputName() {
		return `${this.literals.join(",")}`;
	}
	inputTypeCheck(v: any): v is T {
		return this.literals.includes(v);
	}

	get outputName() {
		return this.inputName;
	}
	outputTypeCheck(v: any): v is T {
		return this.inputTypeCheck(v);
	}
}
function enum_<T extends Lit>(literals: readonly T[]): ValioEnum<T> {
	return new ValioEnum(literals);
}
export { enum_ as enum };
