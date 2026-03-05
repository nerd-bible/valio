import type { Input, Output, Result } from "./pipe.ts";
import { Context, HalfPipe, Pipe } from "./pipe.ts";
import * as p from "./primitives.ts";

class ValioArray<T> extends p.Arrayish<any[], T[]> {
	element: Pipe<any, T>;

	static typeCheck(v: any): v is any[] {
		return Array.isArray(v);
	}

	constructor(element: Pipe<any, T>) {
		super(
			new HalfPipe(
				"array",
				ValioArray.typeCheck,
				function parseAnyArr(input: any[], ctx: Context): Result<T[]> {
					const output = new Array<T>(input.length);
					let success = true;

					const length = ctx.jsonPath.length;
					for (let i = 0; i < input.length; i++) {
						ctx.jsonPath[length] = i.toString();
						const decoded = element.decode(input[i], ctx);
						if (decoded.success) output[i] = decoded.output;
						else success = false;
					}
					ctx.jsonPath.length = length;

					if (!success) return { success, errors: ctx.errors };
					return { success, output };
				},
			),
			new HalfPipe(
				`array<${element.o.name}>`,
				function isArrT(v: any): v is T[] {
					if (!ValioArray.typeCheck(v)) return false;
					for (const e of v) if (!element.o.typeCheck(e)) return false;
					return true;
				},
			),
		);
		this.element = element;
	}
}
export function array<T>(element: Pipe<any, T>): ValioArray<T> {
	return new ValioArray(element);
}

class ValioRecord<K extends PropertyKey, V> extends Pipe<
	Record<any, any>,
	Record<K, V>
> {
	keyPipe: Pipe<any, K>;
	valPipe: Pipe<any, V>;

	static typeCheck(v: any): v is Record<any, any> {
		return Object.prototype.toString.call(v) === "[object Object]";
	}

	constructor(keyPipe: Pipe<any, K>, valPipe: Pipe<any, V>) {
		super(
			new HalfPipe(
				"object",
				ValioRecord.typeCheck,
				function anyToRecordKV(
					input: Record<any, any>,
					ctx: Context,
				): Result<Record<K, V>> {
					const output = {} as Record<K, V>;

					let success = true;
					const length = ctx.jsonPath.length;
					for (const key in input) {
						ctx.jsonPath[length] = key;
						const decodedKey = keyPipe.decode(key, ctx);
						if (decodedKey.success) {
							const decodedVal = valPipe.decode((input as any)[key], ctx);
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
				},
			),
			new HalfPipe(
				`record<${keyPipe.o.name},${valPipe.o.name}>`,
				function recordCheckV(v): v is Record<K, V> {
					if (!ValioRecord.typeCheck(v)) return false;
					for (const k in v) {
						// Keys will always be strings.
						// if (!keyPipe.o.typeCheck(k)) return false;
						if (!valPipe.o.typeCheck(v[k])) return false;
					}
					return true;
				},
			),
		);
		this.keyPipe = keyPipe;
		this.valPipe = valPipe;
	}
}
export function record<K extends PropertyKey, V>(
	keyPipe: Pipe<any, K>,
	valPipe: Pipe<any, V>,
): ValioRecord<K, V> {
	return new ValioRecord(keyPipe, valPipe);
}

class Union<T extends Readonly<Pipe[]>> extends Pipe<
	Output<T[number]>,
	Output<T[number]>
> {
	options: T;

	constructor(options: T) {
		const name = options.map((o) => o.o.name).join("|");
		type O = Output<T[number]>;
		super(
			new HalfPipe(
				name,
				function isUnionType(v: any): v is O {
					for (const f of options) if (f.i.typeCheck(v)) return true;
					return false;
				},
				(data: O, ctx: Context): Result<O> => {
					// Throw away errors since we expect them.
					const newCtx = new Context();
					newCtx.pushErrorFmt = () => {};
					newCtx.pushError = () => {};
					for (const f of options) {
						const decoded = f.decode(data, newCtx);
						if (decoded.success) return decoded;
					}

					// Sad path -- do again with real ctx to gather errors.
					for (const f of options) f.decode(data, ctx);
					return { success: false, errors: ctx.errors };
				},
			),
			new HalfPipe(name, function isUnionType2(v: any): v is O {
				for (const f of options) if (f.o.typeCheck(v)) return true;
				return false;
			}),
		);
		this.options = options;
	}
}
export function union<T extends Readonly<Pipe[]>>(options: T): Union<T> {
	return new Union(options);
}

type ObjectOutput<Shape extends Record<string, Pipe<any, any>>> = {
	[K in keyof Shape]: Output<Shape[K]>;
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
		super(
			new HalfPipe(
				"object",
				ValioObject.typeCheck,
				(data, ctx) => this.transformInput(data, ctx),
			),
			new HalfPipe(
				`{${Object.entries(shape)
					.map(([k, v]) => `${k}: ${v.o.name}`)
					.join(",")}}`,
				(v) => this.typeCheckOutput(v),
			),
		);

		this.shape = shape;
		this.isLoose = isLoose;
	}

	clone(): this {
		return new ValioObject(this.shape, this.isLoose) as any;
	}

	protected transformInput(
		data: object,
		ctx: Context,
	): Result<ObjectOutput<Shape>> {
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

	protected typeCheckOutput(v: any): v is ObjectOutput<Shape> {
		if (!ValioObject.typeCheck(v)) return false;
		for (const s in this.shape)
			if (!this.shape[s]!.o.typeCheck(v[s])) return false;
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
		mask: M,
	): ValioObject<{
		[k in keyof Shape]: k extends keyof M
			? Pipe<Input<Shape[k]>, Output<Shape[k]> | undefined>
			: Shape[k];
	}> {
		const next = this.clone();
		for (const k in next.shape) {
			if (mask[k]) {
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
