export type PracticeLevel =
  | 'Beginner'
  | 'Intermediate'
  | 'Advanced';

export type PracticeStage = {
  slug: string;

  title: string;

  description: string;

  level: PracticeLevel;

  order: number;

  problemSlugs: string[];
};

export type TechnologyPracticePath = {
  technologySlug: string;

  name: string;

  shortName: string;

  description: string;

  stages: PracticeStage[];
};