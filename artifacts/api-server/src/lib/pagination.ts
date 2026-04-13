import type { Request } from "express";

export interface PaginationParams {
  offset: number;
  limit: number;
  page: number;
}

export function parsePagination(req: Request, defaultLimit = 100, maxLimit = 10000): PaginationParams {
  // Bumped to 10 000 so the Operations Hub, Analytics, WIP and Defects pages
  // can pull the full dataset in a single round-trip instead of hitting the
  // old 200-row ceiling which made the site appear empty when the seeded
  // dataset grew past that threshold.
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(req.query.limit as string) || defaultLimit));
  const offset = (page - 1) * limit;
  return { offset, limit, page };
}

export function paginatedResponse<T>(data: T[], total: number, params: PaginationParams) {
  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.ceil(total / params.limit),
      hasMore: params.offset + data.length < total,
    },
  };
}
