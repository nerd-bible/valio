export type Errors = {
	[jsonPath: string]: string[];
};
export type Result<T> =
	| { output: T }
	| { errors: Errors }
	| { output: T; errors: Errors };
export type Type =
	| "string"
	| "number"
	| "array"
	| "object"
	| "boolean"
	| "union"
	| "literal"
	| "enum"
	| "record"
	| "undefined"
	| "null";
/** During encoding, decoding, or validation. */
export type Context = {
	jsonPath?: string[];
	errors?: Errors;
	/**
	 * It's possible to properly pass down container type's to this, but
	 * I cannot figure out how to do it.
	 * May you, dear reader, find more success.
	 */
	userdata?: any;
};

export function addError(msg: string, ctx: Context) {
	if (msg) {
		ctx.jsonPath ??= [];
		const key = "." + ctx.jsonPath.join(".");
		ctx.errors ??= {};
		ctx.errors[key] ??= [];
		ctx.errors[key].push(msg);
	}
}

export abstract class Pipe<I = unknown, O = unknown> {
	checks: ((data: O, ctx: Context) => string)[] = [];
	input?: I;
	output?: O;
	abstract type: Type;

	abstract isT(data: unknown, ctx: Context): data is O;

	protected addError(msg: string, ctx: Context) {
		addError(msg, ctx);
	}

	/** Assumes (and does not check) that data is of type O */
	check(data: O, ctx: Context = {}): boolean {
		let allPassed = true;
		for (const check of this.checks) {
			const msg = check(data, ctx);
			this.addError(msg, ctx);
			if (msg) allPassed = false;
		}
		return allPassed;
	}

	decode(data: I, ctx: Context = {}): Result<O> {
		// incorrect type?
		if (!this.isT(data, ctx)) {
			this.addError(`not a ${this.type}`, ctx);
			return { errors: ctx.errors! };
		}
		// fails any validator?
		if (!this.check(data, ctx)) return { output: data, errors: ctx.errors };
		// is good!
		return { output: data };
	}

	refine(validator: (data: O, ctx: Context) => string) {
		this.checks.push(validator);
		return this;
	}
}

export type Input<C extends Pipe<any, any>> = Required<C>["input"];
export type Output<C extends Pipe<any, any>> = Required<C>["output"];
