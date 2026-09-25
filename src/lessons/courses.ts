import type { CourseContent } from "./courseTypes";
import { barbuCourses } from "./barbu/courses";
import { heartsCourses } from "./hearts/courses";
import { spadesCourses } from "./spades/courses";
import { whistCourses } from "./whist/courses";
import { bridgeCourses } from "./bridge/courses";
import { ginCourses } from "./gin-rummy/courses";

export const courseCatalog: CourseContent[] = [...barbuCourses, ...heartsCourses, ...spadesCourses, ...whistCourses, ...bridgeCourses, ...ginCourses];

export function courseTargetsGuidedLesson(course: CourseContent, lessonId: string) {
  return course.practiceTarget.kind === "guided-lesson" && course.practiceTarget.lessonId === lessonId;
}
