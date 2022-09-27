import { Concept } from "../core/types/concept.ts";

export type Database = {
	concepts: Record<string, Concept>;
};
