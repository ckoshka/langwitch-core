import { MarkedResult } from "./core/context.ts";

export type Feedback = {
	result?: MarkedResult;
	userAnswer: string;
	known?: boolean; // should be a list of strings
	terminate?: boolean;
	// should also include hinting?
};
