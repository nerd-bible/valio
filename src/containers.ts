import type { Input, Output, Result } from "./pipe.ts";
import { Context, Pipe } from "./pipe.ts";
import * as p from "./primitives.ts";

export class ValioArray<T> extends p.Arrayish<any[], T[]> {
	element: Pipe<any, T>;

	constructor(element: Pipe<any, T>) {
		super();
		this.element = element;
	}

	get inputName() {
		return "array";
	}

	static typeCheck(v: any): v is any[] {
		return Array.isArray(v);
	}

	inputTypeCheck(v: any): v is any[] {
		return ValioArray.typeCheck(v);
	}

	inputTransform(input: any[], ctx: Context): Result<T[]> {
		const output = new Array<T>(input.length);
		let success = true;

		const length = ctx.jsonPath.length;
		for (let i = 0; i < input.length; i++) {
			ctx.jsonPath[length] = i.toString();
			const decoded = this.element.decode(input[i], ctx);
			if (decoded.success) output[i] = decoded.output;
			else success = false;
		}
		ctx.jsonPath.length = length;

		if (!success) return { success, errors: ctx.errors };
		return { success, output };
	}

	get outputName() {
		return `array<${this.element.outputName}>`;
	}

	outputTypeCheck(v: any): v is T[] {
		if (!ValioArray.typeCheck(v)) return false;
		for (const e of v) if (!this.element.outputTypeCheck(e)) return false;
		return true;
	}
}
export function array<T>(element: Pipe<any, T>): ValioArray<T> {
	return new ValioArray(element);
}

export class ValioRecord<K extends PropertyKey, V> extends Pipe<
	Record<any, any>,
	Record<K, V>
> {
	keyPipe: Pipe<any, K>;
	valPipe: Pipe<any, V>;

	constructor(keyPipe: Pipe<any, K>, valPipe: Pipe<any, V>) {
		super();
		this.keyPipe = keyPipe;
		this.valPipe = valPipe;
	}

	get inputName() {
		return "object";
	}

	static typeCheck(v: any): v is Record<any, any> {
		return v && typeof v === "object";
	}

	inputTypeCheck(v: any): v is Record<any, any> {
		return ValioRecord.typeCheck(v);
	}

	inputTransform(input: Record<any, any>, ctx: Context): Result<Record<K, V>> {
		const output = {} as Record<K, V>;

		let success = true;
		const length = ctx.jsonPath.length;
		for (const key in input) {
			ctx.jsonPath[length] = key;
			const decodedKey = this.keyPipe.decode(key, ctx);
			if (decodedKey.success) {
				const decodedVal = this.valPipe.decode((input as any)[key], ctx);
				if (decodedVal.success) {
					output[decodedKey.output] = decodedVal.output;
				} else {
					success = false;
				}
			} else {
				success = false;
			}
		}
		ctx.jsonPath.length = length;

		if (!success) return { success, errors: ctx.errors };
		return { success, output };
	}

	get outputName() {
		return `record<${this.keyPipe.inputName},${this.valPipe.outputName}>`;
	}

	outputTypeCheck(v: any): v is Record<K, V> {
		if (!ValioRecord.typeCheck(v)) return false;
		for (const k in v) {
			// Keys will always be strings.
			// if (!keyPipe.o.typeCheck(k)) return false;
			if (!this.valPipe.outputTypeCheck(v[k])) return false;
		}
		return true;
	}
}
export function record<K extends PropertyKey, V>(
	keyPipe: Pipe<any, K>,
	valPipe: Pipe<any, V>,
): ValioRecord<K, V> {
	return new ValioRecord(keyPipe, valPipe);
}

export class Union<T extends Readonly<Pipe[]>> extends Pipe<
	Output<T[number]>,
	Output<T[number]>
> {
	options: T;

	constructor(options: T) {
		super();
		this.options = options;
	}

	get inputName() {
		return this.options.map((o) => o.outputName).join("|");
	}

	inputTypeCheck(v: any): v is Output<T[number]> {
		for (const f of this.options) if (f.inputTypeCheck(v)) return true;
		return false;
	}

	inputTransform(
		data: Output<T[number]>,
		ctx: Context,
	): Result<Output<T[number]>> {
		// Throw away errors since we expect them.
		const newCtx = new Context();
		newCtx.pushErrorFmt = () => {};
		newCtx.pushError = () => {};
		for (const f of this.options) {
			const decoded = f.decode(data, newCtx);
			if (decoded.success) return decoded;
		}

		// Sad path -- do again with real ctx to gather errors.
		for (const f of this.options) f.decode(data, ctx);
		return { success: false, errors: ctx.errors };
	}

	get outputName() {
		return this.inputName;
	}

	outputTypeCheck(v: any): v is Output<T[number]> {
		for (const f of this.options) if (f.outputTypeCheck(v)) return true;
		return false;
	}
}
export function union<T extends Readonly<Pipe[]>>(options: T): Union<T> {
	return new Union(options);
}

// Undefined means you're fine with records being undefined. If you want the
// record explicitly, use `null` instead.
type ObjectOutput<Shape extends Record<string, Pipe<any, any>>> = {
	[K in keyof Shape as [undefined] extends [Output<Shape[K]>]
		? never
		: K]: Output<Shape[K]>;
} & {
	[K in keyof Shape as [undefined] extends [Output<Shape[K]>]
		? K
		: never]?: Output<Shape[K]>;
};
type Mask<Keys extends PropertyKey> = { [K in Keys]?: true };
type Identity<T> = T;
type Flatten<T> = Identity<{ [k in keyof T]: T[k] }>;
type Extend<A extends Record<any, any>, B extends Record<any, any>> = Flatten<
	// fast path when there is no keys overlap
	keyof A & keyof B extends never
		? A & B
		: {
				[K in keyof A as K extends keyof B ? never : K]: A[K];
			} & {
				[K in keyof B]: B[K];
			}
>;

export class ValioObject<
	Shape extends Record<any, Pipe<any, any>>,
> extends Pipe<Record<any, any>, ObjectOutput<Shape>> {
	shape: Shape;
	isLoose: boolean;

	static typeCheck(v: any): v is Record<any, any> {
		return typeof v === "object";
	}

	constructor(shape: Shape, isLoose: boolean) {
		super();
		this.shape = shape;
		this.isLoose = isLoose;
	}

	get inputName() {
		return "object";
	}

	get outputName() {
		return `{${Object.entries(this.shape)
			.map(([k, v]) => `${k}: ${v.outputName}`)
			.join(",")}}`;
	}

	inputTypeCheck(v: any): v is Record<any, any> {
		return ValioObject.typeCheck(v);
	}

	inputTransform(data: object, ctx: Context): Result<ObjectOutput<Shape>> {
		const output: Record<PropertyKey, any> = this.isLoose ? data : {};
		let success = true;

		const length = ctx.jsonPath.length;
		// Always expect the shape since that's what typescript does.
		for (const p in this.shape) {
			ctx.jsonPath[length] = p;
			const decoded = this.shape[p]!.decode((data as any)[p], ctx);
			if (decoded.success) output[p] = decoded.output;
			else {
				success = false;
				delete output[p];
			}
		}
		ctx.jsonPath.length = length;

		if (!success) return { success, errors: ctx.errors };
		return { success, output: output as ObjectOutput<Shape> };
	}

	outputTypeCheck(v: any): v is ObjectOutput<Shape> {
		if (!ValioObject.typeCheck(v)) return false;
		for (const s in this.shape)
			if (!this.shape[s]!.outputTypeCheck(v[s])) return false;
		return true;
	}

	pick<M extends Mask<keyof Shape>>(
		mask: M,
	): ValioObject<Flatten<Pick<Shape, Extract<keyof Shape, keyof M>>>> {
		const next = this.clone();
		for (const k in next.shape) {
			if (!mask[k]) delete next.shape[k];
		}
		return next as any;
	}

	omit<M extends Mask<keyof Shape>>(
		mask: M,
	): ValioObject<Flatten<Omit<Shape, Extract<keyof Shape, keyof M>>>> {
		const next = this.clone();
		for (const k in next.shape) {
			if (mask[k]) delete next.shape[k];
		}
		return next as any;
	}

	partial<M extends Mask<keyof Shape>>(
		mask?: M,
	): ValioObject<{
		[k in keyof Shape]: k extends keyof M
			? Pipe<Input<Shape[k]>, Output<Shape[k]> | undefined>
			: Shape[k];
	}> {
		const next = this.clone();
		for (const k in next.shape) {
			if (!mask || mask[k]) {
				// @ts-expect-error
				next.shape[k] = union([next.shape[k], p.undefined()]);
			}
		}
		return next as any;
	}

	extend<T extends Record<any, Pipe<any, any>>>(
		shape: T,
	): ValioObject<Extend<Shape, T>> {
		const next = this.clone();
		Object.assign(next.shape, shape);
		return next as any;
	}

	extendPartial<T extends Record<any, Pipe<any, any>>>(
		shape: T,
	): ValioObject<
		Extend<
			Shape,
			{ [k in keyof T]: Pipe<Input<T[k]>, Output<T[k]> | undefined> }
		>
	> {
		const next = this.clone();
		for (const k in shape) {
			// @ts-expect-error
			next.shape[k] = union([shape[k], p.undefined()]);
		}
		return next as any;
	}

	loose<T = any>(
		isLoose = true,
	): ValioObject<Shape & { [k: string]: Pipe<T, T> }> {
		const next = this.clone();
		next.isLoose = isLoose;
		return next as any;
	}
}
export function object<Shape extends Record<any, Pipe<any, any>>>(
	shape: Shape,
	loose = false,
): ValioObject<Shape> {
	return new ValioObject(shape, loose);
}
