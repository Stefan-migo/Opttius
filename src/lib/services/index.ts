/**
 * Services Index
 * Centralized exports for all business logic services
 */

// Products Service
export { ProductsService } from "./products/service";
export type {
  ProductRow,
  ProductInsert,
  ProductUpdate,
  ProductWithRelations,
  ProductListParams,
  ProductListResponse,
  ProductStockInfo,
  ProductServiceContext
} from "./products/types";

// Add other services as they're created
// export { UsersService } from "./users/service";
// export { OrdersService } from "./orders/service";
// etc.