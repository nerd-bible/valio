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

	validateType<T>(
		type: string,
		value: any,
		isType?: (data: any) => data is T,
	): value is T {
		if (isType && !isType(value)) {
			this.addError({ input: value, message: `not type ${type}` });
			return false;
		}
		return true;
	}

	validate<T>(
		checks: Array<(data: T, ctx: Context) => string>,
		output: any,
	): output is T {
		let res = true;
		for (const check of checks) {
			const message = check(output, this);
			if (message) {
				this.addError({ input: output, message });
				res = false;
			}
		}
		return res;
	}
}

export interface Codec<I, O> {
	decode?: (input: I, ctx: Context) => Result<O> | undefined;
	encode?: (output: O, ctx: Context) => Result<I>;
}

export type Param<A, B> = {
	name: string;
	typeCheck?(v: any): v is A;
	transform?(v: A, ctx: Context): Result<B>;
};

export interface Pipe<I = any, O = any> {
	i: Param<I, O>,
	o: Param<O, I>,

	/** For validation */
	checks: Array<(data: O, ctx: Context) => string>;
	/** Next pipeline to run. */
	pipes: Array<Pipe<any, any>>;

	/** For chaining in refine and pipe */
	clone(): this;

	/** Add a check */
	refine(validator: (data: O) => string): this;
	/** Add next runner */
	pipe<O2>(to: Pipe<O, O2>): Pipe<I, O2>;

	decodeAny(input: any, ctx?: Context): Result<O>;
	encodeAny(output: any, ctx?: Context): Result<I>;
	// For type checking
	decode(input: I, ctx?: Context): Result<O>;
	encode(output: O, ctx?: Context): Result<I>;
}

export function pipe<I = any, O = any>(
	inputParam: Param<I, O>,
	outputParam: Param<O, I>,
): Pipe<I, O> {
	return {
		checks: [],
		pipes: [],

		i: inputParam,
		o: outputParam,

		clone() {
			return {
				...this,
				i: { ...this.i },
				o: { ...this.o },
			};
		},

		refine(validator: (data: O, ctx: Context) => string) {
			return Object.assign(this.clone(), {
				checks: this.checks.concat(validator),
			});
		},

		pipe<O2>(pipe: Pipe<O, O2>): Pipe<I, O2> {
			return Object.assign(this.clone(), {
				pipes: this.pipes.concat(pipe),
			}) as any;
		},

		decodeAny(input: any, ctx = new Context()): Result<O> {
			if (!ctx.validateType(this.i.name, input, this.i.typeCheck))
				return { success: false, errors: ctx.errors };

			let res = this.i.transform?.(input, ctx) ?? {
				success: true,
				output: input,
			};
			if (
				!res.success ||
				!ctx.validateType(this.o.name, res.output, this.o.typeCheck) ||
				!ctx.validate(this.checks, res.output)
			)
				return { success: false, errors: ctx.errors };

			for (const p of this.pipes) {
				res = p.decode(res.output, ctx);
				if (!res.success) return res;
			}
			return res as { success: true; output: O };
		},
		decode(input: I, ctx = new Context()): Result<O> {
			return this.decodeAny(input, ctx);
		},

		encodeAny(output: any, ctx = new Context()): Result<I> {
			if (!ctx.validateType(this.o.name, output, this.o.typeCheck) || !ctx.validate(this.checks, output))
				return { success: false, errors: ctx.errors };

			let res = this.o.transform?.(output, ctx) ?? {
				success: true,
				output,
			};
			if (!res.success)
				return { success: false, errors: ctx.errors };

			for (const p of this.pipes) {
				res = p.encode(res.output, ctx);
				if (!res.success) return res;
			}
			return res as { success: true; output: I };
		},
		encode(output: O, ctx = new Context()): Result<I> {
			return this.encodeAny(output, ctx);
		},
	};
}

export type Input<T extends Pipe> = Parameters<T["decode"]>[0];
export type Output<T extends Pipe> = Parameters<T["encode"]>[0];
