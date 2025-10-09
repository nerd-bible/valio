export type Error = {
	input: any;
	message: string;
	userdata?: any;
};
export type Errors = {
	[inputPath: string]: Error[];
};
export type Result<T> =
	| { success: true; output: T }
	| { success: false; errors: Errors };
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
export class Context {
	jsonPath: string[] = [];
	errors: Errors = {};
	/**
	 * It's possible to properly pass down this type through containers, but
	 * I cannot figure out how to do it.
	 * May you, dear reader, find more success.
	 */
	userdata?: any;

	addError(error: Error) {
		const key = "." + this.jsonPath.join(".");
		this.errors ??= {};
		this.errors[key] ??= [];
		// Probably should find a way to properly clone userdata.
		if (this.userdata) error.userdata = { ...this.userdata };
		this.errors[key].push(error);
	}
}

export interface Pipe<I = any, O = any> {
	/** @internal Just used for type inference. */
	input?: I;
	/** @internal Just used for type inference. */
	output?: O;
	/** For errors */
	ctx: Context;
	type: string;
	checks: Array<(data: O, ctx: Context) => string>;
	coerceFn?: (input: I, ctx: Context) => Result<O>;
	pipeFn?: Pipe<O, any>;

	/** Pipes don't trust their input */
	isOutput(data: any): data is O;
	/** Add check */
	refine(validator: (data: O) => string): this;
	/** Add post-decode pipe */
	pipe<O2>(to: Pipe<O, O2>): Pipe<I, O2>;
	/** Add pre-decode transform */
	coerce(fn: (input: I, ctx: Context) => Result<O>): this;
	/**
	 * Run the full pipeline:
	 * - coerce
	 * - type check
	 * - value checks
	 * - next pipe
	 */
	decode(input: I, ctx?: Context): Result<O>;
	/** Encode output `O` to input `I` */
	// encode(output: I): Result<O>;
}

export function pipe<I, O>(type: string): Pipe<I, O> {
	return {
		ctx: new Context(),
		checks: [],
		type,

		isOutput(input: any): input is O {
			return true;
		},

		refine(validator: (data: O, ctx: Context) => string) {
			return {
				...this,
				checks: [...this.checks, validator],
			};
		},

		pipe<O2>(to: Pipe<O, O2>): Pipe<I, O2> {
			return {
				...this,
				pipeFn: to,
			} as any;
		},

		coerce(fn: (input: I, ctx: Context) => Result<O>) {
			return {
				...this,
				coerceFn: fn,
			};
		},

		decode(input: I, ctx = new Context()): Result<O> {
			this.ctx = ctx;

			const coerced = this.coerceFn?.(input, this.ctx);
			if (coerced?.success == false)
				return { success: false, errors: this.ctx.errors! };
			const output = coerced?.success ? coerced.output : input;
			// incorrect type?
			if (!this.isOutput(output)) {
				this.ctx.addError({
					input,
					message: `not type ${this.type}`,
				});
				return { success: false, errors: this.ctx.errors! };
			}
			// fails any validator?
			let allPassed = true;
			for (const check of this.checks) {
				const message = check(output, this.ctx);
				if (message) {
					this.ctx.addError({ input: output, message });
					allPassed = false;
				}
			}
			if (!allPassed) return { success: false, errors: this.ctx.errors! };
			// another pipe to go to?
			if (this.pipeFn) return this.pipeFn.decode(output, this.ctx) as Result<O>;
			// good!
			return { success: true, output };
		},
		/** Encode output `O` to input `I` */
		// encode(output: I): Result<O>;
	};
}

export type Input<C extends Pipe<any, any>> = Required<C>["input"];
export type Output<C extends Pipe<any, any>> = Required<C>["output"];
