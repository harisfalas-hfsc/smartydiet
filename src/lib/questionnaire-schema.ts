export type Units = "metric" | "imperial";
export type Gender = "male" | "female" | "other";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Goal = "weight_loss" | "maintenance" | "muscle_gain" | "recomposition";
export type DietStyle =
  | "balanced"
  | "mediterranean"
  | "keto"
  | "carnivore"
  | "vegetarian"
  | "vegan"
  | "low_carb"
  | "high_protein"
  | "other";
export type Budget = "low" | "medium" | "high";
export type Sleep = "poor" | "average" | "good";
export type CookingSkill = "beginner" | "intermediate" | "advanced";

export interface QuestionnaireData {
  basics: {
    age?: number;
    gender?: Gender;
    height?: number;
    weight?: number;
    units: Units;
    country?: string;
  };
  body: {
    bmr?: number | "auto";
    bmi?: number | "auto";
    bodyFat?: number;
    muscleMass?: number;
    inbodyNotes?: string;
  };
  activity: {
    trains: boolean;
    trainingType?: string;
    trainingFrequency?: number;
    trainingDurationMin?: number;
    trainingIntensity?: "low" | "medium" | "high";
    activityLevel: ActivityLevel;
    stepsPerDay?: number;
    tdee?: number | "auto";
    sleep: Sleep;
  };
  goal: {
    goal: Goal;
    targetWeight?: number;
    timelineWeeks?: number;
  };
  eating: {
    dietStyle: DietStyle;
    dietStyleOther?: string;
    mealsPerDay: number;
    preferredMealTimes?: string;
    foodsLike?: string;
    foodsDislike?: string;
    allergies: string; // required
    culturalRestrictions?: string;
    alcohol?: string;
    caffeine?: string;
    waterLitersPerDay?: number;
  };
  constraints: {
    cookingSkill: CookingSkill;
    cookingMinutesPerDay?: number;
    budget: Budget;
    equipment?: string[];
    eatingOutFrequency?: string;
  };
  health: {
    conditions?: string;
    medications?: string;
    pregnancyBreastfeeding?: "none" | "pregnant" | "breastfeeding";
    disclaimerAcknowledged: boolean;
  };
  notes: string;
}

export const DEFAULT_QUESTIONNAIRE: QuestionnaireData = {
  basics: { units: "metric" },
  body: {},
  activity: { trains: false, activityLevel: "moderate", sleep: "average" },
  goal: { goal: "maintenance" },
  eating: { dietStyle: "balanced", mealsPerDay: 3, allergies: "" },
  constraints: { cookingSkill: "intermediate", budget: "medium" },
  health: { disclaimerAcknowledged: false },
  notes: "",
};

export const STEP_LABELS = [
  "Basics",
  "Body",
  "Activity",
  "Goal",
  "Eating",
  "Constraints",
  "Health",
  "Notes",
];
