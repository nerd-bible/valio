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
export type Check<I, O = never> = {
	/** The type name */
	name: string;
	/** The first check to run */
	typeCheck(v: any): v is I;
	/** The second check to run */
	checks?: Array<(data: I, ctx: Context) => string>;
	/** Optional transform for pipe to run at end. Useful for containers */
	transform?(v: I, ctx: Context): Result<O>;
};

function cloneCheck<I, O>(c: Check<I, O>): Check<I, O> {
	return { ...c, checks: c.checks ? [...c.checks] : undefined };
}

/** During encoding, decoding, or validation. */
export class Context {
	jsonPath: string[] = [];
	errors: Errors = {};

	clone(): Context {
		const res = new Context();
		res.jsonPath = [...this.jsonPath];
		res.errors = { ...this.errors };
		return res;
	}

	addError(error: Error) {
		const key = "." + this.jsonPath.join(".");
		this.errors ??= {};
		this.errors[key] ??= [];
		this.errors[key].push(error);
	}

	runCheck<I, O>(value: any, check: Check<I, O>): Result<I> {
		if (!check.typeCheck(value)) {
			this.addError({ input: value, message: `not type ${check.name}` });
			return { success: false, errors: this.errors };
		}
		let success = true;
		for (const c of check.checks ?? []) {
			const message = c(value, this);
			if (message) {
				this.addError({ input: value, message });
				success = false;
			}
		}
		if (!success) return { success, errors: this.errors };
		return { success, output: value };
	}
}

export interface Pipe<I = any, O = any> {
	i: Check<I, O>;
	o: Check<O, I>;

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

	decode(input: I, ctx?: Context): Result<O>;
	encode(output: O, ctx?: Context): Result<I>;
}

export function pipe<I = any, O = any>(
	input: Check<I, O>,
	output: Check<O, I>,
): Pipe<I, O> {
	return {
		i: input,
		o: output,
		pipes: [],

		clone(): Pipe<I, O> {
			return {
				...this,
				i: cloneCheck(this.i),
				o: cloneCheck(this.o),
				pipes: [...this.pipes],
			};
		},

		refine(validator: (data: O, ctx: Context) => string): Pipe<I, O> {
			const res = this.clone();
			res.o.checks ??= [];
			res.o.checks.push(validator);
			return res;
		},

		pipe<O2>(pipe: Pipe<O, O2>): Pipe<I, O2> {
			const res: Pipe<any, any> = this.clone();
			res.pipes.push(pipe);
			return res;
		},

		decodeAny(input: any, ctx = new Context()): Result<O> {
			// 1. Verify input
			let res: Result<any> = ctx.runCheck(input, this.i);
			if (!res.success) return res;
			// 2. Transform input to output
			if (this.i.transform) {
				res = this.i.transform(res.output, ctx);
				if (!res.success) return res;
			}
			// 3. Verify output
			res = ctx.runCheck(res.output, this.o);
			if (!res.success) return res;
			// 4. Next
			for (const p of this.pipes) {
				res = p.decode(res.output, ctx);
				if (!res.success) return res;
			}
			return res;
		},
		decode(input: I, ctx = new Context()): Result<O> {
			return this.decodeAny(input, ctx);
		},

		encodeAny(output: any, ctx = new Context()): Result<I> {
			// 1. Next
			let res: Result<any> = { success: true, output };
			for (let i = this.pipes.length - 1; i >= 0; i--) {
				res = this.pipes[i]!.encodeAny(res.output, ctx);
				if (!res.success) return res;
			}
			// 2. Verify output
			res = ctx.runCheck(res.output, this.o);
			if (!res.success) return res;
			// 3. Transform output to input
			if (this.o.transform) {
				res = this.o.transform(res.output, ctx);
				if (!res.success) return res;
			}
			// 4. Verify input
			return ctx.runCheck(res.output, this.i);
		},
		encode(output: O, ctx = new Context()): Result<I> {
			return this.encodeAny(output, ctx);
		},
	};
}

export type Input<T extends Pipe> = Parameters<T["decode"]>[0];
export type Output<T extends Pipe> = Parameters<T["encode"]>[0];
