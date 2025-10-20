import {
	Context,
	pipe,
	type Input,
	type Output,
	type Pipe,
	type Result,
} from "./pipe";
import * as p from "./primitives";

export interface Array<T, I = any[]> extends Pipe<I, T[]> {}
export function array<T>(element: Pipe<any, T>): Array<T> {
	return pipe(
		{
			name: "array",
			typeCheck: (v: any): v is any[] => Array.isArray(v),
			transform(input: any[], ctx: Context): Result<T[]> {
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
		},
		{
			name: `array<${element.o.name}>`,
			typeCheck: (v: any): v is T[] => {
				if (!Array.isArray(v)) return false;
				for (const e of v) if (!element.o.typeCheck(e)) return false;
				return true;
			},
		},
	);
}

export interface Record<K extends keyof any, V, I = globalThis.Record<any, any>>
	extends Pipe<I, globalThis.Record<K, V>> {
	keyPipe: Pipe<any, K>;
	valPipe: Pipe<any, V>;
}
export function record<K extends keyof any, V>(
	keyPipe: Pipe<any, K>,
	valPipe: Pipe<any, V>,
): Record<K, V> {
	const res = pipe<globalThis.Record<any, any>, globalThis.Record<K, V>>(
		{
			name: "object",
			typeCheck: (v): v is Record<any, any> =>
				Object.prototype.toString.call(v) == "[object Object]",
			transform(input: object, ctx: Context): Result<globalThis.Record<K, V>> {
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
		},
		{
			name: `record<${keyPipe.o.name},${valPipe.o.name}>`,
			typeCheck: (v): v is globalThis.Record<K, V> => {
				if (Object.prototype.toString.call(v) != "[object Object]")
					return false;
				for (const k in v) {
					// Keys will always be strings.
					// if (!keyPipe.o.typeCheck(k)) return false;
					if (!valPipe.o.typeCheck(v[k])) return false;
				}
				return true;
			},
		},
	) as ReturnType<typeof record<K, V>>;
	res.keyPipe = keyPipe;
	res.valPipe = valPipe;
	return res;
}

export interface Union<T extends Readonly<Pipe[]>, I = Output<T[number]>>
	extends Pipe<I, Output<T[number]>> {
	options: T;
}
export function union<T extends Readonly<Pipe[]>>(options: T): Union<T> {
	type O = Output<T[number]>;
	const name = options.map((o) => o.o.name).join("|");
	const res = pipe<O, O>(
		{
			name,
			typeCheck(v: any): v is O {
				for (const f of options) if (f.i.typeCheck(v)) return true;
				return false;
			},
			transform(data: O, ctx: Context): Result<O> {
				const newCtx = ctx.clone();
				for (const s in options) {
					const decoded = options[s]!.decode(data, newCtx);
					if (decoded.success) return decoded;
				}

				Object.assign(ctx.errors, newCtx.errors);
				return { success: false, errors: ctx.errors };
			},
		},
		{
			name,
			typeCheck(v: any): v is O {
				for (const f of options) if (f.o.typeCheck(v)) return true;
				return false;
			},
		},
	) as ReturnType<typeof union<T>>;
	res.options = options;
	return res;
}

type ObjectOutput<
	T extends globalThis.Record<string, Pipe<any, any>>,
	RT,
> = RT extends Record<any, any>
	? { [K in keyof T]: Output<T[K]> } & Output<RT>
	: { [K in keyof T]: Output<T[K]> };
type Mask<Keys extends keyof any> = { [K in Keys]?: true };
export type Identity<T> = T;
export type Flatten<T> = Identity<{
	[k in keyof T]: T[k];
}>;

export interface Object<
	Shape extends globalThis.Record<any, Pipe<any, any>>,
	RShape extends Record<any, any> | undefined = undefined,
	I = object,
> extends Pipe<I, ObjectOutput<Shape, RShape>> {
	shape: Shape;
	recordShape?: RShape;

	pick<M extends Mask<keyof Shape>>(
		mask: M,
	): Object<Flatten<Pick<Shape, Extract<keyof Shape, keyof M>>>, RShape, I>;
	omit<M extends Mask<keyof Shape>>(
		mask: M,
	): Object<Flatten<Omit<Shape, Extract<keyof Shape, keyof M>>>, RShape, I>;
	partial<M extends Mask<keyof Shape>>(
		mask: M,
	): Object<
		{
			[k in keyof Shape]: k extends keyof M
				? Pipe<Input<Shape[k]>, Output<Shape[k]> | undefined>
				: Shape[k];
		},
		RShape,
		I
	>;
	record<K extends keyof any, V>(
		k: Pipe<any, K>,
		v: Pipe<any, V>,
	): Object<Shape, Record<K, V>, I>;
}
export function object<
	Shape extends globalThis.Record<any, Pipe<any, any>>,
	RecordShape extends Record<any, any> | undefined = undefined,
>(shape: Shape, recordShape?: RecordShape): Object<Shape, RecordShape> {
	const res = pipe<object, ObjectOutput<Shape, RecordShape>>(
		{
			name: "object",
			typeCheck: (v): v is object =>
				Object.prototype.toString.call(v) == "[object Object]",
			transform(
				data: object,
				ctx: Context,
			): Result<ObjectOutput<Shape, RecordShape>> {
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
				return { success, output: output as ObjectOutput<Shape, RecordShape> };
			},
		},
		{
			name: `{${Object.entries(shape)
				.map(([k, v]) => `${k}: ${v.o.name}`)
				.join(",")}}`,
			typeCheck: (v): v is ObjectOutput<Shape, RecordShape> => {
				if (Object.prototype.toString.call(v) != "[object Object]")
					return false;
				for (const s in shape) if (!shape[s]!.o.typeCheck(v[s])) return false;
				return true;
			},
		},
	) as unknown as ReturnType<typeof object>;
	res.shape = shape;
	res.recordShape = recordShape;

	res.pick = <M extends Mask<keyof Shape>>(mask: M) => {
		const next = res.clone();
		for (const k in next.shape) {
			if (!mask[k]) delete next.shape[k];
		}
		return next as any;
	};
	res.omit = <M extends Mask<keyof Shape>>(mask: M) => {
		const next = res.clone();
		for (const k in next.shape) {
			if (mask[k]) delete next.shape[k];
		}
		return next as any;
	};
	res.partial = <M extends Mask<keyof Shape>>(mask: M) => {
		const next = res.clone();
		for (const k in next.shape) {
			if (mask[k]) {
				// @ts-ignore
				next.shape[k] = union([next.shape[k], p.undefined()]);
			}
		}
		return next as any;
	};
	res.record = <K extends keyof any, V>(k: Pipe<any, K>, v: Pipe<any, V>) => {
		return object<Shape, Record<K, V>>(shape, record(k, v)) as any;
	};
	return res as any;
}
