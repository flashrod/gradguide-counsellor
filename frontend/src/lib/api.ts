import type {
  ApiRecommendationsResponse,
  ApiStudentResponse,
} from "./api-types";

/**
 * Backend API client (Milestone 6). Thin typed fetch wrappers only —
 * the frontend never computes scores, eligibility, or rankings.
 */

const BACKEND_URL =
  process.env["BACKEND_API_URL"] ?? "http://localhost:4000";

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
    response = await fetch(`${BACKEND_URL}${path}`, { cache: "no-store" });
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
