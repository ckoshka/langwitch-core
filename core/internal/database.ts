import { Concept } from "./core/concept.ts";

export type Database = {
	concepts: Record<string, Concept>;
};
