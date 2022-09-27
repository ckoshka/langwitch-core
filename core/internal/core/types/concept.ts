import { Memory } from "./memory.ts";

export interface ConceptData {
	name: string;
	timesSeen: number;
	firstSeen: number;
}

export type Concept = Memory & ConceptData;
