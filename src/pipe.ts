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
type Check<T> = (data: T, ctx: Context) => string;

/** Extend this to change error reporting. */
export class Context {
	constructor(
		public jsonPath: string[] = [],
		public errors: Errors = {},
	) {}

	clone(): Context {
		return new Context([...this.jsonPath], { ...this.errors });
	}

	addError(error: Error) {
		const key = "." + this.jsonPath.join(".");
		this.errors[key] ??= [];
		this.errors[key].push(error);
	}
}

export class Task<I = any, O = any> {
	constructor(
		public name: string,
		public typeCheck: (v: any) => v is I = (v: any): v is I => true,
		public transform: (v: I, ctx: Context) => Result<O> = (v) => ({
			success: true,
			output: v as any,
		}),
		public checks: Check<I>[] = [],
	) {}

	clone(): Task<I, O> {
		return new Task(this.name, this.typeCheck, this.transform, this.checks);
	}

	run(value: any, ctx: Context): Result<I> {
		if (!this.typeCheck(value)) {
			ctx.addError({ input: value, message: `not type ${this.name}` });
			return { success: false, errors: ctx.errors };
		}

		let success = true;
		for (const c of this.checks) {
			const message = c(value, ctx);
			if (message) {
				ctx.addError({ input: value, message });
				success = false;
			}
		}
		if (!success) return { success, errors: ctx.errors };

		return { success, output: value };
	}
}

export class Pipe<I = any, O = any> {
	constructor(
		public i: Task<I, O>,
		public o: Task<O, I>,
		public pipes: Pipe<any, any>[] = [],
	) {}

	clone(): this {
		return Object.assign(
			Object.create(Object.getPrototypeOf(this)),
			new Pipe(this.i.clone(), this.o.clone(), [...this.pipes]),
		);
	}

	refine(validator: Check<O>): this {
		const res = this.clone();
		res.o.checks.push(validator);
		return res;
	}

	decodeAny(input: any, ctx = new Context()): Result<O> {
		const first = this.i.run(input, ctx);
		if (!first.success) return first;

		const second = this.i.transform(first.output, ctx);
		if (!second.success) return second;

		let third = this.o.run(second.output, ctx);
		if (!third.success) return third;

		for (const p of this.pipes) {
			third = p.decodeAny(third.output, ctx);
			if (!third.success) return third;
		}

		return third;
	}
	decode(input: I, ctx = new Context()): Result<O> {
		return this.decodeAny(input, ctx);
	}

	encodeAny(output: any, ctx = new Context()): Result<I> {
		let first: Result<any> = { success: true, output };
		for (let i = this.pipes.length - 1; i >= 0; i--) {
			first = this.pipes[i]!.encodeAny(output, ctx);
		}
		if (!first.success) return first;

		const second = this.o.run(first.output, ctx);
		if (!second.success) return second;

		const third = this.o.transform(first.output, ctx);
		if (!third.success) return third;

		return this.i.run(third.output, ctx);
	}
	encode(output: O, ctx = new Context()): Result<I> {
		return this.encodeAny(output, ctx);
	}

	pipe<T>(pipe: Pipe<O, T>): Pipe<I, T> {
		const res = this.clone();
		res.pipes.push(pipe);
		return res as any;
	}
}

export type Input<T extends Pipe> = Parameters<T["decode"]>[0];
export type Output<T extends Pipe> = Parameters<T["encode"]>[0];
