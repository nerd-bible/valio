import * as z from "./index";
import { readFileSync } from "node:fs";

export const rowNumber = z.number().min(0);
export const intId = z.codecNumber().min(0);
export const rowId = z.union([
	// Normal integer like 1, 2
	intId,
	// Multiword token like 1-4 or 1.2-4.2
	z.string(), //.regex([rowNumber, "-", rowNumber]),
]);

export const boolean = z.codecBoolean({
	true: ["yes", "true"],
	false: ["no", "false"],
});
export const primitive = z.union([z.string(), boolean, z.codecNumber()]);

export function recordConllu(delims = { prop: "|", value: "=" }) {
	return z.codec(
		z.string(),
		(v: string, ctx: z.Context) => {
			if (v == null || v === "_") return {};

			const output = v.split(delims.prop).reduce(
				(acc, cur) => {
					const [k, v] = cur.split(delims.value);
					const decoded = primitive.decode(v, ctx);
					if ("output" in decoded) acc[k as string] = decoded.output;
					return acc;
				},
				{} as Record<string, z.Output<typeof primitive>>,
			);

			return { output, errors: ctx.errors };
		},
		(v: Record<string, z.Output<typeof primitive>>) => {
			const entries = Object.entries(v);
			if (!entries.length) return "_";

			return {
				output: entries
					.map(([k, v]) => `${k}${delims.value}${v}`)
					.join(delims.prop),
			};
		},
	);
}

const word = z.object({
	id: rowId,
	form: z.string(),
	lemma: z.string(),
	upos: z.string(),
	xpos: z.string(),
	feats: recordConllu(),
	head: z.codecNumber(),
	deprel: z.string(),
	deps: recordConllu({ prop: "|", value: ":" }), // .pipe(z.record(rowId, primitive)),
	misc: recordConllu(),
});
// .partial();
const columns = Object.keys(word.shape) as (keyof z.Output<typeof word>)[];

const wordConllu = z.codec(
	z.string(),
	(v: string, ctx: z.Context) => {
		const split = v
			.split("\t")
			.map((v) => (v == "_" || v == "" ? undefined : v));

		const res = {} as any;
		for (let i = 0; i < columns.length; i++)
			res[columns[i] as (typeof columns)[number]] = split[i];

		const out = word.decode(res, ctx);
		console.log({ split, res });
		return out;
	},
	(v) => ({
		output: columns
			.map((c) => v[c])
			.map((v) => (v == undefined ? "_" : v))
			.join("\t"),
	}),
);

const sentence = z.object({
	headers: z.record(z.string(), z.union([z.string(), z.undefined()])),
	// .object({
	// 	sent_id: z.string().nonempty(),
	// 	text: z.string().nonempty(),
	// })
	// .catchall(z.union([z.string(), z.undefined()])),
	words: z.array(wordConllu),
});

const sentenceConllu = z.codec(z.string(),
	(str: string, ctx) => {
		const lines = str.split(/\r?\n/);
		const res = {
			headers: {} as any,
			words: [],
		} as z.Output<typeof sentence>;
		let parsingHeaders = true;
		const headerPrefix = "# ";

		for (const line of lines) {
			if (parsingHeaders && line.startsWith(headerPrefix)) {
				const [k, v] = line.substring(headerPrefix.length).split("=");
				res.headers[k.trim()] = v?.trim();
			} else {
				parsingHeaders = false;
				console.log({ line })
				const decoded = wordConllu.decode(line, ctx);
				if ("output" in decoded) res.words.push(decoded.output);
			}
		}

		return { output: res, errors: ctx.errors };
	},
	(s) => {
		let res = "";
		for (const k in s.headers) {
			const v = s.headers[k];

			res += `# ${k.trim()}`;
			if (v) res += ` = ${v.trim()}`;
			res += "\n";
		}

		res += s.words.join("\n");

		return { output: res };
	}
);

// Makes sure syntax is followed and required fields are included.
export const normal = z.codec(z.string(),
	(str: string, ctx) => {
		const output = [];
		for (const sentence of str.trimEnd().split(/\r?\n\r?\n/g)) {
			const decoded = sentenceConllu.decode(sentence, ctx);
			if ("output" in decoded) output.push(decoded.output);
		}
		return { output, errors: ctx.errors };
	},
	(sentences) => ({ output: sentences.join("\n\n") }),
);

console.log(rowId.decode("15"))

// const text = readFileSync("./test/bsb.conllu", "utf8");
// const parsed = normal.decode(text);
// console.log(parsed);
// // console.log(normal.encode(parsed.data!).data);
