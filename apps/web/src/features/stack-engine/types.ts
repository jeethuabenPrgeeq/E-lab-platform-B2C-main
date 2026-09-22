export type StackDomain = {
  slug: string;
  name: string;
  description: string;
  pathDescription: string;
};

export type StackDefinition = {
  slug: string;
  domainSlug: string;

  name: string;
  shortName: string;

  description: string;

  technologies: string[];

  level:
    | 'Beginner'
    | 'Intermediate'
    | 'Advanced'
    | 'Beginner to Advanced'
    | 'Intermediate to Advanced';
};

export type StackModule = {
  slug: string;

  name: string;

  phase: string;

  description: string;

  /**
   * Connects this module to Start Practicing.
   *
   * Example:
   * MERN React -> react
   * MEAN Angular -> angular
   * Django Python -> python
   */
  technologySlug?: string;

  topics: string[];
};

export type StackRoadmap = {
  stackSlug: string;

  modules: StackModule[];
};