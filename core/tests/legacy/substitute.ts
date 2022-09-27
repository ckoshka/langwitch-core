import {
	Free,
	LoggerEffect,
	use,
	UserInputEffect,
} from "../resource/types/free.ts";

export type AskEffect = {
	askQ: (q: string) => string | Promise<string>;
};
export const implAsk = use<LoggerEffect & UserInputEffect<string>>()
	.extendF((f) =>
		({
			askQ: async (q) => {
				await f.log(q);
				return f.ask();
			},
		}) as AskEffect
	);

const askFavColor = use<AskEffect>()
	.map2((f) => f.askQ("What's your favourite color?"));

implAsk.chain(() => askFavColor).run({
	ask: () => prompt() || "",
	log: console.log,
});
