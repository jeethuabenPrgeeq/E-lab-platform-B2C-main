export const CATEGORIES = ['language', 'framework', 'database', 'devops', 'tool'] as const;
export type Category = (typeof CATEGORIES)[number];

export const STATUSES = ['active', 'draft', 'disabled'] as const;
export type TechStatus = (typeof STATUSES)[number];

export interface TechnologyInput {
  name: string;
  slug: string;
  category: Category;
  runtimeImage: string;
  version: string;
  fileExtension: string;
  description: string;
  status: TechStatus;
}

export interface Technology extends TechnologyInput {
  id: string;
  problemCount: number;
  updatedAt: string;
}