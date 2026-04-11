import type { Request } from "express";

export interface PaginationParams {
  offset: number;
  limit: number;
  page: number;
}

export function parsePagination(req: Request, defaultLimit = 50, maxLimit = 200): PaginationParams {
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
