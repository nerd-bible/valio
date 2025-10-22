export type Error = { input: any; message: string };
export type Errors = { [inputPath: string]: Error[] };
export type Result<T> =
	| { success: true; output: T }
	| { success: false; errors: Errors };

function clone<T>(obj: T): T {
	return Object.create(
		Object.getPrototypeOf(obj),
		Object.getOwnPropertyDescriptors(obj),
	);
}

type Check<T> = (data: T, ctx: Context) => string;

export class HalfPipe<I, O = never> {
	constructor(
		/** The type name */
		public name: string,
		/** The first check to run */
		public typeCheck: (v: any) => v is I,
		/** Optional transform for pipe to run at end. Useful for containers */
		public transform?: (v: I, ctx: Context) => Result<O>,
	) {}
	/** The second checks to run */
	checks: Array<Check<I>> = [];
	checksProps: Record<any, any> = {};

	clone(): this {
		const res = clone(this);
		res.checks = res.checks.slice();
		res.checksProps = { ...res.checksProps };
		return res;
	}
}

/** During encoding, decoding, or validation. */
export class Context {
	jsonPath: (string | number)[] = [];
	errors: Errors = {};

	clone(): Context {
		const res = clone(this);
		res.jsonPath = res.jsonPath.slice();
		res.errors = { ...res.errors };
		return res;
	}

	pushError(error: Error) {
		const key = "." + this.jsonPath.join(".");
		this.errors[key] ??= [];
		this.errors[key].push(error);
	}

	runCheck<I, O>(input: any, check: HalfPipe<I, O>): Result<I> {
		if (!check.typeCheck(input)) {
			this.pushError({ input, message: `not type ${check.name}` });
			return { success: false, errors: this.errors };
		}
		let success = true;
		for (const c of check.checks ?? []) {
			const message = c(input, this);
			if (message) {
				this.pushError({ input, message });
				success = false;
			}
		}
		if (!success) return { success, errors: this.errors };
		return { success, output: input };
	}
}

export class Pipe<I = any, O = any> {
	constructor(
		public i: HalfPipe<I, O>,
		public o: HalfPipe<O, I>,
	) {}

	pipes: Array<Pipe<any, any>> = [];

	clone(): this {
		const res = clone(this);
		res.i = res.i.clone();
		res.o = res.o.clone();
		res.pipes = res.pipes.slice();
		return res;
	}

	refine(check: Check<O>, props: Record<any, any> = {}): this {
		const res = this.clone();
		res.o.checks.push(check);
		Object.assign(res.o.checks, props);
		return res;
	}

	pipe<I2 extends O, O2>(pipe: Pipe<I2, O2>): Pipe<I, O2> {
		const res: Pipe<any, any> = this.clone();
		res.pipes.push(pipe);
		return res;
	}

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
	}
	decode(input: I, ctx = new Context()): Result<O> {
		return this.decodeAny(input, ctx);
	}

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
	}
	encode(output: O, ctx = new Context()): Result<I> {
		return this.encodeAny(output, ctx);
	}
}

export type Input<T extends Pipe> = Parameters<T["decode"]>[0];
export type Output<T extends Pipe> = Parameters<T["encode"]>[0];
