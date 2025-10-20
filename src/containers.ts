import { Check, Context, Pipe } from "./pipe";
import type { Input, Output, Result } from "./pipe";
import * as p from "./primitives";

class ValioArray<T> extends Pipe<any[], T[]> {
	constructor(public element: Pipe<any, T>) {
		super(
			new Check(
				"array",
				(v: any): v is any[] => Array.isArray(v),
				(input: any[], ctx: Context): Result<T[]> => {
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
			new Check(`array<${element.o.name}>`, (v: any): v is T[] => {
				if (!Array.isArray(v)) return false;
				for (const e of v) if (!element.o.typeCheck(e)) return false;
				return true;
			}),
		);
	}
}
export function array<T>(element: Pipe<any, T>): ValioArray<T> {
	return new ValioArray(element);
}

class ValioRecord<K extends keyof any, V> extends Pipe<
	Record<any, any>,
	Record<K, V>
> {
	constructor(
		public keyPipe: Pipe<any, K>,
		public valPipe: Pipe<any, V>,
	) {
		super(
			new Check(
				"object",
				(v): v is Record<any, any> =>
					Object.prototype.toString.call(v) == "[object Object]",
				(input: object, ctx: Context): Result<globalThis.Record<K, V>> => {
					const output = {} as globalThis.Record<K, V>;

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
			new Check(
				`record<${keyPipe.o.name},${valPipe.o.name}>`,
				(v): v is globalThis.Record<K, V> => {
					if (Object.prototype.toString.call(v) != "[object Object]")
						return false;
					for (const k in v) {
						// Keys will always be strings.
						// if (!keyPipe.o.typeCheck(k)) return false;
						if (!valPipe.o.typeCheck(v[k])) return false;
					}
					return true;
				},
			),
		);
	}
}
export function record<K extends keyof any, V>(
	keyPipe: Pipe<any, K>,
	valPipe: Pipe<any, V>,
): ValioRecord<K, V> {
	return new ValioRecord(keyPipe, valPipe);
}

class Union<T extends Readonly<Pipe[]>> extends Pipe<
	Output<T[number]>,
	Output<T[number]>
> {
	constructor(public options: T) {
		const name = options.map((o) => o.o.name).join("|");
		type O = Output<T[number]>;
		super(
			new Check(
				name,
				(v: any): v is O => {
					for (const f of options) if (f.i.typeCheck(v)) return true;
					return false;
				},
				(data: O, ctx: Context): Result<O> => {
					const newCtx = ctx.clone();
					for (const s in options) {
						const decoded = options[s]!.decode(data, newCtx);
						if (decoded.success) return decoded;
					}

					Object.assign(ctx.errors, newCtx.errors);
					return { success: false, errors: ctx.errors };
				},
			),
			new Check(name, (v: any): v is O => {
				for (const f of options) if (f.o.typeCheck(v)) return true;
				return false;
			}),
		);
	}
}
export function union<T extends Readonly<Pipe[]>>(options: T): Union<T> {
	return new Union(options);
}

type ObjectOutput<
	Shape extends Record<string, Pipe<any, any>>,
	RecordShape,
> = RecordShape extends ValioRecord<any, any>
	? { [K in keyof Shape]: Output<Shape[K]> } & Output<RecordShape>
	: { [K in keyof Shape]: Output<Shape[K]> };
type Mask<Keys extends keyof any> = { [K in Keys]?: true };
type Identity<T> = T;
type Flatten<T> = Identity<{ [k in keyof T]: T[k] }>;

class ValioObject<
	Shape extends Record<any, Pipe<any, any>>,
	RShape extends ValioRecord<any, any> | undefined = undefined,
> extends Pipe<object, ObjectOutput<Shape, RShape>> {
	constructor(
		public shape: Shape,
		public recordShape?: RShape,
	) {
		const i = new Check(
			"object",
			(v): v is object =>
				Object.prototype.toString.call(v) == "[object Object]",
			(data: object, ctx: Context): Result<ObjectOutput<Shape, RShape>> => {
				const output: globalThis.Record<keyof any, any> = {};
				let success = true;

				const length = ctx.jsonPath.length;
				// Always expect the shape since that's what typescript does.
				for (const p in shape) {
					ctx.jsonPath[length] = p;
					const decoded = shape[p]!.decode((data as any)[p], ctx);
					if (decoded.success) output[p] = decoded.output;
					else success = false;
				}

				if (recordShape) {
					for (const p in data) {
						if (p in shape) continue;

						ctx.jsonPath[length] = p;
						const v = (data as any)[p];
						const decodedKey = recordShape.keyPipe.decode(p, ctx);
						if (decodedKey.success) {
							const decodedVal = recordShape.valPipe.decode(v, ctx);
							if (decodedVal.success) {
								output[decodedKey.output] = decodedVal.output;
							} else {
								success = false;
							}
						} else {
							success = false;
						}
					}
				}
				ctx.jsonPath.length = length;

				if (!success) return { success, errors: ctx.errors };
				return { success, output: output as ObjectOutput<Shape, RShape> };
			},
		);
		const o = new Check(
			`{${Object.entries(shape)
				.map(([k, v]) => `${k}: ${v.o.name}`)
				.join(",")}}`,
			(v): v is ObjectOutput<Shape, RShape> => {
				if (Object.prototype.toString.call(v) != "[object Object]")
					return false;
				for (const s in shape) if (!shape[s]!.o.typeCheck(v[s])) return false;
				return true;
			},
		);
		super(i, o);
	}

	pick<M extends Mask<keyof Shape>>(
		mask: M,
	): ValioObject<Flatten<Pick<Shape, Extract<keyof Shape, keyof M>>>, RShape> {
		const next = this.clone();
		for (const k in next.shape) {
			if (!mask[k]) delete next.shape[k];
		}
		return next as any;
	}

	omit<M extends Mask<keyof Shape>>(
		mask: M,
	): ValioObject<Flatten<Omit<Shape, Extract<keyof Shape, keyof M>>>, RShape> {
		const next = this.clone();
		for (const k in next.shape) {
			if (mask[k]) delete next.shape[k];
		}
		return next as any;
	}

	partial<M extends Mask<keyof Shape>>(
		mask: M,
	): ValioObject<
		{
			[k in keyof Shape]: k extends keyof M
				? Pipe<Input<Shape[k]>, Output<Shape[k]> | undefined>
				: Shape[k];
		},
		RShape
	> {
		const next = this.clone();
		for (const k in next.shape) {
			if (mask[k]) {
				// @ts-ignore
				next.shape[k] = union([next.shape[k], p.undefined()]);
			}
		}
		return next as any;
	}

	record<K extends keyof any, V>(
		k: Pipe<any, K>,
		v: Pipe<any, V>,
	): ValioObject<Shape, ValioRecord<K, V>> {
		const res = this.clone() as any;
		res.recordShape = record(k, v);
		return res;
	}
}
export function object<
	Shape extends globalThis.Record<any, Pipe<any, any>>,
	RShape extends ValioRecord<any, any> | undefined = undefined,
>(shape: Shape, recordShape?: RShape): ValioObject<Shape, RShape> {
	return new ValioObject(shape, recordShape);
}
