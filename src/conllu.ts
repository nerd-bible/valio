import * as z from "./index";
import { readFileSync } from "node:fs";

export const rowNumber = z.number().min(0);
export const intId = z.codecs.number().min(0);
export const rowId = z.union([
	// Normal integer like 1, 2
	intId,
	// Multiword token like 1-4 or 1.2-4.2
	z.string(), //.regex([rowNumber, "-", rowNumber]),
]);

export const boolean = z.codecs.boolean({
	true: ["yes", "true"],
	false: ["no", "false"],
});
export const primitive = z.union([z.string(), boolean, z.codecs.number()]);

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
	feats: z.string(), // recordConllu(),
	head: z.codecs.number(),
	deprel: z.string(),
	deps: z.string(), //recordConllu({ prop: "|", value: ":" }), // .pipe(z.record(rowId, primitive)),
	misc: z.string(), //recordConllu(),
});
// .partial();
const columns = Object.keys(word.shape) as (keyof z.Output<typeof word>)[];

const wordConllu = z.codec(
	z.string(),
	(v: string, ctx: z.Context) => {
		const split = v
			.split("\t")
			// spec is unclear what a missing _ means
			// the _ are there for readability in editors that don't show whitespace
			.map((v) => (v == "_" ? "" : v));

		const res = {} as any;
		for (let i = 0; i < columns.length; i++)
			res[columns[i] as (typeof columns)[number]] = split[i];

		return word.decode(res, ctx);
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
	words: z.array(word),
});

// Makes sure syntax is followed and required fields are included.
export const normal = z.codec(
	z.string(),
	(str: string, ctx) => {
		const sentences = [];

		const lines = str.split(/\r?\n/);
		let cur = {
			headers: {},
			words: [],
		} as z.Output<typeof sentence>;
		let parsingHeaders = true;
		const headerPrefix = "# ";

		ctx.jsonPath ??= [];
		const length = ctx.jsonPath.length;

		for (let i = 0; i < lines.length; i++) {
			ctx.jsonPath[length] = (i + 1).toString();
			const line = lines[i]!;

			if (parsingHeaders && line.startsWith(headerPrefix)) {
				const [k, v] = line.substring(headerPrefix.length).split("=");
				cur.headers[k.trim()] = v?.trim();
			} else if (line) {
				parsingHeaders = false;
				const decoded = wordConllu.decode(line, ctx);
				if ("output" in decoded) cur.words.push(decoded.output);
			} else if (!parsingHeaders && !line) {
				parsingHeaders = true;
				sentences.push(cur);
				cur = {
					headers: {},
					words: [],
				};
			}
		}

		return { output: sentences, errors: ctx.errors };
	},
	(sentences) => {
		// let res = "";
		// for (const k in s.headers) {
		// 	const v = s.headers[k];
		//
		// 	res += `# ${k.trim()}`;
		// 	if (v) res += ` = ${v.trim()}`;
		// 	res += "\n";
		// }
		//
		// res += s.words.join("\n");
		//
		// return { output: res };
		return { output: "" };
	},
);

console.dir(wordConllu.decode(
	"1	In	in	ADP	IN	_	3	case	_	Verse=1|SourceMap=1"
), { depth: null });

const text = readFileSync("./test/bsb.conllu", "utf8");
const parsed = normal.decode(text);
console.dir(parsed, { depth: null });
// console.log(normal.encode(parsed.data!).data);
