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
		isType: (data: any) => data is T,
		type: string,
		value: any,
	): value is T {
		if (!isType(value)) {
			this.addError({ input: value, message: `not type ${type}` });
			return false;
		}
		return true;
	}
}

export interface Codec<I, O> {
	decode?: (input: I, ctx: Context) => Result<O> | undefined;
	encode?: (output: O, ctx: Context) => Result<I>;
}

/** Shallow copied so don't use members that are container types. */
export interface Pipe<I = any, O = any> {
	/** @internal Just used for type inference. */
	_input?: I;
	/** @internal Just used for type inference. */
	_output?: O;

	/** For error messages and reflection */
	inputType: string;
	outputType: string;
	/** For validation */
	checks: Array<(data: O, ctx: Context) => string>;
	/** Next pipeline to run. */
	pipes: Array<Pipe<any, any>>;

	isInput(data: any): data is I;
	isOutput(data: any): data is O;
	/** Add a check */
	refine(validator: (data: O) => string): this;
	/** Add next runner */
	pipe<O2>(to: Pipe<O, O2>): Pipe<I, O2>;
	/**
	 * Run:
	 * - type check
	 * - value checks
	 * - next pipe
	 */
	decode(input: I, ctx?: Context): Result<O>;
	/**
	 * Run:
	 * - type check
	 * - value checks
	 * - previous pipe
	 * */
	encode(output: O, ctx?: Context): Result<I>;
}

function validate<T>(
	checks: Array<(data: T, ctx: Context) => string>,
	ctx: Context,
	output: any,
): output is T {
	let res = true;
	for (const check of checks) {
		const message = check(output, ctx);
		if (message) {
			ctx.addError({ input: output, message });
			res = false;
		}
	}
	return res;
}

export function pipe<I = any, O = any>(
	inputType: string,
	outputType: string,
): Pipe<I, O> {
	return {
		checks: [],
		pipes: [],
		inputType,
		outputType,

		isInput: (input: any): input is I => true,
		isOutput: (output: any): output is O => true,

		refine(validator: (data: O, ctx: Context) => string) {
			return {
				...this,
				checks: this.checks.concat(validator),
			};
		},

		pipe<O2>(pipe: Pipe<O, O2>): Pipe<I, O2> {
			return {
				...this,
				pipes: this.pipes.concat(pipe),
			} as any;
		},

		decode(input: I, ctx = new Context()): Result<O> {
			if (
				!ctx.validateType(this.isOutput, this.outputType, input) ||
				!validate(this.checks, ctx, input)
			)
				return { success: false, errors: ctx.errors };
			let res: Result<any> = { success: true, output: input };
			for (const p of this.pipes) {
				res = p.decode(res.output, ctx);
				if (!res.success) return res;
			}
			return res;
		},

		encode(output: O, ctx = new Context()): Result<I> {
			if (
				!ctx.validateType(this.isInput, this.inputType, output) ||
				!validate(this.checks, ctx, output)
			)
				return { success: false, errors: ctx.errors };
			let res: Result<any> = { success: true, output };
			for (const p of this.pipes) {
				res = p.encode(res.output, ctx);
				if (!res.success) return res;
			}
			return res;
		},
	};
}

export type Input<C extends Pipe> = Required<C>["_input"];
export type Output<C extends Pipe> = Required<C>["_output"];
