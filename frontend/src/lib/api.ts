import type {
  ApiCourseDetailsResponse,
  ApiNextQuestionResponse,
  ApiRecommendationsResponse,
  ApiSimulationOverrides,
  ApiSimulationResponse,
  ApiStudentResponse,
} from "./api-types";

/**
 * Backend API client (Milestone 6). Thin typed fetch wrappers only —
 * the frontend never computes scores, eligibility, or rankings.
 */

const SERVER_BACKEND_URL =
  process.env["BACKEND_API_URL"] ?? "http://localhost:4000";

/** Server uses BACKEND_API_URL; the browser bundle uses NEXT_PUBLIC_API_URL. */
export function backendBaseUrl(): string {
  if (typeof window !== "undefined") {
    return process.env["NEXT_PUBLIC_API_URL"] ?? SERVER_BACKEND_URL;
  }
  return SERVER_BACKEND_URL;
}

/** Seeded demo student used by the workspace until student selection lands. */
export const DEMO_STUDENT_ID =
  process.env["WORKSPACE_STUDENT_ID"] ??
  "66666666-6666-4366-8366-666666666666";

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function getJson<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${backendBaseUrl()}${path}`, { cache: "no-store" });
  } catch {
    throw new ApiError(0, "Recommendation service is unreachable.");
  }
  if (!response.ok) {
    if (response.status === 404) {
      throw new ApiError(404, "Student not found.");
    }
    throw new ApiError(response.status, "Recommendation service returned an error.");
  }
  const data: unknown = await response.json();
  if (data == null || typeof data !== "object") {
    throw new ApiError(502, "Recommendation service returned a malformed response.");
  }
  return data as T;
}

function assertRecommendations(
  data: ApiRecommendationsResponse
): asserts data is ApiRecommendationsResponse {
  if (!Array.isArray(data.recommendations)) {
    throw new ApiError(502, "Recommendation service returned a malformed response.");
  }
}

export async function getStudent(studentId: string): Promise<ApiStudentResponse> {
  const data = await getJson<ApiStudentResponse>(`/api/students/${studentId}`);
  if (data.student == null || typeof data.student !== "object") {
    throw new ApiError(502, "Recommendation service returned a malformed response.");
  }
  return data;
}

export async function getRecommendations(
  studentId: string
): Promise<ApiRecommendationsResponse> {
  const data = await getJson<ApiRecommendationsResponse>(
    `/api/students/${studentId}/recommendations`
  );
  assertRecommendations(data);
  return data;
}

export async function getNextQuestion(
  studentId: string
): Promise<ApiNextQuestionResponse> {
  const data = await getJson<ApiNextQuestionResponse>(
    `/api/students/${studentId}/next-question`
  );
  if ("status" in data && data.status === "complete") return data;
  if (
    "field" in data &&
    typeof data.field === "string" &&
    typeof data.question === "string" &&
    typeof data.reason === "string"
  ) {
    return data;
  }
  throw new ApiError(502, "Recommendation service returned a malformed response.");
}

export async function simulateRecommendations(  studentId: string,
  overrides: ApiSimulationOverrides
): Promise<ApiSimulationResponse> {
  let response: Response;
  try {
    response = await fetch(
      `${backendBaseUrl()}/api/students/${studentId}/recommendations/simulate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrides }),
      }
    );
  } catch {
    throw new ApiError(0, "Recommendation service is unreachable.");
  }
  if (response.status === 404) {
    throw new ApiError(404, "Student not found.");
  }
  if (response.status === 400) {
    throw new ApiError(400, "Some scenario values are invalid. Check them and try again.");
  }
  if (!response.ok) {
    throw new ApiError(response.status, "Scenario simulation failed.");
  }
  const data: unknown = await response.json();
  if (data == null || typeof data !== "object" || !("changes" in data)) {
    throw new ApiError(502, "Recommendation service returned a malformed response.");
  }
  return data as ApiSimulationResponse;
}

export async function getCourseDetails(
  courseId: string
): Promise<ApiCourseDetailsResponse> {
  const data = await getJson<ApiCourseDetailsResponse>(
    `/api/courses/${courseId}`
  );
  if (data.course == null || typeof data.course !== "object") {
    throw new ApiError(502, "Recommendation service returned a malformed response.");
  }
  return data;
}
