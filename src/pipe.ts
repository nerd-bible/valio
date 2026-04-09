import enFormat from "./locales/en.ts";

export type Error = { input: any; message: string };
export type Errors = { [inputPath: string]: Error[] };
export type Result<T> =
	| { success: true; output: T }
	| { success: false; errors: any };

interface Check<T> {
	valid(data: T, ctx: Context): boolean;
	name: string;
	props: Record<any, any>;
}

/** During encoding, decoding, or validation. */
export class Context {
	jsonPath: (string | number)[] = [];
	errors: Errors = {};

	errorFmt(name: string, props: Record<any, any>): any {
		return enFormat(name, props);
	}

	clone(): Context {
		const res = new Context();
		res.jsonPath = this.jsonPath.slice();
		res.errors = { ...this.errors };
		return res;
	}

	pushError(error: Error) {
		const key = `.${this.jsonPath.join(".")}`;
		this.errors[key] ??= [];
		this.errors[key].push(error);
	}

	pushErrorFmt(name: string, input: any, props: Record<any, any>) {
		const message = this.errorFmt(name, props);
		this.pushError({ input, message });
	}

	run<I>(
		input: any,
		name: () => string,
		typeCheck: (v: any) => v is I,
		checks?: Check<I>[],
	): Result<I> {
		if (!typeCheck(input)) {
			this.pushErrorFmt("type", input, { expected: name() });
			return { success: false, errors: this.errors };
		}
		let success = true;
		for (const c of checks ?? []) {
			if (!c.valid(input, this)) {
				this.pushErrorFmt(c.name, input, c.props);
				success = false;
			}
		}
		if (!success) return { success, errors: this.errors };
		return { success, output: input };
	}
}

export function cloneObject(obj: any) {
	const res =
		Object.getPrototypeOf(obj) == Object.prototype ? {} : Object.create(obj);
	for (const p in obj) {
		const v = obj[p];
		if (Array.isArray(v)) res[p] = v.slice();
		else if (v && v.clone) res[p] = v.clone();
		else if (v && typeof v === "object") res[p] = cloneObject(v);
		else res[p] = v;
	}
	return res;
}

export abstract class Pipe<I = any, O = any> {
	pipes: Pipe<any, any>[] = [];
	registry: Record<PropertyKey, any> = {};

	abstract inputName: string;
	abstract inputTypeCheck(v: any): v is I;
	/** Checks to run after type check */
	inputChecks?: Check<I>[];
	inputTransform?(v: I, ctx: Context): Result<O>;

	abstract outputName: string;
	abstract outputTypeCheck(v: any): v is O;
	/** Checks to run after type check */
	outputChecks?: Check<O>[];
	outputTransform?(v: O, ctx: Context): Result<I>;

	clone(): this {
		return cloneObject(this);
	}

	refine(
		valid: (data: O, ctx: Context) => boolean,
		name: string,
		props: Record<any, any> = {},
	) {
		const res = this.clone();
		res.outputChecks ??= [];
		res.outputChecks.push({ valid, name, props });
		return res;
	}

	pipe<I2 extends O, O2>(pipe: Pipe<I2, O2>): Pipe<I, O2> {
		const res: Pipe<any, any> = this.clone();
		res.pipes.push(pipe);
		return res;
	}

	decodeAny(input: any, ctx = new Context()): Result<O> {
		// 1. Verify input
		let res: Result<any> = ctx.run(
			input,
			() => this.inputName,
			this.inputTypeCheck.bind(this),
			this.inputChecks,
		);
		if (!res.success) return res;
		// 2. Transform input to output
		if (this.inputTransform) {
			res = this.inputTransform(res.output, ctx);
			if (!res.success) return res;
		}
		// 3. Verify output
		res = ctx.run(
			res.output,
			() => this.outputName,
			this.outputTypeCheck.bind(this),
			this.outputChecks,
		);
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
		res = ctx.run(
			res.output,
			() => this.outputName,
			this.outputTypeCheck.bind(this),
			this.outputChecks,
		);
		if (!res.success) return res;
		// 3. Transform output to input
		if (this.outputTransform) {
			res = this.outputTransform(res.output, ctx);
			if (!res.success) return res;
		}
		// 4. Verify input
		return ctx.run(
			res.output,
			() => this.inputName,
			this.inputTypeCheck.bind(this),
			this.inputChecks,
		);
	}
	encode(output: O, ctx = new Context()): Result<I> {
		return this.encodeAny(output, ctx);
	}

	register(key: PropertyKey, value: any): Pipe<I, O> {
		const res = this.clone();
		res.registry[key] = value;
		return res;
	}
}

export type Input<T extends Pipe> = Parameters<T["decode"]>[0];
export type Output<T extends Pipe> = Parameters<T["encode"]>[0];
